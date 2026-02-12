import { Injectable, NotFoundException } from '@nestjs/common';
import { MasterDataRepository } from './masterdata.repository';
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
  renderSignatureBlock,
  formatCurrency,
  formatDate,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class PurchaseOrderPdfService {
  constructor(
    private readonly repository: MasterDataRepository,
    private readonly tenantProfile: TenantProfileService,
  ) {}

  async generate(purchaseOrderId: string, tenantId: string): Promise<Buffer> {
    const po = await this.repository.findPurchaseOrderById(purchaseOrderId);
    if (!po) throw new NotFoundException('Purchase order not found');

    const lines = await this.repository.findPurchaseOrderLines(purchaseOrderId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Get supplier details
    const supplier = await this.repository.findSupplierById(po.supplierId);

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'PURCHASE ORDER', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'PO Number', value: po.poNo },
        { label: 'Order Date', value: formatDate(po.orderDate) },
        { label: 'Expected Date', value: formatDate(po.expectedDate) },
      ],
      [
        { label: 'Status', value: po.status },
        { label: 'Warehouse', value: (po as any).warehouseName || '-' },
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
          contactPerson: supplier.contactPerson || undefined,
          addressLine1: supplier.addressLine1 || undefined,
          addressLine2: supplier.addressLine2 || undefined,
          city: supplier.city || undefined,
          postalCode: supplier.postalCode || undefined,
          country: supplier.country || undefined,
          vatNo: supplier.vatNo || undefined,
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
        { key: 'lineNo', header: '#', width: 30, align: 'center' },
        { key: 'sku', header: 'SKU', width: 80 },
        { key: 'description', header: 'Description', width: 200 },
        { key: 'qty', header: 'Qty', width: 50, align: 'right' },
        { key: 'unitCost', header: 'Unit Cost', width: 75, align: 'right' },
        { key: 'lineTotal', header: 'Line Total', width: 80, align: 'right' },
      ],
      rows: lines.map((line, i) => ({
        lineNo: String(i + 1),
        sku: line.itemSku || '-',
        description: (line.itemDescription || '-').substring(0, 40),
        qty: String(line.qtyOrdered),
        unitCost: formatCurrency(line.unitCost),
        lineTotal: formatCurrency(line.lineTotal),
      })),
      startY: y,
    });

    // Totals
    const subtotal = po.subtotal || lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0);
    const taxAmount = po.taxAmount || subtotal * 0.15;
    const totalAmount = po.totalAmount || subtotal + taxAmount;

    y = renderTotals(doc, [
      { label: 'Subtotal', value: formatCurrency(subtotal) },
      { label: 'VAT (15%)', value: formatCurrency(taxAmount) },
      { label: 'Total', value: formatCurrency(totalAmount), bold: true },
    ], y);

    // Notes
    y = renderNotes(doc, po.notes, y);

    // Signature
    renderSignatureBlock(doc, y, 'Authorized Signatory', 'Date');

    doc.end();
    return bufferPromise;
  }
}
