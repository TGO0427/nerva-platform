import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  IbtRepository,
  IbtDetail,
  IbtLineDetail,
  IbtFilters,
} from "./ibt.repository";
import { StockLedgerService } from "./stock-ledger.service";
import { MasterDataService } from "../masterdata/masterdata.service";
import { AuditService } from "../audit/audit.service";
import { buildPaginatedResult } from "../../common/utils/pagination";

@Injectable()
export class IbtService {
  constructor(
    private readonly ibtRepo: IbtRepository,
    private readonly stockLedger: StockLedgerService,
    private readonly masterDataService: MasterDataService,
    private readonly auditService: AuditService,
  ) {}

  async createIbt(data: {
    tenantId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    notes?: string;
    createdBy?: string;
  }): Promise<IbtDetail> {
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException(
        "Source and destination warehouses must be different",
      );
    }

    // Validate warehouses exist
    await this.masterDataService.getWarehouse(
      data.tenantId,
      data.fromWarehouseId,
    );
    await this.masterDataService.getWarehouse(
      data.tenantId,
      data.toWarehouseId,
    );

    const ibtNo = await this.ibtRepo.generateIbtNo(data.tenantId);
    const ibt = await this.ibtRepo.create({
      tenantId: data.tenantId,
      ibtNo,
      fromWarehouseId: data.fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      notes: data.notes,
      createdBy: data.createdBy,
    });

    const created = await this.getIbt(data.tenantId, ibt.id);
    await this.auditService.log({
      tenantId: data.tenantId,
      actorUserId: data.createdBy,
      entityType: "Ibt",
      entityId: created.id,
      action: "CREATE",
      after: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  async deleteIbt(tenantId: string, id: string): Promise<void> {
    const ibt = await this.ibtRepo.findById(tenantId, id);
    if (!ibt) throw new NotFoundException("IBT not found");
    if (ibt.status !== "DRAFT")
      throw new BadRequestException("Only DRAFT IBTs can be deleted");
    await this.ibtRepo.deleteIbt(tenantId, id);
    await this.auditService.log({
      tenantId,
      entityType: "Ibt",
      entityId: id,
      action: "DELETE",
      before: ibt as unknown as Record<string, unknown>,
    });
  }

  async getIbt(tenantId: string, id: string): Promise<IbtDetail> {
    const ibt = await this.ibtRepo.findById(tenantId, id);
    if (!ibt) throw new NotFoundException("IBT not found");
    return ibt;
  }

  async listIbts(tenantId: string, filters: IbtFilters, page = 1, limit = 25) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.ibtRepo.findByTenant(tenantId, filters, limit, offset),
      this.ibtRepo.countByTenant(tenantId, filters),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async getLines(tenantId: string, ibtId: string): Promise<IbtLineDetail[]> {
    await this.getIbt(tenantId, ibtId);
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
    const ibt = await this.getIbt(data.tenantId, ibtId);
    if (ibt.status !== "DRAFT") {
      throw new BadRequestException("Can only add lines to DRAFT IBTs");
    }

    if (data.qtyRequested <= 0) {
      throw new BadRequestException("Quantity must be positive");
    }

    // Validate bin belongs to source warehouse if provided
    if (data.fromBinId) {
      const bin = await this.masterDataService.getBin(
        data.tenantId,
        data.fromBinId,
      );
      if (bin.warehouseId !== ibt.fromWarehouseId) {
        throw new BadRequestException(
          "Source bin must belong to the source warehouse",
        );
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

  async removeLine(tenantId: string, ibtId: string, lineId: string): Promise<void> {
    const ibt = await this.getIbt(tenantId, ibtId);
    if (ibt.status !== "DRAFT") {
      throw new BadRequestException("Can only remove lines from DRAFT IBTs");
    }
    await this.ibtRepo.deleteLine(lineId);
  }

  async submitForApproval(tenantId: string, id: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(tenantId, id);
    if (ibt.status !== "DRAFT") {
      throw new BadRequestException(
        "Only DRAFT IBTs can be submitted for approval",
      );
    }

    const lines = await this.ibtRepo.getLines(id);
    if (lines.length === 0) {
      throw new BadRequestException("Cannot submit IBT with no lines");
    }

    await this.ibtRepo.updateStatus(id, "PENDING_APPROVAL");
    const updated = await this.getIbt(tenantId, id);
    await this.auditService.log({
      tenantId,
      entityType: "Ibt",
      entityId: id,
      action: "SUBMIT",
      before: ibt as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async approve(tenantId: string, id: string, userId: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(tenantId, id);
    if (ibt.status !== "PENDING_APPROVAL") {
      throw new BadRequestException(
        "Only PENDING_APPROVAL IBTs can be approved",
      );
    }

    await this.ibtRepo.updateStatus(id, "APPROVED", {
      approvedBy: userId,
      approvedAt: new Date(),
    });
    const updated = await this.getIbt(tenantId, id);
    await this.auditService.log({
      tenantId,
      actorUserId: userId,
      entityType: "Ibt",
      entityId: id,
      action: "APPROVE",
      before: ibt as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async startPicking(tenantId: string, id: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(tenantId, id);
    if (ibt.status !== "APPROVED") {
      throw new BadRequestException("Only APPROVED IBTs can start picking");
    }

    await this.ibtRepo.updateStatus(id, "PICKING");
    const updated = await this.getIbt(tenantId, id);
    await this.auditService.log({
      tenantId,
      entityType: "Ibt",
      entityId: id,
      action: "START_PICKING",
      before: ibt as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async shipLines(
    tenantId: string,
    id: string,
    lines: Array<{ lineId: string; qtyShipped: number }>,
    userId: string,
  ): Promise<IbtDetail> {
    const ibt = await this.getIbt(tenantId, id);
    if (ibt.status !== "PICKING") {
      throw new BadRequestException("Only PICKING IBTs can be shipped");
    }

    const fromWarehouse = await this.masterDataService.getWarehouse(
      ibt.tenantId,
      ibt.fromWarehouseId,
    );
    const ibtLines = await this.ibtRepo.getLines(id);
    const lineMap = new Map(ibtLines.map((l) => [l.id, l]));

    for (const shipLine of lines) {
      const line = lineMap.get(shipLine.lineId);
      if (!line) {
        throw new BadRequestException(`Line ${shipLine.lineId} not found`);
      }
      if (shipLine.qtyShipped > line.qtyRequested) {
        throw new BadRequestException(
          `Cannot ship more than requested for item ${line.itemSku}`,
        );
      }
      if (shipLine.qtyShipped <= 0) continue;

      if (!line.fromBinId) {
        throw new BadRequestException(
          `Source bin not set for item ${line.itemSku}`,
        );
      }

      const item = await this.masterDataService.getItem(
        ibt.tenantId,
        line.itemId,
      );
      if (item.requiresBatchTracking && !line.batchNo) {
        throw new BadRequestException(
          `${line.itemSku} requires a batch/lot number to be transferred`,
        );
      }

      const stockInBin = await this.stockLedger.getStockInBin(
        ibt.tenantId,
        line.fromBinId,
      );
      const batchStock = stockInBin.find(
        (s) =>
          s.itemId === line.itemId &&
          (s.batchNo || null) === (line.batchNo || null),
      );
      const availableQty = batchStock?.qtyAvailable ?? 0;
      if (shipLine.qtyShipped > availableQty) {
        throw new BadRequestException(
          `Insufficient stock for ${line.itemSku} in batch ${line.batchNo || "none"} — only ${availableQty} available`,
        );
      }

      // Record IBT_OUT stock movement
      await this.stockLedger.recordMovement({
        tenantId: ibt.tenantId,
        siteId: fromWarehouse.siteId,
        itemId: line.itemId,
        fromBinId: line.fromBinId,
        qty: shipLine.qtyShipped,
        reason: "IBT_OUT",
        refType: "ibt",
        refId: ibt.id,
        batchNo: line.batchNo || undefined,
        createdBy: userId,
      });

      await this.ibtRepo.updateLineShipped(
        shipLine.lineId,
        shipLine.qtyShipped,
      );
    }

    await this.ibtRepo.updateStatus(id, "IN_TRANSIT", {
      shippedAt: new Date(),
    });
    const updated = await this.getIbt(tenantId, id);
    await this.auditService.log({
      tenantId,
      actorUserId: userId,
      entityType: "Ibt",
      entityId: id,
      action: "SHIP",
      before: ibt as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async receiveLines(
    tenantId: string,
    id: string,
    lines: Array<{ lineId: string; qtyReceived: number; toBinId: string }>,
    userId: string,
  ): Promise<IbtDetail> {
    const ibt = await this.getIbt(tenantId, id);
    if (ibt.status !== "IN_TRANSIT") {
      throw new BadRequestException("Only IN_TRANSIT IBTs can be received");
    }

    const toWarehouse = await this.masterDataService.getWarehouse(
      ibt.tenantId,
      ibt.toWarehouseId,
    );
    const ibtLines = await this.ibtRepo.getLines(id);
    const lineMap = new Map(ibtLines.map((l) => [l.id, l]));

    for (const rcvLine of lines) {
      const line = lineMap.get(rcvLine.lineId);
      if (!line) {
        throw new BadRequestException(`Line ${rcvLine.lineId} not found`);
      }
      if (rcvLine.qtyReceived > line.qtyShipped) {
        throw new BadRequestException(
          `Cannot receive more than shipped for item ${line.itemSku}`,
        );
      }
      if (rcvLine.qtyReceived <= 0) continue;

      // Validate destination bin belongs to target warehouse
      const destBin = await this.masterDataService.getBin(
        ibt.tenantId,
        rcvLine.toBinId,
      );
      if (destBin.warehouseId !== ibt.toWarehouseId) {
        throw new BadRequestException(
          "Destination bin must belong to the target warehouse",
        );
      }

      // Record IBT_IN stock movement
      await this.stockLedger.recordMovement({
        tenantId: ibt.tenantId,
        siteId: toWarehouse.siteId,
        itemId: line.itemId,
        toBinId: rcvLine.toBinId,
        qty: rcvLine.qtyReceived,
        reason: "IBT_IN",
        refType: "ibt",
        refId: ibt.id,
        batchNo: line.batchNo || undefined,
        createdBy: userId,
      });

      await this.ibtRepo.updateLineReceived(
        rcvLine.lineId,
        rcvLine.qtyReceived,
        rcvLine.toBinId,
      );
    }

    // Check if all lines are fully received
    const updatedLines = await this.ibtRepo.getLines(id);
    const allReceived = updatedLines.every(
      (l) => l.qtyReceived >= l.qtyShipped,
    );

    if (allReceived) {
      await this.ibtRepo.updateStatus(id, "RECEIVED", {
        receivedAt: new Date(),
      });
    }

    const updated = await this.getIbt(tenantId, id);
    await this.auditService.log({
      tenantId,
      actorUserId: userId,
      entityType: "Ibt",
      entityId: id,
      action: allReceived ? "RECEIVE" : "PARTIAL_RECEIVE",
      before: ibt as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string): Promise<IbtDetail> {
    const ibt = await this.getIbt(tenantId, id);
    if (!["DRAFT", "PENDING_APPROVAL"].includes(ibt.status)) {
      throw new BadRequestException(
        "Only DRAFT or PENDING_APPROVAL IBTs can be cancelled",
      );
    }

    await this.ibtRepo.updateStatus(id, "CANCELLED");
    const updated = await this.getIbt(tenantId, id);
    await this.auditService.log({
      tenantId,
      entityType: "Ibt",
      entityId: id,
      action: "CANCEL",
      before: ibt as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });
    return updated;
  }
}
