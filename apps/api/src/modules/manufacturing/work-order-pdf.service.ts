import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';
import { WorkOrderRepository } from './repositories/work-order.repository';
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
export class WorkOrderPdfService {
  constructor(
    private readonly repository: WorkOrderRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(workOrderId: string, tenantId: string): Promise<Buffer> {
    const wo = await this.repository.findById(workOrderId);
    if (!wo) throw new NotFoundException('Work order not found');

    const materials = await this.repository.getMaterials(workOrderId);
    const operations = await this.repository.getOperations(workOrderId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Get item details (product being manufactured)
    const itemResult = await this.pool.query(
      'SELECT sku, description FROM items WHERE id = $1',
      [wo.itemId],
    );
    const item = itemResult.rows[0] || { sku: '-', description: '-' };

    // Get warehouse name
    const warehouseResult = await this.pool.query(
      'SELECT name FROM warehouses WHERE id = $1',
      [wo.warehouseId],
    );
    const warehouseName = warehouseResult.rows[0]?.name || '-';

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'WORK ORDER', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'WO Number', value: wo.workOrderNo },
        { label: 'Date', value: formatDate(wo.createdAt) },
      ],
      [
        { label: 'Status', value: wo.status },
        { label: 'Priority', value: String(wo.priority) },
      ],
      y,
    );

    y += 5;

    // Product info
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
      .text('Product: ', 40, y, { continued: true });
    doc.font('Helvetica').text(`${item.sku} - ${item.description}`);
    y += 14;

    doc.font('Helvetica-Bold').text('Qty Ordered: ', 40, y, { continued: true });
    doc.font('Helvetica').text(String(wo.qtyOrdered));
    y += 14;

    doc.font('Helvetica-Bold').text('Warehouse: ', 40, y, { continued: true });
    doc.font('Helvetica').text(warehouseName);
    y += 18;

    // Planned dates
    doc.font('Helvetica-Bold').text('Planned Start: ', 40, y, { continued: true });
    doc.font('Helvetica').text(formatDate(wo.plannedStart));
    doc.font('Helvetica-Bold').text('Planned End: ', 340, y, { continued: true });
    doc.font('Helvetica').text(formatDate(wo.plannedEnd));
    y += 20;

    // Materials table
    if (materials.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Materials', 40, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'sku', header: 'SKU', width: 90 },
          { key: 'description', header: 'Description', width: 180 },
          { key: 'qtyRequired', header: 'Qty Required', width: 75, align: 'right' },
          { key: 'qtyIssued', header: 'Qty Issued', width: 70, align: 'right' },
          { key: 'status', header: 'Status', width: 100 },
        ],
        rows: materials.map((mat) => ({
          sku: mat.itemSku || '-',
          description: (mat.itemDescription || '-').substring(0, 35),
          qtyRequired: String(mat.qtyRequired),
          qtyIssued: String(mat.qtyIssued),
          status: mat.status,
        })),
        startY: y,
      });

      y += 10;
    }

    // Operations table
    if (operations.length > 0) {
      // Page break check
      if (y > 600) {
        doc.addPage();
        y = 40;
      }

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Operations', 40, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: 'opNo', header: 'Op #', width: 40, align: 'center' },
          { key: 'name', header: 'Name', width: 130 },
          { key: 'workstation', header: 'Workstation', width: 120 },
          { key: 'assignedTo', header: 'Assigned To', width: 110 },
          { key: 'status', header: 'Status', width: 115 },
        ],
        rows: operations.map((op) => ({
          opNo: String(op.operationNo),
          name: op.name,
          workstation: op.workstationName || op.workstationCode || '-',
          assignedTo: op.assignedUserName || '-',
          status: op.status,
        })),
        startY: y,
      });
    }

    // Notes
    y = renderNotes(doc, wo.notes, y);

    // Signature block
    renderSignatureBlock(doc, y, 'Supervisor', 'Date');

    doc.end();
    return bufferPromise;
  }
}
