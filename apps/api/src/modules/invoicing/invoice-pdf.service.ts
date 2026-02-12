import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { InvoicingRepository } from './invoicing.repository';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';
import {
  createPdfDocument,
  pdfToBuffer,
  renderCompanyHeader,
  renderDocumentTitle,
  renderDocumentMeta,
  renderAddressBlock,
  renderTable,
  renderTotals,
  renderNotes,
  renderBankDetails,
  renderSignatureBlock,
  formatCurrency,
  formatDate,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly repository: InvoicingRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(invoiceId: string, tenantId: string): Promise<Buffer> {
    const invoice = await this.repository.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const lines = await this.repository.getInvoiceLines(invoiceId);
    const payments = await this.repository.getPayments(invoiceId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Fetch customer details
    const customer = await this.getCustomer(invoice.customerId);

    // Fetch item details for each line (SKU + description)
    const itemIds = [...new Set(lines.map((l) => l.itemId))];
    const items = await this.getItems(itemIds);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'TAX INVOICE', y);

    // Meta info
    const leftMeta = [
      { label: 'Invoice No', value: invoice.invoiceNo },
      { label: 'Invoice Date', value: formatDate(invoice.invoiceDate) },
      { label: 'Due Date', value: formatDate(invoice.dueDate) },
      { label: 'Payment Terms', value: invoice.paymentTerms || '-' },
    ];

    const rightMeta: { label: string; value: string }[] = [
      { label: 'Status', value: invoice.status },
    ];
    if (invoice.salesOrderId) {
      rightMeta.push({ label: 'Order Ref', value: invoice.orderNo || invoice.salesOrderId });
    }

    y = renderDocumentMeta(doc, leftMeta, rightMeta, y);

    y += 5;

    // Bill To address
    if (customer) {
      y = renderAddressBlock(
        doc,
        'Bill To:',
        {
          name: customer.name,
          contactPerson: customer.contact_person || undefined,
          addressLine1: customer.billing_address_line1 || undefined,
          addressLine2: customer.billing_address_line2 || undefined,
          city: customer.billing_city || undefined,
          postalCode: customer.billing_postal_code || undefined,
          country: customer.billing_country || undefined,
          vatNo: customer.vat_no || undefined,
          phone: customer.phone || undefined,
          email: customer.email || undefined,
        },
        40,
        y,
      );
    }

    // Ship To address
    if (customer) {
      const shipToLine1 = customer.shipping_address_line1 || undefined;
      const shipToCity = customer.shipping_city || undefined;

      if (shipToLine1 || shipToCity) {
        y = renderAddressBlock(
          doc,
          'Ship To:',
          {
            name: customer.name,
            addressLine1: shipToLine1,
            city: shipToCity,
          },
          300,
          y - (customer ? 60 : 0),
          220,
        );
      }
    }

    y += 10;

    // Line items table
    y = renderTable(doc, {
      columns: [
        { key: 'lineNo', header: '#', width: 30, align: 'center' },
        { key: 'sku', header: 'SKU', width: 80 },
        { key: 'description', header: 'Description', width: 180 },
        { key: 'qty', header: 'Qty', width: 50, align: 'right' },
        { key: 'unitPrice', header: 'Unit Price', width: 70, align: 'right' },
        { key: 'discountPct', header: 'Disc %', width: 45, align: 'right' },
        { key: 'lineTotal', header: 'Line Total', width: 80, align: 'right' },
      ],
      rows: lines.map((line, i) => {
        const item = items.get(line.itemId);
        return {
          lineNo: String(i + 1),
          sku: item?.sku || line.sku || '-',
          description: (item?.description || line.itemDescription || line.description || '-').substring(0, 40),
          qty: String(line.qty),
          unitPrice: formatCurrency(line.unitPrice),
          discountPct: line.discountPct > 0 ? `${line.discountPct}%` : '-',
          lineTotal: formatCurrency(line.lineTotal),
        };
      }),
      startY: y,
    });

    // Totals
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = invoice.totalAmount - amountPaid;

    y = renderTotals(doc, [
      { label: 'Subtotal', value: formatCurrency(invoice.subtotal) },
      { label: 'VAT (15%)', value: formatCurrency(invoice.taxAmount) },
      { label: 'Total', value: formatCurrency(invoice.totalAmount), bold: true },
      { label: 'Amount Paid', value: formatCurrency(amountPaid) },
      { label: 'Balance Due', value: formatCurrency(balanceDue), bold: true },
    ], y);

    // Notes
    y = renderNotes(doc, invoice.notes, y);

    // Bank details
    y = renderBankDetails(doc, profile, y);

    // Signature
    renderSignatureBlock(doc, y, 'Authorized Signatory', 'Date');

    doc.end();
    return bufferPromise;
  }

  private async getCustomer(customerId: string): Promise<Record<string, any> | null> {
    const result = await this.pool.query(
      `SELECT name, contact_person, phone, email, vat_no,
              billing_address_line1, billing_address_line2, billing_city,
              billing_postal_code, billing_country,
              shipping_address_line1, shipping_city
       FROM customers WHERE id = $1`,
      [customerId],
    );
    return result.rows[0] || null;
  }

  private async getItems(itemIds: string[]): Promise<Map<string, { sku: string; description: string }>> {
    if (itemIds.length === 0) return new Map();
    const placeholders = itemIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.pool.query(
      `SELECT id, sku, description FROM items WHERE id IN (${placeholders})`,
      itemIds,
    );
    const map = new Map<string, { sku: string; description: string }>();
    for (const row of result.rows) {
      map.set(row.id, { sku: row.sku, description: row.description });
    }
    return map;
  }
}
