import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface Invoice {
  id: string;
  tenantId: string;
  siteId: string;
  salesOrderId: string | null;
  customerId: string;
  invoiceNo: string;
  status: string;
  invoiceDate: Date;
  dueDate: Date | null;
  paymentTerms: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  notes: string | null;
  createdBy: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // joined fields
  customerName?: string;
  orderNo?: string;
}

export interface InvoiceLine {
  id: string;
  tenantId: string;
  invoiceId: string;
  salesOrderLineId: string | null;
  itemId: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
  createdAt: Date;
  // joined
  sku?: string;
  itemDescription?: string;
}

export interface InvoicePayment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: Date;
  // joined
  recordedByName?: string;
}

@Injectable()
export class InvoicingRepository extends BaseRepository {
  async generateInvoiceNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `INV-${count.toString().padStart(6, '0')}`;
  }

  async createInvoice(data: {
    tenantId: string;
    siteId: string;
    salesOrderId?: string;
    customerId: string;
    invoiceNo: string;
    status?: string;
    invoiceDate?: Date;
    dueDate?: Date;
    paymentTerms?: string;
    subtotal?: number;
    taxAmount?: number;
    totalAmount?: number;
    amountPaid?: number;
    currency?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<Invoice> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO invoices (
        tenant_id, site_id, sales_order_id, customer_id, invoice_no, status,
        invoice_date, due_date, payment_terms, subtotal, tax_amount, total_amount,
        amount_paid, currency, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.tenantId,
        data.siteId,
        data.salesOrderId || null,
        data.customerId,
        data.invoiceNo,
        data.status || 'DRAFT',
        data.invoiceDate || new Date(),
        data.dueDate || null,
        data.paymentTerms || null,
        data.subtotal || 0,
        data.taxAmount || 0,
        data.totalAmount || 0,
        data.amountPaid || 0,
        data.currency || 'ZAR',
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapInvoice(row!);
  }

  async findInvoiceById(id: string): Promise<Invoice | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT i.*, c.name as customer_name, so.order_no
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN sales_orders so ON so.id = i.sales_order_id
       WHERE i.id = $1`,
      [id],
    );
    return row ? this.mapInvoice(row) : null;
  }

  async findInvoicesByTenant(
    tenantId: string,
    filters: { status?: string; customerId?: string },
    limit = 50,
    offset = 0,
  ): Promise<Invoice[]> {
    let sql = `SELECT i.*, c.name as customer_name, so.order_no
               FROM invoices i
               LEFT JOIN customers c ON c.id = i.customer_id
               LEFT JOIN sales_orders so ON so.id = i.sales_order_id
               WHERE i.tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND i.status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.customerId) {
      sql += ` AND i.customer_id = $${idx++}`;
      params.push(filters.customerId);
    }

    sql += ` ORDER BY i.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapInvoice);
  }

  async countByTenant(
    tenantId: string,
    filters: { status?: string; customerId?: string },
  ): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let idx = 2;

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

  async updateInvoiceStatus(id: string, status: string): Promise<void> {
    await this.execute(
      'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id],
    );
  }

  async updateInvoiceAmounts(invoiceId: string): Promise<void> {
    await this.execute(
      `UPDATE invoices SET amount_paid = (
        SELECT COALESCE(SUM(amount), 0) FROM invoice_payments WHERE invoice_id = $1
      ), updated_at = NOW() WHERE id = $1`,
      [invoiceId],
    );
  }

  async markSentAt(id: string): Promise<void> {
    await this.execute(
      "UPDATE invoices SET sent_at = NOW(), status = 'SENT', updated_at = NOW() WHERE id = $1",
      [id],
    );
  }

  async addInvoiceLine(data: {
    tenantId: string;
    invoiceId: string;
    salesOrderLineId?: string;
    itemId: string;
    description?: string;
    qty: number;
    unitPrice: number;
    discountPct?: number;
    taxRate?: number;
    lineTotal: number;
  }): Promise<InvoiceLine> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO invoice_lines (
        tenant_id, invoice_id, sales_order_line_id, item_id, description,
        qty, unit_price, discount_pct, tax_rate, line_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.tenantId,
        data.invoiceId,
        data.salesOrderLineId || null,
        data.itemId,
        data.description || null,
        data.qty,
        data.unitPrice,
        data.discountPct || 0,
        data.taxRate || 0,
        data.lineTotal,
      ],
    );
    return this.mapInvoiceLine(row!);
  }

  async getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT il.*, i.sku, i.description as item_description
       FROM invoice_lines il
       LEFT JOIN items i ON i.id = il.item_id
       WHERE il.invoice_id = $1
       ORDER BY il.created_at`,
      [invoiceId],
    );
    return rows.map(this.mapInvoiceLine);
  }

  async addPayment(data: {
    tenantId: string;
    invoiceId: string;
    amount: number;
    paymentDate?: Date;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
    recordedBy?: string;
  }): Promise<InvoicePayment> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO invoice_payments (
        tenant_id, invoice_id, amount, payment_date, payment_method,
        reference, notes, recorded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.tenantId,
        data.invoiceId,
        data.amount,
        data.paymentDate || new Date(),
        data.paymentMethod || null,
        data.reference || null,
        data.notes || null,
        data.recordedBy || null,
      ],
    );
    return this.mapPayment(row!);
  }

  async getPayments(invoiceId: string): Promise<InvoicePayment[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT ip.*, u.display_name as recorded_by_name
       FROM invoice_payments ip
       LEFT JOIN users u ON u.id = ip.recorded_by
       WHERE ip.invoice_id = $1
       ORDER BY ip.payment_date DESC`,
      [invoiceId],
    );
    return rows.map(this.mapPayment);
  }

  async getInvoiceStats(tenantId: string): Promise<{
    outstandingCount: number;
    outstandingAmount: number;
    overdueCount: number;
    overdueAmount: number;
    paidThisMonth: number;
    totalThisMonth: number;
  }> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('SENT', 'PARTIALLY_PAID')) as outstanding_count,
        COALESCE(SUM(total_amount - amount_paid) FILTER (WHERE status IN ('SENT', 'PARTIALLY_PAID')), 0) as outstanding_amount,
        COUNT(*) FILTER (WHERE status IN ('SENT', 'PARTIALLY_PAID') AND due_date < NOW()) as overdue_count,
        COALESCE(SUM(total_amount - amount_paid) FILTER (WHERE status IN ('SENT', 'PARTIALLY_PAID') AND due_date < NOW()), 0) as overdue_amount,
        COALESCE(SUM(amount_paid) FILTER (WHERE status = 'PAID' AND updated_at >= date_trunc('month', NOW())), 0) as paid_this_month,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as total_this_month
       FROM invoices
       WHERE tenant_id = $1`,
      [tenantId],
    );

    return {
      outstandingCount: parseInt((row?.outstanding_count as string) || '0', 10),
      outstandingAmount: parseFloat((row?.outstanding_amount as string) || '0'),
      overdueCount: parseInt((row?.overdue_count as string) || '0', 10),
      overdueAmount: parseFloat((row?.overdue_amount as string) || '0'),
      paidThisMonth: parseFloat((row?.paid_this_month as string) || '0'),
      totalThisMonth: parseInt((row?.total_this_month as string) || '0', 10),
    };
  }

  private mapInvoice(row: Record<string, unknown>): Invoice {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      salesOrderId: row.sales_order_id as string | null,
      customerId: row.customer_id as string,
      invoiceNo: row.invoice_no as string,
      status: row.status as string,
      invoiceDate: row.invoice_date as Date,
      dueDate: row.due_date as Date | null,
      paymentTerms: row.payment_terms as string | null,
      subtotal: parseFloat((row.subtotal as string) || '0'),
      taxAmount: parseFloat((row.tax_amount as string) || '0'),
      totalAmount: parseFloat((row.total_amount as string) || '0'),
      amountPaid: parseFloat((row.amount_paid as string) || '0'),
      currency: row.currency as string,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      sentAt: row.sent_at as Date | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      customerName: row.customer_name as string | undefined,
      orderNo: row.order_no as string | undefined,
    };
  }

  private mapInvoiceLine(row: Record<string, unknown>): InvoiceLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      invoiceId: row.invoice_id as string,
      salesOrderLineId: row.sales_order_line_id as string | null,
      itemId: row.item_id as string,
      description: row.description as string | null,
      qty: parseFloat((row.qty as string) || '0'),
      unitPrice: parseFloat((row.unit_price as string) || '0'),
      discountPct: parseFloat((row.discount_pct as string) || '0'),
      taxRate: parseFloat((row.tax_rate as string) || '0'),
      lineTotal: parseFloat((row.line_total as string) || '0'),
      createdAt: row.created_at as Date,
      sku: row.sku as string | undefined,
      itemDescription: row.item_description as string | undefined,
    };
  }

  private mapPayment(row: Record<string, unknown>): InvoicePayment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      invoiceId: row.invoice_id as string,
      amount: parseFloat((row.amount as string) || '0'),
      paymentDate: row.payment_date as Date,
      paymentMethod: row.payment_method as string | null,
      reference: row.reference as string | null,
      notes: row.notes as string | null,
      recordedBy: row.recorded_by as string | null,
      createdAt: row.created_at as Date,
      recordedByName: row.recorded_by_name as string | undefined,
    };
  }
}
