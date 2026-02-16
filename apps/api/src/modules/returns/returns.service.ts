import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReturnsRepository, Rma, RmaLine, CreditNoteDraft } from './returns.repository';
import { StockLedgerService } from '../inventory/stock-ledger.service';
import { buildPaginatedResult } from '../../common/utils/pagination';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly repository: ReturnsRepository,
    private readonly stockLedger: StockLedgerService,
  ) {}

  // RMA
  async createRma(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    customerId: string;
    salesOrderId?: string;
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
    if (!rma) throw new NotFoundException('RMA not found');
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
    filters: { status?: string; customerId?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findRmasByTenant(tenantId, { ...filters, siteId }, limit, offset),
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
  ): Promise<RmaLine> {
    const rma = await this.getRma(rmaId);
    const line = await this.repository.findRmaLineById(lineId);

    if (!line || line.rmaId !== rmaId) {
      throw new NotFoundException('RMA line not found');
    }

    // Record stock receipt
    await this.stockLedger.recordMovement({
      tenantId: rma.tenantId,
      siteId: rma.siteId,
      itemId: line.itemId,
      toBinId: receivingBinId,
      qty: qtyReceived,
      reason: 'RETURN',
      refType: 'rma',
      refId: rmaId,
      createdBy,
    });

    const updated = await this.repository.receiveRmaLine(lineId, qtyReceived);

    // Update RMA status if all lines received
    const lines = await this.repository.getRmaLines(rmaId);
    const allReceived = lines.every((l) => l.qtyReceived >= l.qtyExpected);
    if (allReceived && rma.status === 'AWAITING_RETURN') {
      await this.repository.updateRmaStatus(rmaId, 'RECEIVED');
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
      throw new NotFoundException('RMA line not found');
    }

    if (line.qtyReceived <= 0) {
      throw new BadRequestException('Line must be received before disposition');
    }

    // Move stock based on disposition
    const reason = disposition === 'SCRAP' ? 'SCRAP' : 'TRANSFER';
    await this.stockLedger.recordMovement({
      tenantId: rma.tenantId,
      siteId: rma.siteId,
      itemId: line.itemId,
      toBinId: dispositionBinId,
      qty: line.qtyReceived,
      reason,
      refType: 'rma',
      refId: rmaId,
      createdBy: inspectedBy,
    });

    const updated = await this.repository.setLineDisposition(
      lineId,
      disposition,
      dispositionBinId,
      inspectedBy,
      inspectionNotes,
    );

    // Update RMA status if all lines disposed
    const lines = await this.repository.getRmaLines(rmaId);
    const allDisposed = lines.every((l) => l.disposition !== 'PENDING');
    if (allDisposed) {
      await this.repository.updateRmaStatus(rmaId, 'DISPOSITION_COMPLETE');
    }

    return updated!;
  }

  async deleteRma(id: string): Promise<void> {
    const rma = await this.repository.findRmaById(id);
    if (!rma) throw new NotFoundException('RMA not found');
    if (rma.status !== 'OPEN') {
      throw new BadRequestException('Only OPEN RMAs can be deleted');
    }
    await this.repository.deleteRma(id);
  }

  // Credit Notes
  async createCreditNote(rmaId: string, createdBy?: string): Promise<CreditNoteDraft> {
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

    await this.repository.updateRmaStatus(rmaId, 'CREDIT_PENDING');

    return creditNote;
  }

  async getCreditNote(id: string): Promise<CreditNoteDraft> {
    const creditNote = await this.repository.findCreditNoteById(id);
    if (!creditNote) throw new NotFoundException('Credit note not found');
    return creditNote;
  }

  async listCreditNotes(tenantId: string, status?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findCreditNotesByTenant(tenantId, status, limit, offset),
      this.repository.countCreditNotesByTenant(tenantId, status),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async deleteCreditNote(id: string): Promise<void> {
    const creditNote = await this.repository.findCreditNoteById(id);
    if (!creditNote) throw new NotFoundException('Credit note not found');
    if (creditNote.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT credit notes can be deleted');
    }
    await this.repository.deleteCreditNote(id);
  }

  async approveCreditNote(id: string, approvedBy: string): Promise<CreditNoteDraft> {
    const creditNote = await this.repository.approveCreditNote(id, approvedBy);
    if (!creditNote) {
      throw new BadRequestException('Credit note not found or not in SUBMITTED status');
    }

    // Update RMA status
    await this.repository.updateRmaStatus(creditNote.rmaId, 'CREDIT_APPROVED');

    return creditNote;
  }
}
