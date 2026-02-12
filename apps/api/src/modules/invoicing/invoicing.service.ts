import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { InvoicingRepository, Invoice, InvoiceLine, InvoicePayment } from './invoicing.repository';

@Injectable()
export class InvoicingService {
  constructor(
    private readonly repository: InvoicingRepository,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async createFromSalesOrder(
    salesOrderId: string,
    tenantId: string,
    siteId: string,
    createdBy?: string,
  ): Promise<Invoice> {
    // Fetch the sales order
    const soResult = await this.pool.query(
      'SELECT * FROM sales_orders WHERE id = $1 AND tenant_id = $2',
      [salesOrderId, tenantId],
    );
    const so = soResult.rows[0];
    if (!so) {
      throw new NotFoundException('Sales order not found');
    }

    if (!['SHIPPED', 'DELIVERED'].includes(so.status)) {
      throw new BadRequestException(
        'Can only create invoices from shipped or delivered orders',
      );
    }

    // Fetch sales order lines
    const linesResult = await this.pool.query(
      'SELECT * FROM sales_order_lines WHERE sales_order_id = $1 ORDER BY line_no',
      [salesOrderId],
    );
    const soLines = linesResult.rows;

    // Generate invoice number
    const invoiceNo = await this.repository.generateInvoiceNo(tenantId);

    // Create the invoice
    const invoice = await this.repository.createInvoice({
      tenantId,
      siteId,
      salesOrderId,
      customerId: so.customer_id,
      invoiceNo,
      status: 'DRAFT',
      invoiceDate: new Date(),
      paymentTerms: 'NET30',
      createdBy,
    });

    // Add invoice lines from SO lines
    let subtotal = 0;
    for (const soLine of soLines) {
      const qty = parseFloat(soLine.qty_shipped) || parseFloat(soLine.qty_ordered);
      const unitPrice = parseFloat(soLine.unit_price) || 0;
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;

      await this.repository.addInvoiceLine({
        tenantId,
        invoiceId: invoice.id,
        salesOrderLineId: soLine.id,
        itemId: soLine.item_id,
        description: undefined,
        qty,
        unitPrice,
        discountPct: 0,
        taxRate: 15,
        lineTotal,
      });
    }

    // Calculate totals and update the invoice
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;

    await this.pool.query(
      'UPDATE invoices SET subtotal = $1, tax_amount = $2, total_amount = $3, updated_at = NOW() WHERE id = $4',
      [subtotal, taxAmount, totalAmount, invoice.id],
    );

    return (await this.repository.findInvoiceById(invoice.id))!;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const invoice = await this.repository.findInvoiceById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async getInvoiceWithDetails(
    id: string,
  ): Promise<Invoice & { lines: InvoiceLine[]; payments: InvoicePayment[] }> {
    const invoice = await this.getInvoice(id);
    const lines = await this.repository.getInvoiceLines(id);
    const payments = await this.repository.getPayments(id);
    return { ...invoice, lines, payments };
  }

  async listInvoices(
    tenantId: string,
    filters: { status?: string; customerId?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findInvoicesByTenant(tenantId, filters, limit, offset),
      this.repository.countByTenant(tenantId, filters),
    ]);
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

  async sendInvoice(id: string): Promise<Invoice> {
    const invoice = await this.getInvoice(id);
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be sent');
    }
    await this.repository.markSentAt(id);
    return (await this.repository.findInvoiceById(id))!;
  }

  async recordPayment(
    invoiceId: string,
    data: {
      amount: number;
      paymentDate?: Date;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
      recordedBy?: string;
    },
  ): Promise<InvoicePayment> {
    const invoice = await this.getInvoice(invoiceId);
    if (!['SENT', 'PARTIALLY_PAID'].includes(invoice.status)) {
      throw new BadRequestException(
        'Payments can only be recorded for sent or partially paid invoices',
      );
    }

    // Add the payment
    const payment = await this.repository.addPayment({
      tenantId: invoice.tenantId,
      invoiceId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      notes: data.notes,
      recordedBy: data.recordedBy,
    });

    // Update amount_paid on the invoice
    await this.repository.updateInvoiceAmounts(invoiceId);

    // Re-fetch to check updated totals
    const updated = (await this.repository.findInvoiceById(invoiceId))!;

    if (updated.amountPaid >= updated.totalAmount) {
      await this.repository.updateInvoiceStatus(invoiceId, 'PAID');
    } else {
      await this.repository.updateInvoiceStatus(invoiceId, 'PARTIALLY_PAID');
    }

    return payment;
  }

  async cancelInvoice(id: string): Promise<void> {
    const invoice = await this.getInvoice(id);
    if (!['DRAFT', 'SENT'].includes(invoice.status)) {
      throw new BadRequestException(
        'Only draft or sent invoices can be cancelled',
      );
    }
    await this.repository.updateInvoiceStatus(id, 'CANCELLED');
  }

  async voidInvoice(id: string): Promise<void> {
    const invoice = await this.getInvoice(id);
    if (!['SENT', 'PARTIALLY_PAID'].includes(invoice.status)) {
      throw new BadRequestException(
        'Only sent or partially paid invoices can be voided',
      );
    }
    await this.repository.updateInvoiceStatus(id, 'VOID');
  }

  async getStats(tenantId: string) {
    return this.repository.getInvoiceStats(tenantId);
  }
}
