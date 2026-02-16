import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryRepository, Grn, GrnLine, Adjustment, AdjustmentLine } from './inventory.repository';
import { CycleCountRepository, CycleCount as CycleCountEntity, CycleCountLine as CycleCountLineEntity } from './cycle-count.repository';
import { PutawayRepository, PutawayTaskDetail, PutawayFilters } from './putaway.repository';
import { StockLedgerService } from './stock-ledger.service';
import { BatchRepository } from './batch.repository';
import { MasterDataService } from '../masterdata/masterdata.service';
import { buildPaginatedResult } from '../../common/utils/pagination';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly cycleCountRepo: CycleCountRepository,
    private readonly putawayRepo: PutawayRepository,
    private readonly stockLedger: StockLedgerService,
    private readonly batchRepository: BatchRepository,
    private readonly masterDataService: MasterDataService,
  ) {}

  // GRN operations
  async createGrn(data: {
    tenantId: string;
    siteId?: string;
    warehouseId: string;
    purchaseOrderId?: string;
    supplierId?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<Grn> {
    // Get siteId from warehouse if not provided
    let siteId = data.siteId;
    if (!siteId) {
      const warehouse = await this.masterDataService.getWarehouse(data.warehouseId);
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
      siteId = warehouse.siteId;
    }

    const grnNo = await this.repository.generateGrnNo(data.tenantId);
    return this.repository.createGrn({ ...data, siteId, grnNo });
  }

  async deleteGrn(id: string): Promise<void> {
    const grn = await this.repository.findGrnById(id);
    if (!grn) throw new NotFoundException('GRN not found');
    if (grn.status !== 'DRAFT') throw new BadRequestException('Only DRAFT GRNs can be deleted');
    await this.repository.deleteGrn(id);
  }

  async getGrn(id: string): Promise<Grn> {
    const grn = await this.repository.findGrnById(id);
    if (!grn) throw new NotFoundException('GRN not found');
    return grn;
  }

  async listGrns(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findGrnsByTenant(tenantId, status, limit, offset),
      this.repository.countGrnsByTenant(tenantId, status),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async receiveGrnLine(
    grnId: string,
    data: {
      tenantId: string;
      itemId: string;
      qtyReceived: number;
      batchNo?: string;
      expiryDate?: Date;
      receivingBinId: string;
      createdBy?: string;
    },
  ): Promise<GrnLine> {
    const grn = await this.getGrn(grnId);
    if (grn.status === 'COMPLETE' || grn.status === 'CANCELLED') {
      throw new BadRequestException('GRN is already complete or cancelled');
    }

    // Create or find batch record if batch info provided
    let batchId: string | undefined;
    if (data.batchNo && data.expiryDate) {
      const batch = await this.batchRepository.findOrCreateBatch({
        tenantId: data.tenantId,
        itemId: data.itemId,
        batchNo: data.batchNo,
        expiryDate: data.expiryDate,
        supplierId: grn.supplierId || undefined,
        grnId,
      });
      batchId = batch.id;
    }

    // Add GRN line with batch reference
    const line = await this.repository.addGrnLine({
      ...data,
      grnId,
      batchId,
    });

    // Record stock movement
    await this.stockLedger.recordMovement({
      tenantId: data.tenantId,
      siteId: grn.siteId,
      itemId: data.itemId,
      toBinId: data.receivingBinId,
      qty: data.qtyReceived,
      reason: 'RECEIVE',
      refType: 'grn',
      refId: grnId,
      batchNo: data.batchNo,
      expiryDate: data.expiryDate,
      createdBy: data.createdBy,
    });

    // Update GRN status
    if (grn.status === 'DRAFT') {
      await this.repository.updateGrnStatus(grnId, 'RECEIVED');
    }

    return line;
  }

  async getGrnLines(grnId: string): Promise<GrnLine[]> {
    return this.repository.getGrnLines(grnId);
  }

  async completeGrn(grnId: string): Promise<Grn> {
    const grn = await this.getGrn(grnId);
    if (grn.status !== 'RECEIVED' && grn.status !== 'PUTAWAY_PENDING') {
      throw new BadRequestException('GRN must be in RECEIVED or PUTAWAY_PENDING status to complete');
    }
    const updated = await this.repository.updateGrnStatus(grnId, 'COMPLETE');
    return updated!;
  }

  // Stock queries
  async getStockSnapshots(
    tenantId: string,
    options: { search?: string; warehouseId?: string; page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 50 } = options;
    const result = await this.stockLedger.getStockSnapshots(tenantId, options);
    return {
      data: result.data,
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async getStockOnHand(tenantId: string, itemId: string) {
    return this.stockLedger.getStockOnHand(tenantId, itemId);
  }

  async getStockInBin(tenantId: string, binId: string) {
    return this.stockLedger.getStockInBin(tenantId, binId);
  }

  async getLedgerHistory(tenantId: string, itemId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.stockLedger.getLedgerHistory(tenantId, itemId, limit, offset),
      this.stockLedger.countLedgerHistory(tenantId, itemId),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  // Transfer between bins
  async transferStock(data: {
    tenantId: string;
    siteId: string;
    itemId: string;
    fromBinId: string;
    toBinId: string;
    qty: number;
    batchNo?: string;
    createdBy?: string;
  }): Promise<void> {
    // Check available stock
    const available = await this.stockLedger.getTotalAvailable(data.tenantId, data.itemId);
    if (available < data.qty) {
      throw new BadRequestException('Insufficient stock available for transfer');
    }

    await this.stockLedger.recordMovement({
      tenantId: data.tenantId,
      siteId: data.siteId,
      itemId: data.itemId,
      fromBinId: data.fromBinId,
      toBinId: data.toBinId,
      qty: data.qty,
      reason: 'TRANSFER',
      batchNo: data.batchNo,
      createdBy: data.createdBy,
    });
  }

  // Adjustment operations
  async createAdjustment(data: {
    tenantId: string;
    warehouseId: string;
    reason: string;
    notes?: string;
    cycleCountId?: string;
    createdBy?: string;
  }): Promise<Adjustment> {
    const adjustmentNo = await this.repository.generateAdjustmentNo(data.tenantId);
    return this.repository.createAdjustment({ ...data, adjustmentNo });
  }

  async deleteAdjustment(id: string): Promise<void> {
    const adjustment = await this.repository.findAdjustmentById(id);
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.status !== 'DRAFT') throw new BadRequestException('Only DRAFT adjustments can be deleted');
    await this.repository.deleteAdjustment(id);
  }

  async getAdjustment(id: string): Promise<Adjustment> {
    const adjustment = await this.repository.findAdjustmentById(id);
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    return adjustment;
  }

  async listAdjustments(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findAdjustmentsByTenant(tenantId, status, limit, offset),
      this.repository.countAdjustmentsByTenant(tenantId, status),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async approveAdjustment(id: string, approvedBy: string): Promise<Adjustment> {
    const adjustment = await this.repository.approveAdjustment(id, approvedBy);
    if (!adjustment) {
      throw new BadRequestException('Adjustment not found or not in SUBMITTED status');
    }
    return adjustment;
  }

  async getAdjustmentLines(adjustmentId: string): Promise<AdjustmentLine[]> {
    return this.repository.getAdjustmentLines(adjustmentId);
  }

  async addAdjustmentLine(
    adjustmentId: string,
    data: {
      tenantId: string;
      binId: string;
      itemId: string;
      qtyAfter: number;
      batchNo?: string;
    },
  ): Promise<AdjustmentLine> {
    const adjustment = await this.getAdjustment(adjustmentId);
    if (adjustment.status !== 'DRAFT') {
      throw new BadRequestException('Can only add lines to DRAFT adjustments');
    }

    // Get current stock quantity in this bin for this item
    const stockInBin = await this.stockLedger.getStockInBin(data.tenantId, data.binId);
    const currentStock = stockInBin.find(
      (s) => s.itemId === data.itemId && (s.batchNo || null) === (data.batchNo || null),
    );
    const qtyBefore = currentStock?.qtyOnHand ?? 0;

    return this.repository.addAdjustmentLine({
      tenantId: data.tenantId,
      adjustmentId,
      binId: data.binId,
      itemId: data.itemId,
      qtyBefore,
      qtyAfter: data.qtyAfter,
      batchNo: data.batchNo,
    });
  }

  async removeAdjustmentLine(adjustmentId: string, lineId: string): Promise<void> {
    const adjustment = await this.getAdjustment(adjustmentId);
    if (adjustment.status !== 'DRAFT') {
      throw new BadRequestException('Can only remove lines from DRAFT adjustments');
    }
    await this.repository.deleteAdjustmentLine(lineId);
  }

  async submitAdjustment(id: string): Promise<Adjustment> {
    const adjustment = await this.getAdjustment(id);
    if (adjustment.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT adjustments can be submitted');
    }
    const lines = await this.repository.getAdjustmentLines(id);
    if (lines.length === 0) {
      throw new BadRequestException('Cannot submit an adjustment with no lines');
    }
    const updated = await this.repository.updateAdjustmentStatus(id, 'SUBMITTED');
    return updated!;
  }

  async postAdjustment(id: string, userId: string): Promise<Adjustment> {
    const adjustment = await this.getAdjustment(id);
    if (adjustment.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED adjustments can be posted');
    }

    const lines = await this.repository.getAdjustmentLines(id);
    const warehouse = await this.masterDataService.getWarehouse(adjustment.warehouseId);

    for (const line of lines) {
      const delta = line.qtyAfter - line.qtyBefore;
      if (delta === 0) continue;

      await this.stockLedger.recordMovement({
        tenantId: adjustment.tenantId,
        siteId: warehouse.siteId,
        itemId: line.itemId,
        fromBinId: delta < 0 ? line.binId : undefined,
        toBinId: delta > 0 ? line.binId : undefined,
        qty: Math.abs(delta),
        reason: 'ADJUST',
        refType: 'adjustment',
        refId: id,
        batchNo: line.batchNo || undefined,
        createdBy: userId,
      });
    }

    const updated = await this.repository.updateAdjustmentStatus(id, 'POSTED');
    return updated!;
  }

  // Cycle Count operations
  async createCycleCount(data: {
    tenantId: string;
    warehouseId: string;
    createdBy?: string;
  }): Promise<CycleCountEntity> {
    await this.masterDataService.getWarehouse(data.warehouseId);
    const countNo = await this.cycleCountRepo.generateCountNo(data.tenantId);
    return this.cycleCountRepo.create({ ...data, countNo });
  }

  async deleteCycleCount(id: string): Promise<void> {
    const cc = await this.cycleCountRepo.findById(id);
    if (!cc) throw new NotFoundException('Cycle count not found');
    if (cc.status !== 'OPEN') throw new BadRequestException('Only OPEN cycle counts can be deleted');
    await this.cycleCountRepo.deleteCycleCount(id);
  }

  async getCycleCount(id: string): Promise<CycleCountEntity> {
    const cc = await this.cycleCountRepo.findById(id);
    if (!cc) throw new NotFoundException('Cycle count not found');
    return cc;
  }

  async listCycleCounts(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const data = await this.cycleCountRepo.findByTenant(tenantId, status, limit, offset);
    return { data, meta: { page, limit } };
  }

  async addCycleCountLine(
    cycleCountId: string,
    data: { tenantId: string; binId: string; itemId: string },
  ): Promise<CycleCountLineEntity> {
    const cc = await this.getCycleCount(cycleCountId);
    if (cc.status !== 'OPEN') {
      throw new BadRequestException('Can only add lines to OPEN cycle counts');
    }

    const stockInBin = await this.stockLedger.getStockInBin(data.tenantId, data.binId);
    const match = stockInBin.find((s) => s.itemId === data.itemId);
    const systemQty = match?.qtyOnHand ?? 0;

    return this.cycleCountRepo.addLine({
      tenantId: data.tenantId,
      cycleCountId,
      binId: data.binId,
      itemId: data.itemId,
      systemQty,
    });
  }

  async addCycleCountLinesFromBin(
    cycleCountId: string,
    data: { tenantId: string; binId: string },
  ): Promise<{ count: number }> {
    const cc = await this.getCycleCount(cycleCountId);
    if (cc.status !== 'OPEN') {
      throw new BadRequestException('Can only add lines to OPEN cycle counts');
    }

    const stockInBin = await this.stockLedger.getStockInBin(data.tenantId, data.binId);
    if (stockInBin.length === 0) {
      throw new BadRequestException('No stock found in this bin');
    }

    const lines = stockInBin.map((s) => ({
      tenantId: data.tenantId,
      cycleCountId,
      binId: data.binId,
      itemId: s.itemId,
      systemQty: s.qtyOnHand,
    }));

    const count = await this.cycleCountRepo.addLines(lines);
    return { count };
  }

  async getCycleCountLines(cycleCountId: string): Promise<CycleCountLineEntity[]> {
    return this.cycleCountRepo.getLines(cycleCountId);
  }

  async removeCycleCountLine(cycleCountId: string, lineId: string): Promise<void> {
    const cc = await this.getCycleCount(cycleCountId);
    if (cc.status !== 'OPEN') {
      throw new BadRequestException('Can only remove lines from OPEN cycle counts');
    }
    await this.cycleCountRepo.deleteLine(lineId);
  }

  async startCycleCount(id: string): Promise<CycleCountEntity> {
    const cc = await this.getCycleCount(id);
    if (cc.status !== 'OPEN') {
      throw new BadRequestException('Only OPEN cycle counts can be started');
    }
    const totalLines = await this.cycleCountRepo.getTotalLineCount(id);
    if (totalLines === 0) {
      throw new BadRequestException('Cannot start a cycle count with no lines');
    }
    const updated = await this.cycleCountRepo.updateStatus(id, 'IN_PROGRESS', {
      startedAt: new Date(),
    });
    return updated!;
  }

  async recordCount(
    lineId: string,
    data: { countedQty: number; countedBy: string },
  ): Promise<CycleCountLineEntity> {
    const line = await this.cycleCountRepo.getLine(lineId);
    if (!line) throw new NotFoundException('Cycle count line not found');

    const cc = await this.getCycleCount(line.cycleCountId);
    if (cc.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Can only record counts on IN_PROGRESS cycle counts');
    }

    const updated = await this.cycleCountRepo.updateLineCount(
      lineId,
      data.countedQty,
      data.countedBy,
    );
    return updated!;
  }

  async completeCycleCount(id: string): Promise<CycleCountEntity> {
    const cc = await this.getCycleCount(id);
    if (cc.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only IN_PROGRESS cycle counts can be completed');
    }
    const counted = await this.cycleCountRepo.getCountedLineCount(id);
    const total = await this.cycleCountRepo.getTotalLineCount(id);
    if (counted < total) {
      throw new BadRequestException(`All lines must be counted (${counted}/${total} done)`);
    }
    const updated = await this.cycleCountRepo.updateStatus(id, 'PENDING_APPROVAL');
    return updated!;
  }

  async generateAdjustmentFromCycleCount(id: string, userId: string): Promise<Adjustment> {
    const cc = await this.getCycleCount(id);
    if (cc.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only PENDING_APPROVAL cycle counts can generate adjustments');
    }

    const varianceLines = await this.cycleCountRepo.getLinesWithVariance(id);
    if (varianceLines.length === 0) {
      throw new BadRequestException('No variances found to adjust');
    }

    const adjustment = await this.createAdjustment({
      tenantId: cc.tenantId,
      warehouseId: cc.warehouseId,
      reason: 'Cycle Count Variance',
      notes: `Generated from cycle count ${cc.countNo}`,
      cycleCountId: id,
      createdBy: userId,
    });

    for (const line of varianceLines) {
      await this.addAdjustmentLine(adjustment.id, {
        tenantId: cc.tenantId,
        binId: line.binId,
        itemId: line.itemId,
        qtyAfter: line.countedQty!,
      });
    }

    return adjustment;
  }

  async closeCycleCount(id: string, approvedBy: string): Promise<CycleCountEntity> {
    const cc = await this.getCycleCount(id);
    if (cc.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only PENDING_APPROVAL cycle counts can be closed');
    }
    const updated = await this.cycleCountRepo.updateStatus(id, 'CLOSED', {
      closedAt: new Date(),
      approvedBy,
    });
    return updated!;
  }

  async cancelCycleCount(id: string): Promise<CycleCountEntity> {
    const cc = await this.getCycleCount(id);
    if (cc.status !== 'OPEN' && cc.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only OPEN or IN_PROGRESS cycle counts can be cancelled');
    }
    const updated = await this.cycleCountRepo.updateStatus(id, 'CANCELLED');
    return updated!;
  }

  // Putaway operations
  async generatePutawayTasks(grnId: string, tenantId: string): Promise<PutawayTaskDetail[]> {
    const grn = await this.getGrn(grnId);
    if (grn.status !== 'RECEIVED') {
      throw new BadRequestException('GRN must be in RECEIVED status to generate putaway tasks');
    }

    const lines = await this.repository.getGrnLines(grnId);
    if (lines.length === 0) {
      throw new BadRequestException('GRN has no received lines');
    }

    const tasks = lines.map((line: GrnLine) => ({
      tenantId,
      grnLineId: line.id,
      itemId: line.itemId,
      fromBinId: line.receivingBinId!,
      qty: line.qtyReceived,
    }));

    const created = await this.putawayRepo.createMany(tasks);
    await this.repository.updateGrnStatus(grnId, 'PUTAWAY_PENDING');

    return this.putawayRepo.findByGrn(grnId);
  }

  async listPutawayTasks(
    tenantId: string,
    filters: PutawayFilters,
    page = 1,
    limit = 25,
  ): Promise<{ data: PutawayTaskDetail[]; total: number }> {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.putawayRepo.findByTenant(tenantId, filters, limit, offset),
      this.putawayRepo.countByTenant(tenantId, filters),
    ]);
    return { data, total };
  }

  async getPutawayTask(id: string): Promise<PutawayTaskDetail> {
    const task = await this.putawayRepo.findById(id);
    if (!task) {
      throw new NotFoundException('Putaway task not found');
    }
    return task;
  }

  async getPutawayTasksByGrn(grnId: string): Promise<PutawayTaskDetail[]> {
    return this.putawayRepo.findByGrn(grnId);
  }

  async assignPutawayTask(id: string, userId: string): Promise<PutawayTaskDetail> {
    const task = await this.getPutawayTask(id);
    if (task.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING tasks can be assigned');
    }
    await this.putawayRepo.assignTask(id, userId);
    return this.getPutawayTask(id);
  }

  async completePutawayTask(
    id: string,
    toBinId: string,
    userId?: string,
  ): Promise<PutawayTaskDetail> {
    const task = await this.getPutawayTask(id);
    if (task.status !== 'PENDING' && task.status !== 'ASSIGNED') {
      throw new BadRequestException('Only PENDING or ASSIGNED tasks can be completed');
    }

    // Validate target bin is STORAGE or PICKING type
    const bin = await this.masterDataService.getBin(toBinId);
    if (!bin) {
      throw new NotFoundException('Target bin not found');
    }
    if (bin.binType !== 'STORAGE' && bin.binType !== 'PICKING') {
      throw new BadRequestException('Target bin must be a STORAGE or PICKING bin');
    }

    // Record stock movement: from receiving bin → to storage bin
    await this.stockLedger.recordMovement({
      tenantId: task.tenantId,
      itemId: task.itemId,
      fromBinId: task.fromBinId,
      toBinId,
      qty: task.qty,
      reason: 'PUTAWAY',
      refType: 'putaway_task',
      refId: task.id,
      batchNo: task.batchNo || undefined,
      createdBy: userId,
    });

    await this.putawayRepo.completeTask(id, toBinId);

    // Check if all tasks for this GRN are complete → auto-finalize
    const pendingCount = await this.putawayRepo.countPendingByGrn(task.grnId);
    if (pendingCount === 0) {
      await this.repository.updateGrnStatus(task.grnId, 'COMPLETE');
    }

    return this.getPutawayTask(id);
  }

  async cancelPutawayTask(id: string): Promise<PutawayTaskDetail> {
    const task = await this.getPutawayTask(id);
    if (task.status !== 'PENDING' && task.status !== 'ASSIGNED') {
      throw new BadRequestException('Only PENDING or ASSIGNED tasks can be cancelled');
    }
    await this.putawayRepo.cancelTask(id);
    return this.getPutawayTask(id);
  }
}
