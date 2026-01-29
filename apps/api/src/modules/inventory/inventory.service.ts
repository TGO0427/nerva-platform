import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryRepository, Grn, GrnLine, Adjustment } from './inventory.repository';
import { StockLedgerService } from './stock-ledger.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly stockLedger: StockLedgerService,
  ) {}

  // GRN operations
  async createGrn(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    purchaseOrderId?: string;
    supplierId?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<Grn> {
    const grnNo = await this.repository.generateGrnNo(data.tenantId);
    return this.repository.createGrn({ ...data, grnNo });
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

    // Add GRN line
    const line = await this.repository.addGrnLine({
      ...data,
      grnId,
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
}
