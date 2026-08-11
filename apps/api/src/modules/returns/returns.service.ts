import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ReturnsRepository,
  Rma,
  RmaLine,
  CreditNoteDraft,
} from "./returns.repository";
import { StockLedgerService } from "../inventory/stock-ledger.service";
import { MasterDataService } from "../masterdata/masterdata.service";
import { buildPaginatedResult } from "../../common/utils/pagination";

@Injectable()
export class ReturnsService {
  constructor(
    private readonly repository: ReturnsRepository,
    private readonly stockLedger: StockLedgerService,
    private readonly masterDataService: MasterDataService,
  ) {}

  // RMA
  async createRma(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    customerId: string;
    salesOrderId: string;
    shipmentId?: string;
    returnType?: string;
    notes?: string;
    createdBy?: string;
    lines: Array<{
      itemId: string;
      qtyExpected: number;
      reasonCode: string;
      unitCreditAmount?: number;
      salesOrderLineId?: string;
      batchNo?: string;
    }>;
  }): Promise<Rma> {
    const rmaNo = await this.repository.generateRmaNo(data.tenantId);
    const rma = await this.repository.createRma({ ...data, rmaNo });

    for (const line of data.lines) {
      await this.repository.addRmaLine({
        tenantId: data.tenantId,
        rmaId: rma.id,
        ...line,
      });
    }

    return rma;
  }

  async getRma(id: string): Promise<Rma> {
    const rma = await this.repository.findRmaById(id);
    if (!rma) throw new NotFoundException("RMA not found");
    return rma;
  }

  async getRmaWithLines(id: string): Promise<{ rma: Rma; lines: RmaLine[] }> {
    const rma = await this.getRma(id);
    const lines = await this.repository.getRmaLines(id);
    return { rma, lines };
  }

  async listRmas(
    tenantId: string,
    siteId: string | undefined,
    filters: { status?: string; customerId?: string; search?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findRmasByTenant(
        tenantId,
        { ...filters, siteId },
        limit,
        offset,
      ),
      this.repository.countRmasByTenant(tenantId, { ...filters, siteId }),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async receiveRmaLine(
    rmaId: string,
    lineId: string,
    qtyReceived: number,
    receivingBinId: string,
    createdBy?: string,
    batchNo?: string,
  ): Promise<RmaLine> {
    const rma = await this.getRma(rmaId);
    const line = await this.repository.findRmaLineById(lineId);

    if (!line || line.rmaId !== rmaId) {
      throw new NotFoundException("RMA line not found");
    }

    // Without a batch, a batch-tracked return would silently land in a
    // phantom "no batch" stock_snapshot row, disconnected from the item's
    // real batch inventory (the same gap already closed for IBT/Adjustments/
    // Production output).
    const item = await this.masterDataService.getItem(rma.tenantId, line.itemId);
    if (item.requiresBatchTracking && !batchNo) {
      throw new BadRequestException(
        `${item.sku} requires a batch/lot number to receive this return`,
      );
    }

    // Record stock receipt
    await this.stockLedger.recordMovement({
      tenantId: rma.tenantId,
      siteId: rma.siteId,
      itemId: line.itemId,
      toBinId: receivingBinId,
      qty: qtyReceived,
      reason: "RETURN",
      refType: "rma",
      refId: rmaId,
      batchNo,
      createdBy,
    });

    const updated = await this.repository.receiveRmaLine(
      lineId,
      qtyReceived,
      receivingBinId,
      batchNo,
    );

    // Update RMA status if all lines received. Nothing in this app ever
    // moves an RMA to AWAITING_RETURN specifically (there's no separate
    // "authorize" step before receiving) - OPEN is the real starting
    // point in practice, so that has to be included here too or every
    // RMA gets stuck at OPEN forever once fully received.
    const lines = await this.repository.getRmaLines(rmaId);
    const allReceived = lines.every((l) => l.qtyReceived >= l.qtyExpected);
    if (allReceived && ["OPEN", "AWAITING_RETURN"].includes(rma.status)) {
      await this.repository.updateRmaStatus(rmaId, "RECEIVED");
    }

    return updated!;
  }

  async setLineDisposition(
    rmaId: string,
    lineId: string,
    disposition: string,
    dispositionBinId: string,
    inspectedBy: string,
    inspectionNotes?: string,
  ): Promise<RmaLine> {
    const rma = await this.getRma(rmaId);
    const line = await this.repository.findRmaLineById(lineId);

    if (!line || line.rmaId !== rmaId) {
      throw new NotFoundException("RMA line not found");
    }

    if (line.qtyReceived <= 0) {
      throw new BadRequestException("Line must be received before disposition");
    }
    if (!line.receivingBinId) {
      throw new BadRequestException(
        "Line has no receiving bin on record - cannot move its stock",
      );
    }

    // The returned qty already sits in receivingBinId (added there at
    // receive time) - SCRAP removes it from inventory entirely, everything
    // else (RESTOCK/QUARANTINE/RETURN_TO_SUPPLIER) is a pure relocation to
    // the disposition bin. Setting only toBinId here (as before) would
    // double-count the stock: once from the receive, once from this move.
    await this.stockLedger.recordMovement({
      tenantId: rma.tenantId,
      siteId: rma.siteId,
      itemId: line.itemId,
      fromBinId: line.receivingBinId,
      toBinId: disposition === "SCRAP" ? undefined : dispositionBinId,
      qty: line.qtyReceived,
      reason: disposition === "SCRAP" ? "SCRAP" : "TRANSFER",
      refType: "rma",
      refId: rmaId,
      batchNo: line.batchNo || undefined,
      createdBy: inspectedBy,
    });

    const updated = await this.repository.setLineDisposition(
      lineId,
      disposition,
      dispositionBinId,
      inspectedBy,
      inspectionNotes,
    );

    // Inspection is now in progress - the explicit completeDisposition
    // action (not this one) is what moves it to DISPOSITION_COMPLETE, once
    // every line has a disposition set.
    if (rma.status === "RECEIVED") {
      await this.repository.updateRmaStatus(rmaId, "INSPECTING");
    }

    return updated!;
  }

  async updateLineCreditAmount(
    rmaId: string,
    lineId: string,
    unitCreditAmount: number,
  ): Promise<RmaLine> {
    const rma = await this.getRma(rmaId);
    const line = await this.repository.findRmaLineById(lineId);

    if (!line || line.rmaId !== rmaId) {
      throw new NotFoundException("RMA line not found");
    }
    if (["CLOSED", "CANCELLED"].includes(rma.status)) {
      throw new BadRequestException(
        `Cannot change the credit amount on a ${rma.status} RMA`,
      );
    }

    const updated = await this.repository.updateLineCreditAmount(
      lineId,
      unitCreditAmount,
    );
    return updated!;
  }

  async deleteRma(id: string): Promise<void> {
    const rma = await this.repository.findRmaById(id);
    if (!rma) throw new NotFoundException("RMA not found");
    if (rma.status !== "OPEN") {
      throw new BadRequestException("Only OPEN RMAs can be deleted");
    }
    await this.repository.deleteRma(id);
  }

  // Credit Notes
  async createCreditNote(
    rmaId: string,
    createdBy?: string,
  ): Promise<CreditNoteDraft> {
    const rma = await this.getRma(rmaId);
    const lines = await this.repository.getRmaLines(rmaId);

    // Calculate totals
    let subtotal = 0;
    for (const line of lines) {
      if (line.unitCreditAmount && line.qtyReceived > 0) {
        subtotal += line.unitCreditAmount * line.qtyReceived;
      }
    }

    const taxRate = 0.15; // 15% VAT for ZA
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const creditNo = await this.repository.generateCreditNo(rma.tenantId);

    const creditNote = await this.repository.createCreditNoteDraft({
      tenantId: rma.tenantId,
      rmaId,
      creditNo,
      subtotal,
      taxAmount,
      totalAmount,
      createdBy,
    });

    await this.repository.updateRmaStatus(rmaId, "CREDIT_PENDING");

    return creditNote;
  }

  async getCreditNote(id: string): Promise<CreditNoteDraft> {
    const creditNote = await this.repository.findCreditNoteById(id);
    if (!creditNote) throw new NotFoundException("Credit note not found");
    return creditNote;
  }

  async listCreditNotes(
    tenantId: string,
    status?: string,
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findCreditNotesByTenant(tenantId, status, limit, offset),
      this.repository.countCreditNotesByTenant(tenantId, status),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async deleteCreditNote(id: string): Promise<void> {
    const creditNote = await this.repository.findCreditNoteById(id);
    if (!creditNote) throw new NotFoundException("Credit note not found");
    if (creditNote.status !== "DRAFT") {
      throw new BadRequestException("Only DRAFT credit notes can be deleted");
    }
    await this.repository.deleteCreditNote(id);

    // Deleting the RMA's only credit note leaves it stuck in CREDIT_PENDING
    // with no way to create a corrected one - revert so it can be redone.
    const hasOther = await this.repository.hasOtherActiveCreditNote(
      creditNote.rmaId,
      id,
    );
    if (!hasOther) {
      await this.repository.updateRmaStatus(
        creditNote.rmaId,
        "DISPOSITION_COMPLETE",
      );
    }
  }

  async submitCreditNote(id: string): Promise<CreditNoteDraft> {
    const creditNote = await this.repository.submitCreditNote(id);
    if (!creditNote) {
      throw new BadRequestException(
        "Credit note not found or not in DRAFT status",
      );
    }
    return creditNote;
  }

  async approveCreditNote(
    id: string,
    approvedBy: string,
  ): Promise<CreditNoteDraft> {
    const creditNote = await this.repository.approveCreditNote(id, approvedBy);
    if (!creditNote) {
      throw new BadRequestException(
        "Credit note not found or not in SUBMITTED status",
      );
    }

    // Update RMA status
    await this.repository.updateRmaStatus(creditNote.rmaId, "CREDIT_APPROVED");

    return creditNote;
  }

  async createStandaloneCreditNote(
    tenantId: string,
    data: { rmaId: string; amount: number; reason: string; notes?: string },
    createdBy: string,
  ): Promise<CreditNoteDraft> {
    const rma = await this.getRma(data.rmaId);

    const subtotal = data.amount;
    const taxRate = 0.15;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const creditNo = await this.repository.generateCreditNo(tenantId);

    const notes = [data.reason, data.notes].filter(Boolean).join(" — ");

    const creditNote = await this.repository.createCreditNoteDraft({
      tenantId,
      rmaId: data.rmaId,
      creditNo,
      subtotal,
      taxAmount,
      totalAmount,
      notes: notes || undefined,
      createdBy,
    });

    await this.repository.updateRmaStatus(data.rmaId, "CREDIT_PENDING");

    return creditNote;
  }

  async postCreditNote(id: string): Promise<CreditNoteDraft> {
    const creditNote = await this.repository.postCreditNote(id);
    if (!creditNote) {
      throw new BadRequestException(
        "Credit note not found or not in APPROVED status",
      );
    }
    return creditNote;
  }

  async cancelCreditNote(id: string, reason: string): Promise<CreditNoteDraft> {
    const before = await this.repository.findCreditNoteById(id);
    const creditNote = await this.repository.cancelCreditNote(id, reason);
    if (!creditNote) {
      throw new BadRequestException(
        "Credit note not found or already cancelled",
      );
    }

    // Cancelling a not-yet-posted credit note is "this was wrong, redo it" -
    // revert the RMA so a corrected one can be created, same as delete.
    // A POSTED note has already gone to the finance system, so its RMA stays
    // put; unwinding that is a real accounting reversal, not a redo.
    if (before && before.status !== "POSTED") {
      const hasOther = await this.repository.hasOtherActiveCreditNote(
        creditNote.rmaId,
        id,
      );
      if (!hasOther) {
        await this.repository.updateRmaStatus(
          creditNote.rmaId,
          "DISPOSITION_COMPLETE",
        );
      }
    }

    return creditNote;
  }

  async completeDisposition(rmaId: string): Promise<Rma> {
    const rma = await this.getRma(rmaId);
    const lines = await this.repository.getRmaLines(rmaId);

    if (lines.length === 0) {
      throw new BadRequestException("RMA has no lines");
    }

    const allDisposed = lines.every((l) => l.disposition !== "PENDING");
    if (!allDisposed) {
      throw new BadRequestException(
        "All lines must have a disposition set before completing",
      );
    }

    const updated = await this.repository.updateRmaStatus(
      rmaId,
      "DISPOSITION_COMPLETE",
    );
    if (!updated) {
      throw new BadRequestException("Failed to update RMA status");
    }
    return updated;
  }

  async closeRma(rmaId: string): Promise<Rma> {
    const rma = await this.getRma(rmaId);

    const closableStatuses = [
      "RECEIVED",
      "DISPOSITION_COMPLETE",
      "CREDIT_APPROVED",
    ];
    if (!closableStatuses.includes(rma.status)) {
      throw new BadRequestException(
        `RMA cannot be closed from status ${rma.status}. Must be in: ${closableStatuses.join(", ")}`,
      );
    }

    const updated = await this.repository.updateRmaStatus(rmaId, "CLOSED");
    if (!updated) {
      throw new BadRequestException("Failed to update RMA status");
    }
    return updated;
  }

  async cancelRma(rmaId: string, reason: string): Promise<Rma> {
    const rma = await this.getRma(rmaId);

    if (rma.status === "CLOSED" || rma.status === "CANCELLED") {
      throw new BadRequestException(
        `RMA cannot be cancelled from status ${rma.status}`,
      );
    }

    const updated = await this.repository.updateRmaStatus(rmaId, "CANCELLED");
    if (!updated) {
      throw new BadRequestException("Failed to update RMA status");
    }
    return updated;
  }
}
