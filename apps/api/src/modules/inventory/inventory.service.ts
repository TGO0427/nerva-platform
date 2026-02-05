import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryRepository, Grn, GrnLine, Adjustment, AdjustmentLine } from './inventory.repository';
import { StockLedgerService } from './stock-ledger.service';
import { BatchRepository } from './batch.repository';
import { MasterDataService } from '../masterdata/masterdata.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
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

  async getGrn(id: string): Promise<Grn> {
    const grn = await this.repository.findGrnById(id);
    if (!grn) throw new NotFoundException('GRN not found');
    return grn;
  }

  async listGrns(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const grns = await this.repository.findGrnsByTenant(tenantId, status, limit, offset);
    return { data: grns, meta: { page, limit } };
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
    if (grn.status !== 'RECEIVED') {
      throw new BadRequestException('GRN must be in RECEIVED status to complete');
    }
    const updated = await this.repository.updateGrnStatus(grnId, 'COMPLETE');
    return updated!;
  }

  // Stock queries
  async getStockOnHand(tenantId: string, itemId: string) {
    return this.stockLedger.getStockOnHand(tenantId, itemId);
  }

  async getStockInBin(tenantId: string, binId: string) {
    return this.stockLedger.getStockInBin(tenantId, binId);
  }

  async getLedgerHistory(tenantId: string, itemId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const history = await this.stockLedger.getLedgerHistory(tenantId, itemId, limit, offset);
    return { data: history, meta: { page, limit } };
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

  async getAdjustment(id: string): Promise<Adjustment> {
    const adjustment = await this.repository.findAdjustmentById(id);
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    return adjustment;
  }

  async listAdjustments(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const adjustments = await this.repository.findAdjustmentsByTenant(tenantId, status, limit, offset);
    return { data: adjustments, meta: { page, limit } };
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
}
