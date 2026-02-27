import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { CycleCountRepository } from './cycle-count.repository';
import { TenantProfileService } from '../../common/pdf/tenant-profile.service';
import {
  createPdfDocument,
  pdfToBuffer,
  renderCompanyHeader,
  renderDocumentTitle,
  renderDocumentMeta,
  renderTable,
  renderSignatureBlock,
  formatDate,
  TableColumn,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class CycleCountPdfService {
  constructor(
    private readonly repository: CycleCountRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generateCountSheet(cycleCountId: string, tenantId: string): Promise<Buffer> {
    const cc = await this.repository.findById(cycleCountId);
    if (!cc) throw new NotFoundException('Cycle count not found');

    const lines = await this.repository.getLines(cycleCountId);
    const profile = await this.tenantProfile.getProfile(tenantId);
    const warehouseName = await this.getWarehouseName(cc.warehouseId);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'CYCLE COUNT SHEET', y);

    // Meta info
    const leftFields = [
      { label: 'Count No', value: cc.countNo },
      { label: 'Warehouse', value: warehouseName || '-' },
    ];
    const rightFields = [
      { label: 'Date', value: formatDate(cc.createdAt) },
      { label: 'Status', value: cc.status },
    ];
    if (cc.isBlind) {
      leftFields.push({ label: 'Blind Count', value: 'Yes' });
    }

    y = renderDocumentMeta(doc, leftFields, rightFields, y);
    y += 5;

    // Table columns — omit System Qty if blind
    const columns: TableColumn[] = [
      { key: 'rowNum', header: '#', width: 30, align: 'center' },
      { key: 'bin', header: 'Bin', width: 80 },
      { key: 'sku', header: 'SKU', width: 80 },
      { key: 'description', header: 'Description', width: 175 },
    ];
    if (!cc.isBlind) {
      columns.push({ key: 'systemQty', header: 'System Qty', width: 65, align: 'right' });
    }
    columns.push({ key: 'countedQty', header: 'Counted Qty', width: 65, align: 'right' });
    columns.push({ key: 'notes', header: 'Notes', width: cc.isBlind ? 85 : 20 });

    const rows = lines.map((line, i) => ({
      rowNum: String(i + 1),
      bin: line.binCode || '-',
      sku: line.itemSku || '-',
      description: (line.itemDescription || '-').substring(0, 35),
      systemQty: String(line.systemQty),
      countedQty: '',
      notes: '',
    }));

    y = renderTable(doc, { columns, rows, startY: y });

    // Signature
    renderSignatureBlock(doc, y, 'Counted By', 'Date');

    doc.end();
    return bufferPromise;
  }

  async generateVarianceReport(cycleCountId: string, tenantId: string): Promise<Buffer> {
    const cc = await this.repository.findById(cycleCountId);
    if (!cc) throw new NotFoundException('Cycle count not found');

    const lines = await this.repository.getLines(cycleCountId);
    const profile = await this.tenantProfile.getProfile(tenantId);
    const warehouseName = await this.getWarehouseName(cc.warehouseId);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'CYCLE COUNT VARIANCE REPORT', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'Count No', value: cc.countNo },
        { label: 'Warehouse', value: warehouseName || '-' },
      ],
      [
        { label: 'Date', value: formatDate(cc.createdAt) },
        { label: 'Status', value: cc.status },
      ],
      y,
    );

    // Summary block
    const countedLines = lines.filter((l) => l.countedQty !== null).length;
    const varianceLines = lines.filter((l) => l.countedQty !== null && l.varianceQty !== 0);
    const totalAbsVariance = varianceLines.reduce((sum, l) => sum + Math.abs(l.varianceQty), 0);

    y += 5;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Summary:', 40, y);
    y += 14;
    doc.font('Helvetica');
    doc.text(`Total Lines: ${lines.length}    Counted Lines: ${countedLines}    Lines with Variance: ${varianceLines.length}    Total Absolute Variance: ${totalAbsVariance}`, 40, y, { width: 515 });
    y += 18;

    // Table
    y = renderTable(doc, {
      columns: [
        { key: 'rowNum', header: '#', width: 30, align: 'center' },
        { key: 'bin', header: 'Bin', width: 75 },
        { key: 'sku', header: 'SKU', width: 75 },
        { key: 'description', header: 'Description', width: 140 },
        { key: 'systemQty', header: 'System Qty', width: 65, align: 'right' },
        { key: 'countedQty', header: 'Counted Qty', width: 65, align: 'right' },
        { key: 'variance', header: 'Variance', width: 65, align: 'right' },
      ],
      rows: lines.map((line, i) => ({
        rowNum: String(i + 1),
        bin: line.binCode || '-',
        sku: line.itemSku || '-',
        description: (line.itemDescription || '-').substring(0, 30),
        systemQty: String(line.systemQty),
        countedQty: line.countedQty !== null ? String(line.countedQty) : '-',
        variance: line.countedQty !== null ? String(line.varianceQty) : '-',
      })),
      startY: y,
    });

    // Signature
    renderSignatureBlock(doc, y, 'Approved By', 'Date');

    doc.end();
    return bufferPromise;
  }

  private async getWarehouseName(warehouseId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT name FROM warehouses WHERE id = $1',
      [warehouseId],
    );
    return result.rows[0]?.name || null;
  }
}
