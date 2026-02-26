import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { WorkOrderRepository } from './repositories/work-order.repository';
import { BomRepository } from './repositories/bom.repository';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';
import {
  createPdfDocument,
  pdfToBuffer,
  TenantProfile,
  formatDate,
} from '../../common/pdf/pdf-helpers';

// ---- Layout constants ----
const MARGIN = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CW = PAGE_W - MARGIN * 2;
const DARK = '#1a1a2e';
const ACCENT = '#16213e';
const LIGHT_BG = '#f8f9fa';
const BORDER = '#cccccc';
const LABEL_CLR = '#555555';

// ---- Drawing helpers ----

function drawPageBorder(doc: any) {
  doc.save()
    .lineWidth(0.75)
    .strokeColor('#999999')
    .rect(MARGIN - 10, MARGIN - 10, CW + 20, PAGE_H - MARGIN * 2 + 20)
    .stroke()
    .restore();
}

function drawCompanyHeader(doc: any, profile: TenantProfile): number {
  let y = MARGIN;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK).text(profile.name, MARGIN, y, { width: CW });
  y += 18;

  doc.fontSize(7).font('Helvetica').fillColor(LABEL_CLR);
  const parts: string[] = [];
  if (profile.addressLine1) parts.push(profile.addressLine1);
  if (profile.city || profile.postalCode) parts.push([profile.city, profile.postalCode].filter(Boolean).join(', '));
  if (profile.phone) parts.push(`Tel: ${profile.phone}`);
  if (profile.email) parts.push(profile.email);
  if (parts.length > 0) {
    doc.text(parts.join('  |  '), MARGIN, y, { width: CW });
    y += 10;
  }

  y += 2;
  doc.save().lineWidth(1.5).strokeColor(DARK)
    .moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).stroke().restore();
  return y + 6;
}

function drawSectionBar(doc: any, title: string, y: number): number {
  const barH = 18;
  doc.save()
    .rect(MARGIN, y, CW, barH).fill(ACCENT)
    .fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
    .text(title, MARGIN + 6, y + 4, { width: CW - 12 })
    .restore();
  return y + barH + 4;
}

function drawMetaGrid(
  doc: any,
  fields: { label: string; value: string }[],
  y: number,
  cols = 2,
): number {
  const cellH = 22;
  const colW = CW / cols;
  const rows = Math.ceil(fields.length / cols);

  doc.save().lineWidth(0.5).strokeColor(BORDER)
    .rect(MARGIN, y, CW, rows * cellH).stroke().restore();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= fields.length) break;
      const field = fields[idx];
      const cellX = MARGIN + c * colW;
      const cellY = y + r * cellH;

      if (c > 0) {
        doc.save().lineWidth(0.5).strokeColor(BORDER)
          .moveTo(cellX, cellY).lineTo(cellX, cellY + cellH).stroke().restore();
      }
      if (r > 0) {
        doc.save().lineWidth(0.5).strokeColor(BORDER)
          .moveTo(MARGIN, cellY).lineTo(MARGIN + CW, cellY).stroke().restore();
      }

      doc.fontSize(6.5).font('Helvetica').fillColor(LABEL_CLR)
        .text(field.label, cellX + 4, cellY + 2, { width: colW - 8, lineBreak: false });
      const val = field.value || '-';
      const valFontSize = val.length > colW / 5 ? 7.5 : 8.5;
      doc.fontSize(valFontSize).font('Helvetica-Bold').fillColor('#000000')
        .text(val, cellX + 4, cellY + 11, { width: colW - 8, lineBreak: false });
    }
  }

  return y + rows * cellH + 6;
}

function drawGridTable(
  doc: any,
  columns: { key: string; header: string; width: number; align?: 'left' | 'right' | 'center' }[],
  rows: Record<string, string | number>[],
  startY: number,
): number {
  const rowH = 18;
  const headerH = 18;
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  let y = startY;

  const drawHeader = (atY: number) => {
    doc.save().rect(MARGIN, atY, totalW, headerH).fill(ACCENT);
    let x = MARGIN;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    for (const col of columns) {
      doc.text(col.header, x + 3, atY + 5, { width: col.width - 6, align: col.align || 'left', lineBreak: false });
      x += col.width;
    }
    doc.restore();
    return atY + headerH;
  };

  y = drawHeader(y);

  for (let r = 0; r < rows.length; r++) {
    if (y + rowH > PAGE_H - MARGIN - 20) {
      doc.addPage();
      drawPageBorder(doc);
      y = MARGIN;
      y = drawHeader(y);
    }

    if (r % 2 === 0) {
      doc.save().rect(MARGIN, y, totalW, rowH).fill(LIGHT_BG).restore();
    }

    let x = MARGIN;
    doc.fontSize(8).font('Helvetica').fillColor('#000000');
    for (const col of columns) {
      doc.save().lineWidth(0.3).strokeColor(BORDER)
        .rect(x, y, col.width, rowH).stroke().restore();
      const val = String(rows[r][col.key] ?? '');
      doc.text(val, x + 3, y + 5, { width: col.width - 6, align: col.align || 'left', lineBreak: false });
      x += col.width;
    }
    y += rowH;
  }

  doc.save().lineWidth(0.5).strokeColor(BORDER)
    .moveTo(MARGIN, y).lineTo(MARGIN + totalW, y).stroke().restore();

  return y + 4;
}

function drawFormFieldRow(
  doc: any,
  fields: { label: string; value: string; flex?: number }[],
  y: number,
  h = 28,
): number {
  const totalFlex = fields.reduce((s, f) => s + (f.flex || 1), 0);
  let x = MARGIN;
  for (const f of fields) {
    const w = (CW * (f.flex || 1)) / totalFlex;
    doc.save().lineWidth(0.5).strokeColor(BORDER).rect(x, y, w, h).stroke().restore();
    doc.fontSize(6.5).font('Helvetica').fillColor(LABEL_CLR)
      .text(f.label, x + 4, y + 2, { width: w - 8, lineBreak: false });
    doc.fontSize(8.5).font('Helvetica').fillColor('#000000')
      .text(f.value, x + 4, y + 12, { width: w - 8, lineBreak: false });
    x += w;
  }
  return y + h;
}

function drawSignatureRow(
  doc: any,
  labels: string[],
  y: number,
): number {
  const h = 36;
  const colW = CW / labels.length;
  for (let i = 0; i < labels.length; i++) {
    const x = MARGIN + i * colW;
    doc.save().lineWidth(0.5).strokeColor(BORDER).rect(x, y, colW, h).stroke().restore();
    doc.fontSize(6.5).font('Helvetica').fillColor(LABEL_CLR)
      .text(labels[i], x + 4, y + 2, { width: colW - 8, lineBreak: false });
    doc.save().lineWidth(0.3).strokeColor('#aaaaaa')
      .moveTo(x + 4, y + h - 8).lineTo(x + colW - 4, y + h - 8).stroke().restore();
  }
  return y + h;
}

function stampFooters(doc: any, printDate: string) {
  const footerY = 780;
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.save().fontSize(7).font('Helvetica').fillColor('#999999');
    doc.text(`Printed: ${printDate}`, MARGIN, footerY, { width: CW / 2, lineBreak: false });
    doc.text(`Page ${i + 1} of ${pages.count}`, MARGIN, footerY, { width: CW, align: 'right', lineBreak: false });
    doc.restore();
  }
}

// ---- Main service ----

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

    const itemResult = await this.pool.query(
      'SELECT sku, description FROM items WHERE id = $1',
      [wo.itemId],
    );
    const item = itemResult.rows[0] || { sku: '-', description: '-' };

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

    const doc = createPdfDocument({ bufferPages: true });
    const bufferPromise = pdfToBuffer(doc);
    const printDate = new Date().toLocaleString('en-ZA');

    // ================================================================
    //  PAGE 1 — PRODUCTION BATCH SHEET
    // ================================================================
    drawPageBorder(doc);
    let y = drawCompanyHeader(doc, profile);

    // Title bar
    doc.save().rect(MARGIN, y, CW, 22).fill(DARK);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
      .text('PRODUCTION BATCH SHEET', MARGIN, y + 5, { width: CW, align: 'center' });
    doc.restore();
    y += 28;

    // Meta grid
    y = drawMetaGrid(doc, [
      { label: 'Work Ticket No', value: wo.workOrderNo },
      { label: 'FG Code', value: item.sku },
      { label: 'Prod Size (kg)', value: String(wo.qtyOrdered) },
      { label: 'Print Date', value: formatDate(new Date()) },
      { label: 'Product', value: item.description },
      { label: 'BOM Version', value: bomHeader ? `V${bomHeader.version} Rev ${bomHeader.revision}` : '-' },
      { label: 'Batch No', value: wo.batchNo || '' },
      { label: 'Status', value: wo.status },
    ], y, 4);

    // Ingredients table
    if (ingredientLines.length > 0) {
      y = drawSectionBar(doc, 'INGREDIENTS', y);
      y = drawGridTable(doc, [
        { key: 'lineNo', header: '#', width: 28, align: 'center' },
        { key: 'code', header: 'Code', width: 75 },
        { key: 'description', header: 'Description', width: 135 },
        { key: 'trfQty', header: 'Trf Qty (kg)', width: 65, align: 'right' },
        { key: 'bomPct', header: 'BOM %', width: 50, align: 'right' },
        { key: 'actualQty', header: 'Actual Qty', width: 65, align: 'right' },
        { key: 'batchNo', header: 'Batch No', width: 97 },
      ], ingredientLines.map(l => ({
        lineNo: l.lineNo,
        code: l.itemSku,
        description: l.itemDescription.substring(0, 28),
        trfQty: l.scaledQty.toFixed(2),
        bomPct: l.bomPct.toFixed(1),
        actualQty: prefill ? l.scaledQty.toFixed(2) : '',
        batchNo: '',
      })), y);
    }

    // Packaging table
    if (packagingLines.length > 0) {
      y = drawSectionBar(doc, 'PACKAGING', y);
      y = drawGridTable(doc, [
        { key: 'lineNo', header: '#', width: 28, align: 'center' },
        { key: 'code', header: 'Code', width: 75 },
        { key: 'description', header: 'Description', width: 135 },
        { key: 'trfQty', header: 'Trf Qty', width: 65, align: 'right' },
        { key: 'bomPct', header: 'BOM %', width: 50, align: 'right' },
        { key: 'actualQty', header: 'Actual Qty', width: 65, align: 'right' },
        { key: 'batchNo', header: 'Batch No', width: 97 },
      ], packagingLines.map(l => ({
        lineNo: l.lineNo,
        code: l.itemSku,
        description: l.itemDescription.substring(0, 28),
        trfQty: l.scaledQty.toFixed(2),
        bomPct: l.bomPct.toFixed(1),
        actualQty: prefill ? l.scaledQty.toFixed(2) : '',
        batchNo: '',
      })), y);
    }

    // Production Tracking
    y = drawSectionBar(doc, 'PRODUCTION TRACKING', y);
    y = drawFormFieldRow(doc, [
      { label: 'Start Time', value: '' },
      { label: 'End Time', value: '' },
      { label: 'Pallet Weight', value: '' },
    ], y);
    y += 6;

    // Signatures
    y = drawSignatureRow(doc, ['Prepared By', 'Date', 'Departmental Signature', 'Date'], y);

    // Footers
    stampFooters(doc, printDate);

    doc.end();
    return bufferPromise;
  }
}
