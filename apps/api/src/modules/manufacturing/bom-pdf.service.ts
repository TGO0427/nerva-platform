import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { BomRepository } from './repositories/bom.repository';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';
import {
  createPdfDocument,
  pdfToBuffer,
  renderCompanyHeader,
  renderDocumentTitle,
  renderDocumentMeta,
  renderTable,
  renderNotes,
  renderSignatureBlock,
  formatDate,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class BomPdfService {
  constructor(
    private readonly repository: BomRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(bomId: string, tenantId: string): Promise<Buffer> {
    const bom = await this.repository.findHeaderById(bomId);
    if (!bom) throw new NotFoundException('Bill of Materials not found');

    const lines = await this.repository.getLines(bomId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Get parent item details
    const itemResult = await this.pool.query(
      'SELECT sku, description FROM items WHERE id = $1',
      [bom.itemId],
    );
    const parentItem = itemResult.rows[0] || { sku: '-', description: '-' };

    // Get approved by name if applicable
    let approvedByName: string | null = null;
    if (bom.approvedBy) {
      const userResult = await this.pool.query(
        'SELECT display_name FROM users WHERE id = $1',
        [bom.approvedBy],
      );
      approvedByName = userResult.rows[0]?.display_name || null;
    }

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'BILL OF MATERIALS', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'Version', value: String(bom.version) },
        { label: 'Revision', value: bom.revision },
        { label: 'Status', value: bom.status },
      ],
      [
        { label: 'Base Qty', value: String(bom.baseQty) },
        { label: 'UOM', value: bom.uom },
      ],
      y,
    );

    y += 5;

    // Product info
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
      .text('Product: ', 40, y, { continued: true });
    doc.font('Helvetica').text(`${parentItem.sku} - ${parentItem.description}`);
    y += 18;

    // Effective dates
    doc.font('Helvetica-Bold').text('Effective From: ', 40, y, { continued: true });
    doc.font('Helvetica').text(formatDate(bom.effectiveFrom));
    doc.font('Helvetica-Bold').text('Effective To: ', 340, y, { continued: true });
    doc.font('Helvetica').text(formatDate(bom.effectiveTo));
    y += 20;

    // Components table
    y = renderTable(doc, {
      columns: [
        { key: 'lineNo', header: 'Line #', width: 40, align: 'center' },
        { key: 'sku', header: 'SKU', width: 85 },
        { key: 'description', header: 'Description', width: 170 },
        { key: 'qtyPer', header: 'Qty Per', width: 55, align: 'right' },
        { key: 'uom', header: 'UOM', width: 45, align: 'center' },
        { key: 'scrapPct', header: 'Scrap %', width: 55, align: 'right' },
        { key: 'critical', header: 'Critical', width: 65, align: 'center' },
      ],
      rows: lines.map((line) => ({
        lineNo: String(line.lineNo),
        sku: line.itemSku || '-',
        description: (line.itemDescription || '-').substring(0, 35),
        qtyPer: String(line.qtyPer),
        uom: line.uom,
        scrapPct: String(line.scrapPct),
        critical: line.isCritical ? 'Yes' : 'No',
      })),
      startY: y,
    });

    // Notes
    y = renderNotes(doc, bom.notes, y);

    // Approval info
    if (approvedByName && bom.approvedAt) {
      if (y > 700) {
        doc.addPage();
        y = 40;
      }
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Approval:', 40, y);
      y += 14;
      doc.font('Helvetica');
      doc.text(`Approved by: ${approvedByName}`, 40, y);
      y += 12;
      doc.text(`Approved on: ${formatDate(bom.approvedAt)}`, 40, y);
      y += 18;
    }

    // Signature block
    renderSignatureBlock(doc, y, 'Authorized Signatory', 'Date');

    doc.end();
    return bufferPromise;
  }
}
