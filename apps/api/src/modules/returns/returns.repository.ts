import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface Rma {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  customerId: string;
  salesOrderId: string | null;
  shipmentId: string | null;
  rmaNo: string;
  status: string;
  returnType: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RmaLine {
  id: string;
  tenantId: string;
  rmaId: string;
  salesOrderLineId: string | null;
  itemId: string;
  qtyExpected: number;
  qtyReceived: number;
  reasonCode: string;
  disposition: string;
  dispositionBinId: string | null;
  inspectionNotes: string | null;
  inspectedBy: string | null;
  inspectedAt: Date | null;
  unitCreditAmount: number | null;
  createdAt: Date;
}

export interface CreditNoteDraft {
  id: string;
  tenantId: string;
  rmaId: string;
  creditNo: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  postedAt: Date | null;
  externalRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ReturnsRepository extends BaseRepository {
  // RMA
  async createRma(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    customerId: string;
    salesOrderId?: string;
    shipmentId?: string;
    rmaNo: string;
    returnType?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<Rma> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO rmas (
        tenant_id, site_id, warehouse_id, customer_id, sales_order_id,
        shipment_id, rma_no, return_type, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        data.tenantId,
        data.siteId,
        data.warehouseId,
        data.customerId,
        data.salesOrderId || null,
        data.shipmentId || null,
        data.rmaNo,
        data.returnType || 'CUSTOMER',
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapRma(row!);
  }

  async findRmaById(id: string): Promise<Rma | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM rmas WHERE id = $1',
      [id],
    );
    return row ? this.mapRma(row) : null;
  }

  async findRmasByTenant(
    tenantId: string,
    filters: { status?: string; customerId?: string; siteId?: string },
    limit = 50,
    offset = 0,
  ): Promise<Rma[]> {
    let sql = 'SELECT * FROM rmas WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.siteId) {
      sql += ` AND site_id = $${idx++}`;
      params.push(filters.siteId);
    }
    if (filters.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.customerId) {
      sql += ` AND customer_id = $${idx++}`;
      params.push(filters.customerId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapRma);
  }

  async countRmasByTenant(
    tenantId: string,
    filters: { status?: string; customerId?: string; siteId?: string },
  ): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM rmas WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.siteId) {
      sql += ` AND site_id = $${idx++}`;
      params.push(filters.siteId);
    }
    if (filters.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.customerId) {
      sql += ` AND customer_id = $${idx++}`;
      params.push(filters.customerId);
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async updateRmaStatus(id: string, status: string): Promise<Rma | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'UPDATE rmas SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );
    return row ? this.mapRma(row) : null;
  }

  // RMA Lines
  async addRmaLine(data: {
    tenantId: string;
    rmaId: string;
    salesOrderLineId?: string;
    itemId: string;
    qtyExpected: number;
    reasonCode: string;
    unitCreditAmount?: number;
  }): Promise<RmaLine> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO rma_lines (
        tenant_id, rma_id, sales_order_line_id, item_id, qty_expected, reason_code, unit_credit_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.tenantId,
        data.rmaId,
        data.salesOrderLineId || null,
        data.itemId,
        data.qtyExpected,
        data.reasonCode,
        data.unitCreditAmount || null,
      ],
    );
    return this.mapRmaLine(row!);
  }

  async findRmaLineById(id: string): Promise<RmaLine | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM rma_lines WHERE id = $1',
      [id],
    );
    return row ? this.mapRmaLine(row) : null;
  }

  async getRmaLines(rmaId: string): Promise<RmaLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM rma_lines WHERE rma_id = $1 ORDER BY created_at',
      [rmaId],
    );
    return rows.map(this.mapRmaLine);
  }

  async receiveRmaLine(
    lineId: string,
    qtyReceived: number,
  ): Promise<RmaLine | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'UPDATE rma_lines SET qty_received = $1 WHERE id = $2 RETURNING *',
      [qtyReceived, lineId],
    );
    return row ? this.mapRmaLine(row) : null;
  }

  async setLineDisposition(
    lineId: string,
    disposition: string,
    dispositionBinId: string,
    inspectedBy: string,
    inspectionNotes?: string,
  ): Promise<RmaLine | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE rma_lines SET
        disposition = $1, disposition_bin_id = $2, inspected_by = $3,
        inspection_notes = $4, inspected_at = NOW()
       WHERE id = $5 RETURNING *`,
      [disposition, dispositionBinId, inspectedBy, inspectionNotes || null, lineId],
    );
    return row ? this.mapRmaLine(row) : null;
  }

  // Credit Notes
  async createCreditNoteDraft(data: {
    tenantId: string;
    rmaId: string;
    creditNo?: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<CreditNoteDraft> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO credit_notes_draft (
        tenant_id, rma_id, credit_no, subtotal, tax_amount, total_amount, currency, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.tenantId,
        data.rmaId,
        data.creditNo || null,
        data.subtotal,
        data.taxAmount,
        data.totalAmount,
        data.currency || 'ZAR',
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapCreditNote(row!);
  }

  async findCreditNoteById(id: string): Promise<CreditNoteDraft | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM credit_notes_draft WHERE id = $1',
      [id],
    );
    return row ? this.mapCreditNote(row) : null;
  }

  async findCreditNotesByTenant(
    tenantId: string,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<CreditNoteDraft[]> {
    let sql = 'SELECT * FROM credit_notes_draft WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapCreditNote);
  }

  async countCreditNotesByTenant(tenantId: string, status?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM credit_notes_draft WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }
    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async approveCreditNote(id: string, approvedBy: string): Promise<CreditNoteDraft | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE credit_notes_draft SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
       WHERE id = $2 AND status = 'SUBMITTED' RETURNING *`,
      [approvedBy, id],
    );
    return row ? this.mapCreditNote(row) : null;
  }

  async generateRmaNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM rmas WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `RMA-${count.toString().padStart(6, '0')}`;
  }

  async generateCreditNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM credit_notes_draft WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `CN-${count.toString().padStart(6, '0')}`;
  }

  private mapRma(row: Record<string, unknown>): Rma {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      customerId: row.customer_id as string,
      salesOrderId: row.sales_order_id as string | null,
      shipmentId: row.shipment_id as string | null,
      rmaNo: row.rma_no as string,
      status: row.status as string,
      returnType: row.return_type as string,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapRmaLine(row: Record<string, unknown>): RmaLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      rmaId: row.rma_id as string,
      salesOrderLineId: row.sales_order_line_id as string | null,
      itemId: row.item_id as string,
      qtyExpected: parseFloat(row.qty_expected as string),
      qtyReceived: parseFloat(row.qty_received as string),
      reasonCode: row.reason_code as string,
      disposition: row.disposition as string,
      dispositionBinId: row.disposition_bin_id as string | null,
      inspectionNotes: row.inspection_notes as string | null,
      inspectedBy: row.inspected_by as string | null,
      inspectedAt: row.inspected_at as Date | null,
      unitCreditAmount: row.unit_credit_amount ? parseFloat(row.unit_credit_amount as string) : null,
      createdAt: row.created_at as Date,
    };
  }

  private mapCreditNote(row: Record<string, unknown>): CreditNoteDraft {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      rmaId: row.rma_id as string,
      creditNo: row.credit_no as string | null,
      status: row.status as string,
      subtotal: parseFloat(row.subtotal as string) || 0,
      taxAmount: parseFloat(row.tax_amount as string) || 0,
      totalAmount: parseFloat(row.total_amount as string) || 0,
      currency: row.currency as string,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at as Date | null,
      postedAt: row.posted_at as Date | null,
      externalRef: row.external_ref as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
