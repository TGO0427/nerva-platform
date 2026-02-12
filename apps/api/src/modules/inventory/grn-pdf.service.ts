import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { InventoryRepository } from './inventory.repository';
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
export class GrnPdfService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(grnId: string, tenantId: string): Promise<Buffer> {
    const grn = await this.repository.findGrnById(grnId);
    if (!grn) throw new NotFoundException('GRN not found');

    const lines = await this.repository.getGrnLines(grnId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Fetch supplier details if available
    const supplier = grn.supplierId ? await this.getSupplier(grn.supplierId) : null;

    // Fetch PO reference number if available
    const poNo = grn.purchaseOrderId ? await this.getPoNo(grn.purchaseOrderId) : null;

    // Fetch item details for each line (SKU + description)
    const itemIds = [...new Set(lines.map((l) => l.itemId))];
    const items = await this.getItems(itemIds);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'GOODS RECEIVED NOTE', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'GRN No', value: grn.grnNo },
        { label: 'Date', value: formatDate(grn.receivedAt || grn.createdAt) },
      ],
      [
        { label: 'PO Reference', value: poNo || '-' },
        { label: 'Status', value: grn.status },
      ],
      y,
    );

    y += 5;

    // Supplier address
    if (supplier) {
      y = renderAddressBlock(
        doc,
        'Supplier:',
        {
          name: supplier.name,
          contactPerson: supplier.contact_person || undefined,
          addressLine1: supplier.address_line1 || undefined,
          addressLine2: supplier.address_line2 || undefined,
          city: supplier.city || undefined,
          postalCode: supplier.postal_code || undefined,
          country: supplier.country || undefined,
          vatNo: supplier.vat_no || undefined,
          phone: supplier.phone || undefined,
          email: supplier.email || undefined,
        },
        40,
        y,
      );
    }

    y += 10;

    // Line items table
    y = renderTable(doc, {
      columns: [
        { key: 'sku', header: 'SKU', width: 90 },
        { key: 'description', header: 'Description', width: 190 },
        { key: 'qtyExpected', header: 'Expected Qty', width: 75, align: 'right' },
        { key: 'qtyReceived', header: 'Received Qty', width: 75, align: 'right' },
        { key: 'batchNo', header: 'Batch #', width: 85 },
      ],
      rows: lines.map((line) => {
        const item = items.get(line.itemId);
        return {
          sku: item?.sku || '-',
          description: (item?.description || '-').substring(0, 40),
          qtyExpected: String(line.qtyExpected),
          qtyReceived: String(line.qtyReceived),
          batchNo: line.batchNo || '-',
        };
      }),
      startY: y,
    });

    // Notes
    y = renderNotes(doc, grn.notes, y);

    // Signature
    renderSignatureBlock(doc, y, 'Received By', 'Date');

    doc.end();
    return bufferPromise;
  }

  private async getSupplier(supplierId: string): Promise<Record<string, any> | null> {
    const result = await this.pool.query(
      `SELECT name, contact_person, phone, email, vat_no,
              address_line1, address_line2, city, postal_code, country
       FROM suppliers WHERE id = $1`,
      [supplierId],
    );
    return result.rows[0] || null;
  }

  private async getPoNo(purchaseOrderId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT po_no FROM purchase_orders WHERE id = $1',
      [purchaseOrderId],
    );
    return result.rows[0]?.po_no || null;
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
