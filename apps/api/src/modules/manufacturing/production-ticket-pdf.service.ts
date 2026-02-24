import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { WorkOrderRepository } from './repositories/work-order.repository';
import { BomRepository } from './repositories/bom.repository';
import { ProductionDataRepository } from './repositories/production-data.repository';
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
export class ProductionTicketPdfService {
  constructor(
    private readonly workOrderRepo: WorkOrderRepository,
    private readonly bomRepo: BomRepository,
    private readonly productionDataRepo: ProductionDataRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(workOrderId: string, tenantId: string): Promise<Buffer> {
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
    let ingredientLines: Array<{ lineNo: number; itemSku: string; itemDescription: string; scaledQty: number; bomPct: number; scrapPct: number }> = [];
    let packagingLines: Array<{ lineNo: number; itemSku: string; itemDescription: string; scaledQty: number; bomPct: number; scrapPct: number }> = [];

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

        ingredientLines = ingredients.map(l => {
          const rawQty = l.qtyPer * scaleFactor * (1 + l.scrapPct / 100);
          return {
            lineNo: l.lineNo,
            itemSku: (l as any).itemSku || '-',
            itemDescription: (l as any).itemDescription || '-',
            scaledQty: Math.round(rawQty * 1000) / 1000,
            bomPct: ingredientTotal > 0 ? (l.qtyPer / ingredientTotal) * 100 : 0,
            scrapPct: l.scrapPct,
          };
        });

        packagingLines = packaging.map(l => {
          const rawQty = l.qtyPer * scaleFactor * (1 + l.scrapPct / 100);
          return {
            lineNo: l.lineNo,
            itemSku: (l as any).itemSku || '-',
            itemDescription: (l as any).itemDescription || '-',
            scaledQty: Math.ceil(rawQty),
            bomPct: packagingTotal > 0 ? (l.qtyPer / packagingTotal) * 100 : 0,
            scrapPct: l.scrapPct,
          };
        });
      }
    }

    // Get checks and process data
    const [checks, process] = await Promise.all([
      this.productionDataRepo.findChecksByWorkOrder(workOrderId),
      this.productionDataRepo.findProcessByWorkOrder(workOrderId),
    ]);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    const MARGIN = 40;

    // ====== PAGE 1 — PRODUCTION SHEET ======
    let y = renderCompanyHeader(doc, profile);
    y = renderDocumentTitle(doc, 'PRODUCTION SHEET', y);

    // Meta block
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
          { key: 'lineNo', header: 'Line', width: 35, align: 'center' },
          { key: 'code', header: 'Code', width: 75 },
          { key: 'description', header: 'Description', width: 130 },
          { key: 'trfQty', header: 'Trf Qty', width: 60, align: 'right' },
          { key: 'bomPct', header: 'BOM %', width: 50, align: 'right' },
          { key: 'actualQty', header: 'Actual Qty', width: 65, align: 'right' },
          { key: 'batchNo', header: 'Batch No', width: 100 },
        ],
        rows: ingredientLines.map(l => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 26),
          trfQty: l.scaledQty.toFixed(3),
          bomPct: l.bomPct.toFixed(1),
          actualQty: '',
          batchNo: '',
        })),
        startY: y,
      });
      y += 5;
    }

    // Packaging table
    if (packagingLines.length > 0) {
      if (y > 620) { doc.addPage(); y = MARGIN; }

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('PACKAGING', MARGIN, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'lineNo', header: 'Line', width: 35, align: 'center' },
          { key: 'code', header: 'Code', width: 75 },
          { key: 'description', header: 'Description', width: 130 },
          { key: 'trfQty', header: 'Trf Qty', width: 60, align: 'right' },
          { key: 'bomPct', header: 'BOM %', width: 50, align: 'right' },
          { key: 'actualQty', header: 'Actual Qty', width: 65, align: 'right' },
          { key: 'batchNo', header: 'Batch No', width: 100 },
        ],
        rows: packagingLines.map(l => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 26),
          trfQty: l.scaledQty.toFixed(0),
          bomPct: l.bomPct.toFixed(1),
          actualQty: '',
          batchNo: '',
        })),
        startY: y,
      });
      y += 5;
    }

    // Production Tracking section
    if (y > 660) { doc.addPage(); y = MARGIN; }
    y += 10;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('PRODUCTION TRACKING', MARGIN, y);
    y += 18;

    doc.fontSize(9).font('Helvetica');
    doc.text('Start Time: ________________________________', MARGIN, y);
    doc.text('End Time: ________________________________', 310, y);
    y += 20;
    doc.text('Pallet Weight: ________________________________', MARGIN, y);
    y += 30;

    // Signatures
    y = renderSignatureBlock(doc, y, 'Prepared By', 'Date');
    y = renderSignatureBlock(doc, y, 'Departmental Signature', 'Date');

    // ====== PAGE 2 — TIPPING CHECK SHEET ======
    doc.addPage();
    y = renderCompanyHeader(doc, profile);
    y = renderDocumentTitle(doc, 'TIPPING CHECK SHEET', y);

    // Meta
    doc.fontSize(9).font('Helvetica');
    doc.font('Helvetica-Bold').fillColor('#000000').text('Work Ticket No: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(wo.workOrderNo);
    y += 14;
    doc.font('Helvetica-Bold').text('Product: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(`${item.sku} - ${item.description}`);
    y += 14;
    doc.font('Helvetica-Bold').text('Batch No: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(wo.batchNo || '________________');
    y += 18;

    // Tipping check ingredient table
    if (ingredientLines.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('INGREDIENTS', MARGIN, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'lineNo', header: 'Line', width: 35, align: 'center' },
          { key: 'code', header: 'Code', width: 80 },
          { key: 'description', header: 'Description', width: 150 },
          { key: 'trfQty', header: 'Trf Qty', width: 65, align: 'right' },
          { key: 'check', header: 'Check', width: 50, align: 'center' },
          { key: 'tippedBy', header: 'Tipped By', width: 75 },
        ],
        rows: ingredientLines.map(l => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 30),
          trfQty: l.scaledQty.toFixed(3),
          check: '',
          tippedBy: '',
        })),
        startY: y,
      });
      y += 5;
    }

    // Tipping check packaging table
    if (packagingLines.length > 0) {
      if (y > 580) { doc.addPage(); y = MARGIN; }

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('PACKAGING', MARGIN, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'lineNo', header: 'Line', width: 35, align: 'center' },
          { key: 'code', header: 'Code', width: 80 },
          { key: 'description', header: 'Description', width: 150 },
          { key: 'trfQty', header: 'Trf Qty', width: 65, align: 'right' },
          { key: 'check', header: 'Check', width: 50, align: 'center' },
          { key: 'tippedBy', header: 'Tipped By', width: 75 },
        ],
        rows: packagingLines.map(l => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 30),
          trfQty: l.scaledQty.toFixed(0),
          check: '',
          tippedBy: '',
        })),
        startY: y,
      });
      y += 5;
    }

    // Rework section
    if (y > 620) { doc.addPage(); y = MARGIN; }
    y += 10;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('REWORK', MARGIN, y);
    y += 18;

    doc.fontSize(9).font('Helvetica');
    const reworkProduct = checks?.reworkProduct || '________________________________';
    const reworkQty = checks?.reworkQtyKgs != null ? String(checks.reworkQtyKgs) : '________________';
    doc.text(`Rework Product: ${reworkProduct}`, MARGIN, y);
    doc.text(`Rework Qty (kgs): ${reworkQty}`, 310, y);
    y += 25;

    // Box count section
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('BOX COUNT', MARGIN, y);
    y += 18;

    doc.fontSize(9).font('Helvetica');
    const boxFields = [
      { label: 'Theoretical Boxes', value: checks?.theoreticalBoxes },
      { label: 'Actual Boxes', value: checks?.actualBoxes },
      { label: 'Actual Overs', value: checks?.actualOvers },
      { label: 'Actual Total', value: checks?.actualTotal },
      { label: 'Diff to Theoretical', value: checks?.diffToTheoretical },
    ];

    for (let i = 0; i < boxFields.length; i += 2) {
      const left = boxFields[i];
      const right = boxFields[i + 1];
      const leftVal = left.value != null ? String(left.value) : '________________';
      doc.text(`${left.label}: ${leftVal}`, MARGIN, y);
      if (right) {
        const rightVal = right.value != null ? String(right.value) : '________________';
        doc.text(`${right.label}: ${rightVal}`, 310, y);
      }
      y += 18;
    }

    y += 10;
    // Signatures
    y = renderSignatureBlock(doc, y, 'Loader', 'Date');
    y = renderSignatureBlock(doc, y, 'Operations Manager', 'Date');

    // ====== PAGE 3 — PRODUCTION PROCESS ======
    doc.addPage();
    y = renderCompanyHeader(doc, profile);
    y = renderDocumentTitle(doc, 'PRODUCTION PROCESS', y);

    // Meta
    doc.fontSize(9).font('Helvetica');
    doc.font('Helvetica-Bold').fillColor('#000000').text('Work Ticket No: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(wo.workOrderNo);
    y += 14;
    doc.font('Helvetica-Bold').text('Product: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(`${item.sku} - ${item.description}`);
    y += 20;

    // Instructions
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('INSTRUCTIONS', MARGIN, y);
    y += 16;
    const instructions = process?.instructions || '';
    if (instructions) {
      doc.fontSize(9).font('Helvetica').text(instructions, MARGIN, y, { width: 515 });
      y += doc.heightOfString(instructions, { width: 515 }) + 10;
    } else {
      doc.fontSize(9).font('Helvetica').text('(No instructions provided)', MARGIN, y);
      y += 20;
    }

    // Specs table from specsJson
    const specsJson = process?.specsJson ?? {};
    const specsEntries = Object.entries(specsJson);
    if (specsEntries.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('SPECIFICATIONS', MARGIN, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'parameter', header: 'Parameter', width: 200 },
          { key: 'value', header: 'Value', width: 315 },
        ],
        rows: specsEntries.map(([k, v]) => ({
          parameter: k,
          value: String(v ?? ''),
        })),
        startY: y,
      });
      y += 5;
    }

    // Process fields
    if (y > 580) { doc.addPage(); y = MARGIN; }
    y += 5;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('PROCESS DETAILS', MARGIN, y);
    y += 18;

    doc.fontSize(9).font('Helvetica');
    const processFields = [
      { label: 'Operator', value: process?.operator },
      { label: 'Pot Used', value: process?.potUsed },
      { label: 'Time Started', value: process?.timeStarted ? formatDate(process.timeStarted) : null },
      { label: 'Time 85\u00B0C', value: process?.time85c ? formatDate(process.time85c) : null },
      { label: 'Time Flavour Added', value: process?.timeFlavourAdded ? formatDate(process.timeFlavourAdded) : null },
      { label: 'Time Completed', value: process?.timeCompleted ? formatDate(process.timeCompleted) : null },
    ];

    for (let i = 0; i < processFields.length; i += 2) {
      const left = processFields[i];
      const right = processFields[i + 1];
      const leftVal = left.value || '________________________________';
      doc.text(`${left.label}: ${leftVal}`, MARGIN, y);
      if (right) {
        const rightVal = right.value || '________________________________';
        doc.text(`${right.label}: ${rightVal}`, 310, y);
      }
      y += 18;
    }

    y += 5;
    // Additions
    doc.font('Helvetica-Bold').fillColor('#000000').text('Additions: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(process?.additions || '________________________________________');
    y += 18;
    doc.font('Helvetica-Bold').text('Reason for Addition: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(process?.reasonForAddition || '________________________________________');
    y += 18;
    doc.font('Helvetica-Bold').text('Comments: ', MARGIN, y, { continued: true });
    doc.font('Helvetica').text(process?.comments || '________________________________________');
    y += 30;

    // Signature
    y = renderSignatureBlock(doc, y, 'Operator Signature', 'Date');

    // Footer timestamp on all pages
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).font('Helvetica').fillColor('#999999')
        .text(`Printed: ${new Date().toLocaleString('en-ZA')}`, MARGIN, 780, { width: 515, align: 'right' });
    }

    doc.end();
    return bufferPromise;
  }
}
