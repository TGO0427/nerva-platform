import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkstationRepository, Workstation } from './repositories/workstation.repository';
import { BomRepository, BomHeader, BomLine } from './repositories/bom.repository';
import { RoutingRepository, Routing, RoutingOperation } from './repositories/routing.repository';
import { WorkOrderRepository, WorkOrder, WorkOrderOperation, WorkOrderMaterial } from './repositories/work-order.repository';
import { ProductionLedgerRepository, ProductionLedgerEntry } from './repositories/production-ledger.repository';
import { StockLedgerService } from '../inventory/stock-ledger.service';

@Injectable()
export class ManufacturingService {
  constructor(
    private readonly workstationRepo: WorkstationRepository,
    private readonly bomRepo: BomRepository,
    private readonly routingRepo: RoutingRepository,
    private readonly workOrderRepo: WorkOrderRepository,
    private readonly productionLedgerRepo: ProductionLedgerRepository,
    private readonly stockLedgerService: StockLedgerService,
  ) {}

  // ============ Workstations ============
  async listWorkstations(
    tenantId: string,
    filters: { siteId?: string; status?: string; search?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const { data, total } = await this.workstationRepo.findByTenant(tenantId, filters, limit, offset);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWorkstation(id: string): Promise<Workstation> {
    const workstation = await this.workstationRepo.findById(id);
    if (!workstation) throw new NotFoundException('Workstation not found');
    return workstation;
  }

  async createWorkstation(data: Parameters<WorkstationRepository['create']>[0]): Promise<Workstation> {
    return this.workstationRepo.create(data);
  }

  async updateWorkstation(id: string, data: Parameters<WorkstationRepository['update']>[1]): Promise<Workstation> {
    const updated = await this.workstationRepo.update(id, data);
    if (!updated) throw new NotFoundException('Workstation not found');
    return updated;
  }

  async deleteWorkstation(id: string): Promise<void> {
    const deleted = await this.workstationRepo.delete(id);
    if (!deleted) throw new NotFoundException('Workstation not found');
  }

  // ============ BOMs ============
  async listBoms(
    tenantId: string,
    filters: { itemId?: string; status?: string; search?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const { data, total } = await this.bomRepo.findHeadersByTenant(tenantId, filters, limit, offset);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBom(id: string) {
    const header = await this.bomRepo.findHeaderById(id);
    if (!header) throw new NotFoundException('BOM not found');
    const lines = await this.bomRepo.getLines(id);
    return { ...header, lines };
  }

  async createBom(
    data: {
      tenantId: string;
      itemId: string;
      baseQty?: number;
      uom?: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      notes?: string;
      createdBy: string;
      lines: Array<{
        itemId: string;
        qtyPer: number;
        uom?: string;
        scrapPct?: number;
        isCritical?: boolean;
        notes?: string;
      }>;
    },
  ) {
    const version = await this.bomRepo.getNextVersion(data.tenantId, data.itemId);
    const header = await this.bomRepo.createHeader({
      ...data,
      version,
    });

    const lines: BomLine[] = [];
    for (let i = 0; i < data.lines.length; i++) {
      const line = await this.bomRepo.addLine({
        tenantId: data.tenantId,
        bomHeaderId: header.id,
        lineNo: (i + 1) * 10,
        ...data.lines[i],
      });
      lines.push(line);
    }

    return { ...header, lines };
  }

  async updateBom(id: string, data: Parameters<BomRepository['updateHeader']>[1]) {
    const header = await this.bomRepo.findHeaderById(id);
    if (!header) throw new NotFoundException('BOM not found');
    if (header.status !== 'DRAFT') {
      throw new BadRequestException('Can only update DRAFT BOMs');
    }
    return this.bomRepo.updateHeader(id, data);
  }

  async deleteBom(id: string) {
    const header = await this.bomRepo.findHeaderById(id);
    if (!header) throw new NotFoundException('BOM not found');
    if (header.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete DRAFT BOMs');
    }
    await this.bomRepo.deleteLinesByHeader(id);
    await this.bomRepo.deleteHeader(id);
  }

  async createNewBomVersion(id: string, createdBy: string) {
    const existing = await this.getBom(id);
    if (!existing) throw new NotFoundException('BOM not found');

    const version = await this.bomRepo.getNextVersion(existing.tenantId, existing.itemId);
    const header = await this.bomRepo.createHeader({
      tenantId: existing.tenantId,
      itemId: existing.itemId,
      version,
      revision: 'A',
      baseQty: existing.baseQty,
      uom: existing.uom,
      notes: existing.notes || undefined,
      createdBy,
    });

    const lines: BomLine[] = [];
    for (const line of existing.lines) {
      const newLine = await this.bomRepo.addLine({
        tenantId: existing.tenantId,
        bomHeaderId: header.id,
        lineNo: line.lineNo,
        itemId: line.itemId,
        qtyPer: line.qtyPer,
        uom: line.uom,
        scrapPct: line.scrapPct,
        isCritical: line.isCritical,
        notes: line.notes || undefined,
      });
      lines.push(newLine);
    }

    return { ...header, lines };
  }

  async submitBomForApproval(id: string) {
    const header = await this.bomRepo.findHeaderById(id);
    if (!header) throw new NotFoundException('BOM not found');
    if (header.status !== 'DRAFT') {
      throw new BadRequestException('Can only submit DRAFT BOMs');
    }
    return this.bomRepo.updateHeader(id, { status: 'PENDING_APPROVAL' });
  }

  async approveBom(id: string, approvedBy: string) {
    const header = await this.bomRepo.findHeaderById(id);
    if (!header) throw new NotFoundException('BOM not found');
    if (header.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('BOM must be PENDING_APPROVAL to approve');
    }
    return this.bomRepo.updateHeader(id, {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
    });
  }

  async obsoleteBom(id: string) {
    const header = await this.bomRepo.findHeaderById(id);
    if (!header) throw new NotFoundException('BOM not found');
    if (header.status === 'OBSOLETE') {
      throw new BadRequestException('BOM is already obsolete');
    }
    return this.bomRepo.updateHeader(id, { status: 'OBSOLETE' });
  }

  async compareBoms(id1: string, id2: string) {
    const [bom1, bom2] = await Promise.all([
      this.getBom(id1),
      this.getBom(id2),
    ]);

    const leftLines = new Map(bom1.lines.map(l => [l.itemId, l]));
    const rightLines = new Map(bom2.lines.map(l => [l.itemId, l]));

    const added: BomLine[] = [];
    const removed: BomLine[] = [];
    const changed: Array<{ left: BomLine; right: BomLine; changedFields: string[] }> = [];

    // Find removed and changed
    for (const [itemId, leftLine] of leftLines) {
      const rightLine = rightLines.get(itemId);
      if (!rightLine) {
        removed.push(leftLine);
      } else {
        const changedFields: string[] = [];
        if (leftLine.qtyPer !== rightLine.qtyPer) changedFields.push('qtyPer');
        if (leftLine.scrapPct !== rightLine.scrapPct) changedFields.push('scrapPct');
        if (leftLine.isCritical !== rightLine.isCritical) changedFields.push('isCritical');
        if (leftLine.uom !== rightLine.uom) changedFields.push('uom');

        if (changedFields.length > 0) {
          changed.push({ left: leftLine, right: rightLine, changedFields });
        }
      }
    }

    // Find added
    for (const [itemId, rightLine] of rightLines) {
      if (!leftLines.has(itemId)) {
        added.push(rightLine);
      }
    }

    return {
      left: bom1,
      right: bom2,
      differences: { added, removed, changed },
    };
  }

  // BOM Lines
  async addBomLine(bomHeaderId: string, data: Omit<Parameters<BomRepository['addLine']>[0], 'tenantId' | 'bomHeaderId' | 'lineNo'>) {
    const header = await this.bomRepo.findHeaderById(bomHeaderId);
    if (!header) throw new NotFoundException('BOM not found');
    if (header.status !== 'DRAFT') {
      throw new BadRequestException('Can only add lines to DRAFT BOMs');
    }

    const lines = await this.bomRepo.getLines(bomHeaderId);
    const maxLineNo = lines.reduce((max, l) => Math.max(max, l.lineNo), 0);

    return this.bomRepo.addLine({
      tenantId: header.tenantId,
      bomHeaderId,
      lineNo: maxLineNo + 10,
      ...data,
    });
  }

  async updateBomLine(lineId: string, data: Parameters<BomRepository['updateLine']>[1]) {
    const updated = await this.bomRepo.updateLine(lineId, data);
    if (!updated) throw new NotFoundException('BOM line not found');
    return updated;
  }

  async deleteBomLine(lineId: string) {
    const deleted = await this.bomRepo.deleteLine(lineId);
    if (!deleted) throw new NotFoundException('BOM line not found');
  }

  // ============ Routings ============
  async listRoutings(
    tenantId: string,
    filters: { itemId?: string; status?: string; search?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const { data, total } = await this.routingRepo.findByTenant(tenantId, filters, limit, offset);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRouting(id: string) {
    const routing = await this.routingRepo.findById(id);
    if (!routing) throw new NotFoundException('Routing not found');
    const operations = await this.routingRepo.getOperations(id);
    return { ...routing, operations };
  }

  async createRouting(
    data: {
      tenantId: string;
      itemId: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      notes?: string;
      createdBy: string;
      operations: Array<{
        name: string;
        description?: string;
        workstationId?: string;
        setupTimeMins?: number;
        runTimeMins: number;
        queueTimeMins?: number;
        overlapPct?: number;
        isSubcontracted?: boolean;
        instructions?: string;
      }>;
    },
  ) {
    const version = await this.routingRepo.getNextVersion(data.tenantId, data.itemId);
    const routing = await this.routingRepo.create({
      ...data,
      version,
    });

    const operations: RoutingOperation[] = [];
    for (let i = 0; i < data.operations.length; i++) {
      const op = await this.routingRepo.addOperation({
        tenantId: data.tenantId,
        routingId: routing.id,
        operationNo: (i + 1) * 10,
        ...data.operations[i],
      });
      operations.push(op);
    }

    return { ...routing, operations };
  }

  async updateRouting(id: string, data: Parameters<RoutingRepository['update']>[1]) {
    const routing = await this.routingRepo.findById(id);
    if (!routing) throw new NotFoundException('Routing not found');
    if (routing.status !== 'DRAFT') {
      throw new BadRequestException('Can only update DRAFT routings');
    }
    return this.routingRepo.update(id, data);
  }

  async deleteRouting(id: string) {
    const routing = await this.routingRepo.findById(id);
    if (!routing) throw new NotFoundException('Routing not found');
    if (routing.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete DRAFT routings');
    }
    await this.routingRepo.deleteOperationsByRouting(id);
    await this.routingRepo.delete(id);
  }

  async approveRouting(id: string, approvedBy: string) {
    const routing = await this.routingRepo.findById(id);
    if (!routing) throw new NotFoundException('Routing not found');
    if (routing.status !== 'DRAFT') {
      throw new BadRequestException('Can only approve DRAFT routings');
    }
    return this.routingRepo.update(id, {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
    });
  }

  async obsoleteRouting(id: string) {
    const routing = await this.routingRepo.findById(id);
    if (!routing) throw new NotFoundException('Routing not found');
    if (routing.status === 'OBSOLETE') {
      throw new BadRequestException('Routing is already obsolete');
    }
    return this.routingRepo.update(id, { status: 'OBSOLETE' });
  }

  // ============ Work Orders ============
  async listWorkOrders(
    tenantId: string,
    filters: { status?: string; itemId?: string; warehouseId?: string; search?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const { data, total } = await this.workOrderRepo.findByTenant(tenantId, filters, limit, offset);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWorkOrder(id: string) {
    const workOrder = await this.workOrderRepo.findById(id);
    if (!workOrder) throw new NotFoundException('Work order not found');
    const [operations, materials] = await Promise.all([
      this.workOrderRepo.getOperations(id),
      this.workOrderRepo.getMaterials(id),
    ]);
    return { ...workOrder, operations, materials };
  }

  async getNextWorkOrderNumber(tenantId: string): Promise<string> {
    return this.workOrderRepo.generateWorkOrderNo(tenantId);
  }

  async createWorkOrder(
    data: {
      tenantId: string;
      siteId: string;
      warehouseId: string;
      workOrderNo?: string;
      itemId: string;
      bomHeaderId?: string;
      routingId?: string;
      priority?: number;
      qtyOrdered: number;
      plannedStart?: Date;
      plannedEnd?: Date;
      salesOrderId?: string;
      notes?: string;
      createdBy: string;
    },
  ) {
    const workOrderNo = data.workOrderNo || await this.workOrderRepo.generateWorkOrderNo(data.tenantId);

    const workOrder = await this.workOrderRepo.create({
      ...data,
      workOrderNo,
    });

    // If BOM is specified, copy materials
    if (data.bomHeaderId) {
      const bomLines = await this.bomRepo.getLines(data.bomHeaderId);
      const bom = await this.bomRepo.findHeaderById(data.bomHeaderId);

      for (const line of bomLines) {
        const qtyRequired = (line.qtyPer / (bom?.baseQty || 1)) * data.qtyOrdered * (1 + line.scrapPct / 100);
        await this.workOrderRepo.addMaterial({
          tenantId: data.tenantId,
          workOrderId: workOrder.id,
          bomLineId: line.id,
          itemId: line.itemId,
          qtyRequired,
        });
      }
    }

    // If routing is specified, copy operations
    if (data.routingId) {
      const routingOps = await this.routingRepo.getOperations(data.routingId);
      for (const op of routingOps) {
        await this.workOrderRepo.addOperation({
          tenantId: data.tenantId,
          workOrderId: workOrder.id,
          routingOperationId: op.id,
          operationNo: op.operationNo,
          name: op.name,
          workstationId: op.workstationId || undefined,
        });
      }
    }

    return this.getWorkOrder(workOrder.id);
  }

  async updateWorkOrder(id: string, data: Parameters<WorkOrderRepository['update']>[1]) {
    const workOrder = await this.workOrderRepo.findById(id);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (workOrder.status !== 'DRAFT') {
      throw new BadRequestException('Can only update DRAFT work orders');
    }
    return this.workOrderRepo.update(id, data);
  }

  async deleteWorkOrder(id: string) {
    const workOrder = await this.workOrderRepo.findById(id);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (workOrder.status !== 'DRAFT') {
      throw new BadRequestException('Can only delete DRAFT work orders');
    }
    await this.workOrderRepo.delete(id);
  }

  async releaseWorkOrder(id: string) {
    const workOrder = await this.workOrderRepo.findById(id);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (workOrder.status !== 'DRAFT') {
      throw new BadRequestException('Can only release DRAFT work orders');
    }

    // Update first operation to READY
    const operations = await this.workOrderRepo.getOperations(id);
    if (operations.length > 0) {
      await this.workOrderRepo.updateOperation(operations[0].id, { status: 'READY' });
    }

    return this.workOrderRepo.update(id, { status: 'RELEASED' });
  }

  async startWorkOrder(id: string) {
    const workOrder = await this.workOrderRepo.findById(id);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (workOrder.status !== 'RELEASED') {
      throw new BadRequestException('Can only start RELEASED work orders');
    }
    return this.workOrderRepo.update(id, {
      status: 'IN_PROGRESS',
      actualStart: new Date(),
    });
  }

  async completeWorkOrder(id: string) {
    const workOrder = await this.workOrderRepo.findById(id);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (workOrder.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Can only complete IN_PROGRESS work orders');
    }
    return this.workOrderRepo.update(id, {
      status: 'COMPLETED',
      actualEnd: new Date(),
    });
  }

  async cancelWorkOrder(id: string) {
    const workOrder = await this.workOrderRepo.findById(id);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (['COMPLETED', 'CANCELLED'].includes(workOrder.status)) {
      throw new BadRequestException('Cannot cancel COMPLETED or CANCELLED work orders');
    }
    return this.workOrderRepo.update(id, { status: 'CANCELLED' });
  }

  // Work Order Operations
  async startOperation(operationId: string) {
    const op = await this.workOrderRepo.findOperationById(operationId);
    if (!op) throw new NotFoundException('Operation not found');
    if (!['PENDING', 'READY'].includes(op.status)) {
      throw new BadRequestException('Operation must be PENDING or READY to start');
    }
    return this.workOrderRepo.updateOperation(operationId, {
      status: 'IN_PROGRESS',
      actualStart: new Date(),
    });
  }

  async completeOperation(
    operationId: string,
    data: { qtyCompleted: number; qtyScrapped?: number; setupTimeActual?: number; runTimeActual?: number; notes?: string },
  ) {
    const op = await this.workOrderRepo.findOperationById(operationId);
    if (!op) throw new NotFoundException('Operation not found');
    if (op.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Operation must be IN_PROGRESS to complete');
    }

    await this.workOrderRepo.updateOperation(operationId, {
      status: 'COMPLETED',
      actualEnd: new Date(),
      ...data,
    });

    // Make next operation READY
    const ops = await this.workOrderRepo.getOperations(op.workOrderId);
    const currentIdx = ops.findIndex(o => o.id === operationId);
    if (currentIdx >= 0 && currentIdx < ops.length - 1) {
      await this.workOrderRepo.updateOperation(ops[currentIdx + 1].id, { status: 'READY' });
    }

    return this.workOrderRepo.findOperationById(operationId);
  }

  // Material Issue/Return
  async issueMaterial(
    workOrderId: string,
    data: {
      materialId: string;
      qty: number;
      binId: string;
      batchNo?: string;
      operatorId?: string;
      createdBy: string;
    },
  ) {
    const workOrder = await this.workOrderRepo.findById(workOrderId);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (!['RELEASED', 'IN_PROGRESS'].includes(workOrder.status)) {
      throw new BadRequestException('Work order must be RELEASED or IN_PROGRESS to issue material');
    }

    const material = await this.workOrderRepo.findMaterialById(data.materialId);
    if (!material) throw new NotFoundException('Material not found');

    // Create production ledger entry
    await this.productionLedgerRepo.create({
      tenantId: workOrder.tenantId,
      workOrderId,
      entryType: 'MATERIAL_ISSUE',
      itemId: material.itemId,
      warehouseId: workOrder.warehouseId,
      binId: data.binId,
      batchNo: data.batchNo,
      qty: -data.qty, // Negative for issues
      uom: 'EA',
      operatorId: data.operatorId,
      createdBy: data.createdBy,
    });

    // Create stock ledger entry (reduces stock)
    await this.stockLedgerService.recordMovement({
      tenantId: workOrder.tenantId,
      siteId: workOrder.siteId,
      itemId: material.itemId,
      fromBinId: data.binId,
      qty: -data.qty,
      reason: 'WO_CONSUME',
      refType: 'work_order',
      refId: workOrderId,
      batchNo: data.batchNo,
      createdBy: data.createdBy,
    });

    // Update material qty issued
    const newQtyIssued = material.qtyIssued + data.qty;
    const newStatus = newQtyIssued >= material.qtyRequired ? 'ISSUED' : 'PARTIAL';
    await this.workOrderRepo.updateMaterial(data.materialId, {
      qtyIssued: newQtyIssued,
      status: newStatus,
    });

    return this.workOrderRepo.findMaterialById(data.materialId);
  }

  async returnMaterial(
    workOrderId: string,
    data: {
      materialId: string;
      qty: number;
      binId: string;
      batchNo?: string;
      operatorId?: string;
      reasonCode?: string;
      createdBy: string;
    },
  ) {
    const workOrder = await this.workOrderRepo.findById(workOrderId);
    if (!workOrder) throw new NotFoundException('Work order not found');

    const material = await this.workOrderRepo.findMaterialById(data.materialId);
    if (!material) throw new NotFoundException('Material not found');

    // Create production ledger entry
    await this.productionLedgerRepo.create({
      tenantId: workOrder.tenantId,
      workOrderId,
      entryType: 'MATERIAL_RETURN',
      itemId: material.itemId,
      warehouseId: workOrder.warehouseId,
      binId: data.binId,
      batchNo: data.batchNo,
      qty: data.qty, // Positive for returns
      uom: 'EA',
      operatorId: data.operatorId,
      reasonCode: data.reasonCode,
      createdBy: data.createdBy,
    });

    // Create stock ledger entry (increases stock)
    await this.stockLedgerService.recordMovement({
      tenantId: workOrder.tenantId,
      siteId: workOrder.siteId,
      itemId: material.itemId,
      toBinId: data.binId,
      qty: data.qty,
      reason: 'WO_PRODUCE', // Using WO_PRODUCE for material returns
      refType: 'work_order',
      refId: workOrderId,
      batchNo: data.batchNo,
      createdBy: data.createdBy,
    });

    // Update material qty returned
    await this.workOrderRepo.updateMaterial(data.materialId, {
      qtyReturned: material.qtyReturned + data.qty,
    });

    return this.workOrderRepo.findMaterialById(data.materialId);
  }

  // Production Output
  async recordOutput(
    workOrderId: string,
    data: {
      qty: number;
      binId: string;
      batchNo?: string;
      operationId?: string;
      workstationId?: string;
      operatorId?: string;
      notes?: string;
      createdBy: string;
    },
  ) {
    const workOrder = await this.workOrderRepo.findById(workOrderId);
    if (!workOrder) throw new NotFoundException('Work order not found');
    if (workOrder.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Work order must be IN_PROGRESS to record output');
    }

    // Create production ledger entry
    await this.productionLedgerRepo.create({
      tenantId: workOrder.tenantId,
      workOrderId,
      workOrderOperationId: data.operationId,
      entryType: 'PRODUCTION_OUTPUT',
      itemId: workOrder.itemId,
      warehouseId: workOrder.warehouseId,
      binId: data.binId,
      batchNo: data.batchNo,
      qty: data.qty,
      uom: 'EA',
      workstationId: data.workstationId,
      operatorId: data.operatorId,
      notes: data.notes,
      createdBy: data.createdBy,
    });

    // Create stock ledger entry (increases stock)
    await this.stockLedgerService.recordMovement({
      tenantId: workOrder.tenantId,
      siteId: workOrder.siteId,
      itemId: workOrder.itemId,
      toBinId: data.binId,
      qty: data.qty,
      reason: 'WO_PRODUCE',
      refType: 'work_order',
      refId: workOrderId,
      batchNo: data.batchNo,
      createdBy: data.createdBy,
    });

    // Update work order qty completed
    await this.workOrderRepo.update(workOrderId, {
      qtyCompleted: workOrder.qtyCompleted + data.qty,
    });

    return this.getWorkOrder(workOrderId);
  }

  async recordScrap(
    workOrderId: string,
    data: {
      itemId: string;
      qty: number;
      binId?: string;
      batchNo?: string;
      operationId?: string;
      reasonCode?: string;
      notes?: string;
      createdBy: string;
    },
  ) {
    const workOrder = await this.workOrderRepo.findById(workOrderId);
    if (!workOrder) throw new NotFoundException('Work order not found');

    // Create production ledger entry
    await this.productionLedgerRepo.create({
      tenantId: workOrder.tenantId,
      workOrderId,
      workOrderOperationId: data.operationId,
      entryType: 'SCRAP',
      itemId: data.itemId,
      warehouseId: workOrder.warehouseId,
      binId: data.binId,
      batchNo: data.batchNo,
      qty: -data.qty, // Negative for scrap
      uom: 'EA',
      reasonCode: data.reasonCode,
      notes: data.notes,
      createdBy: data.createdBy,
    });

    // Update work order qty scrapped if it's the finished item
    if (data.itemId === workOrder.itemId) {
      await this.workOrderRepo.update(workOrderId, {
        qtyScrapped: workOrder.qtyScrapped + data.qty,
      });
    }

    return this.getWorkOrder(workOrderId);
  }

  // ============ Production Ledger ============
  async getProductionLedger(
    tenantId: string,
    filters: {
      workOrderId?: string;
      itemId?: string;
      entryType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    limit = 100,
  ) {
    const offset = (page - 1) * limit;
    const { data, total } = await this.productionLedgerRepo.findByTenant(tenantId, filters, limit, offset);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductionSummaryByWorkOrder(tenantId: string) {
    return this.productionLedgerRepo.getSummaryByWorkOrder(tenantId);
  }

  async getProductionSummaryByItem(tenantId: string, startDate?: Date, endDate?: Date) {
    return this.productionLedgerRepo.getSummaryByItem(tenantId, startDate, endDate);
  }
}
