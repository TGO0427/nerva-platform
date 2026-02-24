import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { WorkOrderRepository } from './repositories/work-order.repository';
import { BomRepository } from './repositories/bom.repository';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';
import {
  createPdfDocument,
  pdfToBuffer,
  renderCompanyHeader,
  renderDocumentTitle,
  renderTable,
  renderSignatureBlock,
  formatDate,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class BatchSheetPdfService {
  constructor(
    private readonly workOrderRepo: WorkOrderRepository,
    private readonly bomRepo: BomRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(workOrderId: string, tenantId: string, prefill = false): Promise<Buffer> {
    const wo = await this.workOrderRepo.findById(workOrderId);
    if (!wo) throw new NotFoundException('Work order not found');

    const profile = await this.tenantProfile.getProfile(tenantId);

    // Get item details
    const itemResult = await this.pool.query(
      'SELECT sku, description FROM items WHERE id = $1',
      [wo.itemId],
    );
    const item = itemResult.rows[0] || { sku: '-', description: '-' };

    // Get BOM header + lines if BOM is linked
    let bomHeader: { version: number; revision: string; baseQty: number } | null = null;
    let ingredientLines: Array<{ lineNo: number; itemSku: string; itemDescription: string; qtyPer: number; scaledQty: number; bomPct: number }> = [];
    let packagingLines: Array<{ lineNo: number; itemSku: string; itemDescription: string; qtyPer: number; scaledQty: number; bomPct: number }> = [];

    if (wo.bomHeaderId) {
      const header = await this.bomRepo.findHeaderById(wo.bomHeaderId);
      if (header) {
        bomHeader = { version: header.version, revision: header.revision, baseQty: header.baseQty };
        const allLines = await this.bomRepo.getLines(wo.bomHeaderId);
        const scaleFactor = wo.qtyOrdered / (header.baseQty || 1);

        const ingredients = allLines.filter(l => l.category === 'INGREDIENT' || !l.category);
        const packaging = allLines.filter(l => l.category === 'PACKAGING');

        const ingredientTotal = ingredients.reduce((sum, l) => sum + l.qtyPer, 0);
        const packagingTotal = packaging.reduce((sum, l) => sum + l.qtyPer, 0);

        ingredientLines = ingredients.map(l => ({
          lineNo: l.lineNo,
          itemSku: (l as any).itemSku || '-',
          itemDescription: (l as any).itemDescription || '-',
          qtyPer: l.qtyPer,
          scaledQty: l.qtyPer * scaleFactor,
          bomPct: ingredientTotal > 0 ? (l.qtyPer / ingredientTotal) * 100 : 0,
        }));

        packagingLines = packaging.map(l => ({
          lineNo: l.lineNo,
          itemSku: (l as any).itemSku || '-',
          itemDescription: (l as any).itemDescription || '-',
          qtyPer: l.qtyPer,
          scaledQty: l.qtyPer * scaleFactor,
          bomPct: packagingTotal > 0 ? (l.qtyPer / packagingTotal) * 100 : 0,
        }));
      }
    }

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Title
    y = renderDocumentTitle(doc, 'PRODUCTION BATCH SHEET', y);

    // Meta block
    const MARGIN = 40;
    doc.fontSize(9).font('Helvetica');

    const metaFields = [
      { label: 'Work Ticket No', value: wo.workOrderNo },
      { label: 'FG Code', value: item.sku },
      { label: 'Prod Size (kg)', value: String(wo.qtyOrdered) },
      { label: 'Product', value: item.description },
      { label: 'BOM Version', value: bomHeader ? `V${bomHeader.version} Rev ${bomHeader.revision}` : '-' },
      { label: 'Batch No', value: wo.batchNo || '________________' },
      { label: 'Print Date', value: formatDate(new Date()) },
    ];

    // Render meta in two columns
    const leftMeta = metaFields.slice(0, 4);
    const rightMeta = metaFields.slice(4);

    let leftY = y;
    for (const field of leftMeta) {
      doc.font('Helvetica-Bold').fillColor('#000000').text(`${field.label}: `, MARGIN, leftY, { continued: true });
      doc.font('Helvetica').text(field.value);
      leftY += 14;
    }

    let rightY = y;
    const rightX = 340;
    for (const field of rightMeta) {
      doc.font('Helvetica-Bold').text(`${field.label}: `, rightX, rightY, { continued: true, width: 200 });
      doc.font('Helvetica').text(field.value);
      rightY += 14;
    }

    y = Math.max(leftY, rightY) + 10;

    // Ingredients table
    if (ingredientLines.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('INGREDIENTS', MARGIN, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'lineNo', header: 'Line', width: 40, align: 'center' },
          { key: 'code', header: 'Code', width: 80 },
          { key: 'description', header: 'Description', width: 140 },
          { key: 'trfQty', header: 'Trf Qty', width: 65, align: 'right' },
          { key: 'bomPct', header: 'BOM %', width: 55, align: 'right' },
          { key: 'actualQty', header: 'Actual Qty', width: 70, align: 'right' },
          { key: 'batchNo', header: 'Batch No', width: 65 },
        ],
        rows: ingredientLines.map(l => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 28),
          trfQty: l.scaledQty.toFixed(2),
          bomPct: l.bomPct.toFixed(1),
          actualQty: prefill ? l.scaledQty.toFixed(2) : '',
          batchNo: '',
        })),
        startY: y,
      });

      y += 5;
    }

    // Packaging table
    if (packagingLines.length > 0) {
      if (y > 620) {
        doc.addPage();
        y = MARGIN;
      }

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('PACKAGING', MARGIN, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'lineNo', header: 'Line', width: 40, align: 'center' },
          { key: 'code', header: 'Code', width: 80 },
          { key: 'description', header: 'Description', width: 140 },
          { key: 'trfQty', header: 'Trf Qty', width: 65, align: 'right' },
          { key: 'bomPct', header: 'BOM %', width: 55, align: 'right' },
          { key: 'actualQty', header: 'Actual Qty', width: 70, align: 'right' },
          { key: 'batchNo', header: 'Batch No', width: 65 },
        ],
        rows: packagingLines.map(l => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 28),
          trfQty: l.scaledQty.toFixed(2),
          bomPct: l.bomPct.toFixed(1),
          actualQty: prefill ? l.scaledQty.toFixed(2) : '',
          batchNo: '',
        })),
        startY: y,
      });

      y += 5;
    }

    // Production tracking section
    if (y > 660) {
      doc.addPage();
      y = MARGIN;
    }

    y += 10;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('PRODUCTION TRACKING', MARGIN, y);
    y += 18;

    doc.fontSize(9).font('Helvetica');
    doc.text('Start Time: ________________________________', MARGIN, y);
    doc.text('End Time: ________________________________', 310, y);
    y += 20;

    doc.text('Pallet Weight: ________________________________', MARGIN, y);
    y += 30;

    // Signature blocks
    y = renderSignatureBlock(doc, y, 'Prepared By', 'Date');
    y = renderSignatureBlock(doc, y, 'Departmental Signature', 'Date');

    // Print timestamp footer
    doc.fontSize(7).font('Helvetica').fillColor('#999999')
      .text(`Printed: ${new Date().toLocaleString('en-ZA')}`, MARGIN, 780, { width: 515, align: 'right' });

    doc.end();
    return bufferPromise;
  }
}
