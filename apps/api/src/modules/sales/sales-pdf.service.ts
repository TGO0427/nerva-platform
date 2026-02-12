import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { SalesRepository } from './sales.repository';
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
export class SalesPdfService {
  constructor(
    private readonly repository: SalesRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(orderId: string, tenantId: string): Promise<Buffer> {
    const order = await this.repository.findOrderById(orderId);
    if (!order) throw new NotFoundException('Sales order not found');

    const lines = await this.repository.getOrderLines(orderId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Fetch customer details
    const customer = await this.getCustomer(order.customerId);

    // Fetch item details for each line (SKU + description)
    const itemIds = [...new Set(lines.map((l) => l.itemId))];
    const items = await this.getItems(itemIds);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title - show TAX INVOICE if shipped/delivered
    const isInvoice = ['SHIPPED', 'DELIVERED'].includes(order.status);
    y = renderDocumentTitle(doc, isInvoice ? 'TAX INVOICE' : 'SALES ORDER', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'Order No', value: order.orderNo },
        { label: 'Date', value: formatDate(order.createdAt) },
        { label: 'Requested Ship Date', value: formatDate(order.requestedShipDate) },
      ],
      [
        { label: 'Priority', value: String(order.priority) },
        { label: 'Status', value: order.status },
      ],
      y,
    );

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

    // Ship To address (from order or customer shipping address)
    const shipToName = customer?.name || 'Customer';
    const shipToLine1 = order.shippingAddressLine1 || customer?.shipping_address_line1 || undefined;
    const shipToCity = order.shippingCity || customer?.shipping_city || undefined;

    if (shipToLine1 || shipToCity) {
      y = renderAddressBlock(
        doc,
        'Ship To:',
        {
          name: shipToName,
          addressLine1: shipToLine1,
          city: shipToCity,
        },
        300,
        y - (customer ? 60 : 0),
        220,
      );
    }

    y += 10;

    // Line items table
    y = renderTable(doc, {
      columns: [
        { key: 'lineNo', header: '#', width: 30, align: 'center' },
        { key: 'sku', header: 'SKU', width: 80 },
        { key: 'description', header: 'Description', width: 200 },
        { key: 'qty', header: 'Qty', width: 50, align: 'right' },
        { key: 'unitPrice', header: 'Unit Price', width: 75, align: 'right' },
        { key: 'lineTotal', header: 'Line Total', width: 80, align: 'right' },
      ],
      rows: lines.map((line, i) => {
        const item = items.get(line.itemId);
        const unitPrice = line.unitPrice || 0;
        const lineTotal = unitPrice * line.qtyOrdered;
        return {
          lineNo: String(i + 1),
          sku: item?.sku || '-',
          description: (item?.description || '-').substring(0, 40),
          qty: String(line.qtyOrdered),
          unitPrice: formatCurrency(unitPrice),
          lineTotal: formatCurrency(lineTotal),
        };
      }),
      startY: y,
    });

    // Totals
    const subtotal = lines.reduce((sum, l) => {
      const unitPrice = l.unitPrice || 0;
      return sum + unitPrice * l.qtyOrdered;
    }, 0);
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;

    y = renderTotals(doc, [
      { label: 'Subtotal', value: formatCurrency(subtotal) },
      { label: 'VAT (15%)', value: formatCurrency(taxAmount) },
      { label: 'Total', value: formatCurrency(totalAmount), bold: true },
    ], y);

    // Notes
    y = renderNotes(doc, order.notes, y);

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
