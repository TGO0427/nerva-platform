import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { ReturnsRepository } from './returns.repository';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';
import {
  createPdfDocument,
  pdfToBuffer,
  renderCompanyHeader,
  renderDocumentTitle,
  renderDocumentMeta,
  renderAddressBlock,
  renderTable,
  renderNotes,
  renderSignatureBlock,
  formatDate,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class RmaPdfService {
  constructor(
    private readonly repository: ReturnsRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(rmaId: string, tenantId: string): Promise<Buffer> {
    const rma = await this.repository.findRmaById(rmaId);
    if (!rma) throw new NotFoundException('RMA not found');

    const lines = await this.repository.getRmaLines(rmaId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Get customer details
    const customerResult = await this.pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [rma.customerId],
    );
    const customer = customerResult.rows[0] || null;

    // Get sales order number if linked
    let salesOrderNo: string | null = null;
    if (rma.salesOrderId) {
      const soResult = await this.pool.query(
        'SELECT order_no FROM sales_orders WHERE id = $1',
        [rma.salesOrderId],
      );
      salesOrderNo = soResult.rows[0]?.order_no || null;
    }

    // Get item details for each line
    const itemIds = [...new Set(lines.map((l) => l.itemId))];
    const itemMap: Record<string, { sku: string; description: string }> = {};
    if (itemIds.length > 0) {
      const itemResult = await this.pool.query(
        `SELECT id, sku, description FROM items WHERE id = ANY($1)`,
        [itemIds],
      );
      for (const row of itemResult.rows) {
        itemMap[row.id] = { sku: row.sku, description: row.description };
      }
    }

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'RETURN MERCHANDISE AUTHORIZATION', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'RMA Number', value: rma.rmaNo },
        { label: 'Date', value: formatDate(rma.createdAt) },
        { label: 'Return Type', value: rma.returnType },
      ],
      [
        { label: 'Status', value: rma.status },
      ],
      y,
    );

    y += 5;

    // Customer address block
    if (customer) {
      y = renderAddressBlock(
        doc,
        'Customer:',
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

    y += 10;

    // Original order reference
    if (salesOrderNo) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('Original Order: ', 40, y, { continued: true });
      doc.font('Helvetica').text(salesOrderNo);
      y += 18;
    }

    // Line items table
    y = renderTable(doc, {
      columns: [
        { key: 'sku', header: 'SKU', width: 80 },
        { key: 'description', header: 'Description', width: 145 },
        { key: 'qtyExpected', header: 'Qty Requested', width: 75, align: 'right' },
        { key: 'qtyReceived', header: 'Qty Received', width: 70, align: 'right' },
        { key: 'reason', header: 'Reason', width: 70 },
        { key: 'disposition', header: 'Disposition', width: 75 },
      ],
      rows: lines.map((line) => {
        const item = itemMap[line.itemId];
        return {
          sku: item?.sku || '-',
          description: (item?.description || '-').substring(0, 30),
          qtyExpected: String(line.qtyExpected),
          qtyReceived: String(line.qtyReceived),
          reason: line.reasonCode,
          disposition: line.disposition,
        };
      }),
      startY: y,
    });

    // Notes
    y = renderNotes(doc, rma.notes, y);

    // Return instructions
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Return Instructions:', 40, y);
    y += 14;
    doc.font('Helvetica').text(
      'Please return goods to our warehouse address shown above.',
      40,
      y,
      { width: 515 },
    );
    y += 20;

    // Signature block
    renderSignatureBlock(doc, y, 'Authorized Signatory', 'Date');

    doc.end();
    return bufferPromise;
  }
}
