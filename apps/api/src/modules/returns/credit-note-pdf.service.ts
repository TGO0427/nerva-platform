import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { DATABASE_POOL } from "../../common/db/database.module";
import { ReturnsRepository } from "./returns.repository";
import { TenantProfileService } from "../../common/pdf/tenant-profile.service";
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
} from "../../common/pdf/pdf-helpers";

@Injectable()
export class CreditNotePdfService {
  constructor(
    private readonly repository: ReturnsRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(creditNoteId: string, tenantId: string): Promise<Buffer> {
    const creditNote = await this.repository.findCreditNoteById(creditNoteId);
    if (!creditNote) throw new NotFoundException("Credit note not found");

    const profile = await this.tenantProfile.getProfile(tenantId);

    // Fetch RMA to get customer ID and RMA number
    const rma = await this.repository.findRmaById(creditNote.rmaId);
    const rmaNo = rma?.rmaNo || "-";

    // Every credited line, with the batch it was actually returned under -
    // an auditor tracing this credit back to stock needs that on the face
    // of the document, not just the total.
    const lines = await this.repository.getRmaLines(creditNote.rmaId);

    // Fetch customer details through RMA
    const customer = rma
      ? await this.getCustomer(rma.customerId, tenantId)
      : null;

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, "CREDIT NOTE", y);

    // Meta info - an auditor tracing this credit needs the full paper
    // trail on the face of the document: RMA it came from, the sales
    // order that was originally shipped, and the invoice it offsets.
    y = renderDocumentMeta(
      doc,
      [
        { label: "Credit Note No", value: creditNote.creditNo || "-" },
        { label: "Date", value: formatDate(creditNote.createdAt) },
        { label: "Sales Order", value: creditNote.orderNo || "-" },
        { label: "Invoice", value: creditNote.invoiceNo || "-" },
      ],
      [
        { label: "RMA Reference", value: rmaNo },
        { label: "Status", value: creditNote.status },
      ],
      y,
    );

    y += 5;

    // Customer address
    if (customer) {
      y = renderAddressBlock(
        doc,
        "Customer:",
        {
          name: customer.name,
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

    y += 15;

    // Line items - product, batch, and disposition for every credited
    // line, so the amount below is traceable back to actual stock.
    y = renderTable(doc, {
      columns: [
        { key: "sku", header: "SKU", width: 70 },
        { key: "description", header: "Description", width: 130 },
        { key: "batchNo", header: "Batch/Lot No", width: 85 },
        { key: "qty", header: "Qty", width: 40, align: "right" },
        { key: "unitCredit", header: "Unit Credit", width: 70, align: "right" },
        { key: "lineTotal", header: "Line Total", width: 75, align: "right" },
      ],
      rows: lines.map((line) => ({
        sku: line.itemSku || "-",
        description: (line.itemDescription || "-").substring(0, 28),
        batchNo: line.batchNo || "-",
        qty: String(line.qtyReceived),
        unitCredit:
          line.unitCreditAmount != null
            ? formatCurrency(line.unitCreditAmount)
            : "-",
        lineTotal:
          line.unitCreditAmount != null
            ? formatCurrency(line.unitCreditAmount * line.qtyReceived)
            : "-",
      })),
      startY: y,
    });

    y += 10;

    // Reason / description section
    if (creditNote.notes) {
      y = renderNotes(doc, creditNote.notes, y);
    }

    // Amount totals
    y = renderTotals(
      doc,
      [
        { label: "Subtotal", value: formatCurrency(creditNote.subtotal) },
        { label: "VAT (15%)", value: formatCurrency(creditNote.taxAmount) },
        {
          label: "Total Credit",
          value: formatCurrency(creditNote.totalAmount),
          bold: true,
        },
      ],
      y,
    );

    // Bank details
    y = renderBankDetails(doc, profile, y);

    // Signature
    renderSignatureBlock(doc, y, "Authorized Signatory", "Date");

    doc.end();
    return bufferPromise;
  }

  private async getCustomer(
    customerId: string,
    tenantId: string,
  ): Promise<Record<string, any> | null> {
    const result = await this.pool.query(
      `SELECT name, phone, email, vat_no,
              billing_address_line1, billing_address_line2, billing_city,
              billing_postal_code, billing_country
       FROM customers WHERE id = $1 AND tenant_id = $2`,
      [customerId, tenantId],
    );
    return result.rows[0] || null;
  }
}
