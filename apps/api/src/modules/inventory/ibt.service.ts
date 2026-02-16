import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IbtRepository, IbtDetail, IbtLineDetail, IbtFilters } from './ibt.repository';
import { StockLedgerService } from './stock-ledger.service';
import { MasterDataService } from '../masterdata/masterdata.service';
import { buildPaginatedResult } from '../../common/utils/pagination';

@Injectable()
export class IbtService {
  constructor(
    private readonly ibtRepo: IbtRepository,
    private readonly stockLedger: StockLedgerService,
    private readonly masterDataService: MasterDataService,
  ) {}

  async createIbt(data: {
    tenantId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    notes?: string;
    createdBy?: string;
  }): Promise<IbtDetail> {
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must be different');
    }

    // Validate warehouses exist
    await this.masterDataService.getWarehouse(data.fromWarehouseId);
    await this.masterDataService.getWarehouse(data.toWarehouseId);

    const ibtNo = await this.ibtRepo.generateIbtNo(data.tenantId);
    const ibt = await this.ibtRepo.create({
      tenantId: data.tenantId,
      ibtNo,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      notes: data.notes,
      createdBy: data.createdBy,
    });

    return this.getIbt(ibt.id);
  }

  async deleteIbt(id: string): Promise<void> {
    const ibt = await this.ibtRepo.findById(id);
    if (!ibt) throw new NotFoundException('IBT not found');
    if (ibt.status !== 'DRAFT') throw new BadRequestException('Only DRAFT IBTs can be deleted');
    await this.ibtRepo.deleteIbt(id);
  }

  async getIbt(id: string): Promise<IbtDetail> {
    const ibt = await this.ibtRepo.findById(id);
    if (!ibt) throw new NotFoundException('IBT not found');
    return ibt;
  }

  async listIbts(
    tenantId: string,
    filters: IbtFilters,
    page = 1,
    limit = 25,
  ) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.ibtRepo.findByTenant(tenantId, filters, limit, offset),
      this.ibtRepo.countByTenant(tenantId, filters),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async getLines(ibtId: string): Promise<IbtLineDetail[]> {
    return this.ibtRepo.getLines(ibtId);
  }

  async addLine(
    ibtId: string,
    data: {
      tenantId: string;
      itemId: string;
      qtyRequested: number;
      fromBinId?: string;
      batchNo?: string;
    },
  ): Promise<IbtLineDetail[]> {
    const ibt = await this.getIbt(ibtId);
    if (ibt.status !== 'DRAFT') {
      throw new BadRequestException('Can only add lines to DRAFT IBTs');
    }

    if (data.qtyRequested <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    // Validate bin belongs to source warehouse if provided
    if (data.fromBinId) {
      const bin = await this.masterDataService.getBin(data.fromBinId);
      if (bin.warehouseId !== ibt.fromWarehouseId) {
        throw new BadRequestException('Source bin must belong to the source warehouse');
      }
    }

    await this.ibtRepo.addLine({
      tenantId: data.tenantId,
      ibtId,
      itemId: data.itemId,
      qtyRequested: data.qtyRequested,
      fromBinId: data.fromBinId,
      batchNo: data.batchNo,
    });

    return this.ibtRepo.getLines(ibtId);
  }

  async removeLine(ibtId: string, lineId: string): Promise<void> {
    const ibt = await this.getIbt(ibtId);
    if (ibt.status !== 'DRAFT') {
      throw new BadRequestException('Can only remove lines from DRAFT IBTs');
    }
    await this.ibtRepo.deleteLine(lineId);
  }

  async submitForApproval(id: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(id);
    if (ibt.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT IBTs can be submitted for approval');
    }

    const lines = await this.ibtRepo.getLines(id);
    if (lines.length === 0) {
      throw new BadRequestException('Cannot submit IBT with no lines');
    }

    await this.ibtRepo.updateStatus(id, 'PENDING_APPROVAL');
    return this.getIbt(id);
  }

  async approve(id: string, userId: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(id);
    if (ibt.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only PENDING_APPROVAL IBTs can be approved');
    }

    await this.ibtRepo.updateStatus(id, 'APPROVED', {
      approvedBy: userId,
      approvedAt: new Date(),
    });
    return this.getIbt(id);
  }

  async startPicking(id: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(id);
    if (ibt.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED IBTs can start picking');
    }

    await this.ibtRepo.updateStatus(id, 'PICKING');
    return this.getIbt(id);
  }

  async shipLines(
    id: string,
    lines: Array<{ lineId: string; qtyShipped: number }>,
    userId: string,
  ): Promise<IbtDetail> {
    const ibt = await this.getIbt(id);
    if (ibt.status !== 'PICKING') {
      throw new BadRequestException('Only PICKING IBTs can be shipped');
    }

    const fromWarehouse = await this.masterDataService.getWarehouse(ibt.fromWarehouseId);
    const ibtLines = await this.ibtRepo.getLines(id);
    const lineMap = new Map(ibtLines.map((l) => [l.id, l]));

    for (const shipLine of lines) {
      const line = lineMap.get(shipLine.lineId);
      if (!line) {
        throw new BadRequestException(`Line ${shipLine.lineId} not found`);
      }
      if (shipLine.qtyShipped > line.qtyRequested) {
        throw new BadRequestException(`Cannot ship more than requested for item ${line.itemSku}`);
      }
      if (shipLine.qtyShipped <= 0) continue;

      if (!line.fromBinId) {
        throw new BadRequestException(`Source bin not set for item ${line.itemSku}`);
      }

      // Record IBT_OUT stock movement
      await this.stockLedger.recordMovement({
        tenantId: ibt.tenantId,
        siteId: fromWarehouse.siteId,
        itemId: line.itemId,
        fromBinId: line.fromBinId,
        qty: shipLine.qtyShipped,
        reason: 'IBT_OUT',
        refType: 'ibt',
        refId: ibt.id,
        batchNo: line.batchNo || undefined,
        createdBy: userId,
      });

      await this.ibtRepo.updateLineShipped(shipLine.lineId, shipLine.qtyShipped);
    }

    await this.ibtRepo.updateStatus(id, 'IN_TRANSIT', { shippedAt: new Date() });
    return this.getIbt(id);
  }

  async receiveLines(
    id: string,
    lines: Array<{ lineId: string; qtyReceived: number; toBinId: string }>,
    userId: string,
  ): Promise<IbtDetail> {
    const ibt = await this.getIbt(id);
    if (ibt.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Only IN_TRANSIT IBTs can be received');
    }

    const toWarehouse = await this.masterDataService.getWarehouse(ibt.toWarehouseId);
    const ibtLines = await this.ibtRepo.getLines(id);
    const lineMap = new Map(ibtLines.map((l) => [l.id, l]));

    for (const rcvLine of lines) {
      const line = lineMap.get(rcvLine.lineId);
      if (!line) {
        throw new BadRequestException(`Line ${rcvLine.lineId} not found`);
      }
      if (rcvLine.qtyReceived > line.qtyShipped) {
        throw new BadRequestException(`Cannot receive more than shipped for item ${line.itemSku}`);
      }
      if (rcvLine.qtyReceived <= 0) continue;

      // Validate destination bin belongs to target warehouse
      const destBin = await this.masterDataService.getBin(rcvLine.toBinId);
      if (destBin.warehouseId !== ibt.toWarehouseId) {
        throw new BadRequestException('Destination bin must belong to the target warehouse');
      }

      // Record IBT_IN stock movement
      await this.stockLedger.recordMovement({
        tenantId: ibt.tenantId,
        siteId: toWarehouse.siteId,
        itemId: line.itemId,
        toBinId: rcvLine.toBinId,
        qty: rcvLine.qtyReceived,
        reason: 'IBT_IN',
        refType: 'ibt',
        refId: ibt.id,
        batchNo: line.batchNo || undefined,
        createdBy: userId,
      });

      await this.ibtRepo.updateLineReceived(rcvLine.lineId, rcvLine.qtyReceived, rcvLine.toBinId);
    }

    // Check if all lines are fully received
    const updatedLines = await this.ibtRepo.getLines(id);
    const allReceived = updatedLines.every((l) => l.qtyReceived >= l.qtyShipped);

    if (allReceived) {
      await this.ibtRepo.updateStatus(id, 'RECEIVED', { receivedAt: new Date() });
    }

    return this.getIbt(id);
  }

  async cancel(id: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(id);
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(ibt.status)) {
      throw new BadRequestException('Only DRAFT or PENDING_APPROVAL IBTs can be cancelled');
    }

    await this.ibtRepo.updateStatus(id, 'CANCELLED');
    return this.getIbt(id);
  }
}
