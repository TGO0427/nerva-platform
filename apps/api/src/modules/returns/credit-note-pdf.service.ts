import { Injectable, Inject, NotFoundException } from '@nestjs/common';
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
  renderTotals,
  renderNotes,
  renderBankDetails,
  renderSignatureBlock,
  formatCurrency,
  formatDate,
} from '../../common/pdf/pdf-helpers';

@Injectable()
export class CreditNotePdfService {
  constructor(
    private readonly repository: ReturnsRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(creditNoteId: string, tenantId: string): Promise<Buffer> {
    const creditNote = await this.repository.findCreditNoteById(creditNoteId);
    if (!creditNote) throw new NotFoundException('Credit note not found');

    const profile = await this.tenantProfile.getProfile(tenantId);

    // Fetch RMA to get customer ID and RMA number
    const rma = await this.repository.findRmaById(creditNote.rmaId);
    const rmaNo = rma?.rmaNo || '-';

    // Fetch customer details through RMA
    const customer = rma ? await this.getCustomer(rma.customerId) : null;

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, 'CREDIT NOTE', y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: 'Credit Note No', value: creditNote.creditNo || '-' },
        { label: 'Date', value: formatDate(creditNote.createdAt) },
      ],
      [
        { label: 'RMA Reference', value: rmaNo },
        { label: 'Status', value: creditNote.status },
      ],
      y,
    );

    y += 5;

    // Customer address
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

    y += 15;

    // Reason / description section
    if (creditNote.notes) {
      y = renderNotes(doc, creditNote.notes, y);
    }

    // Amount totals
    y = renderTotals(doc, [
      { label: 'Subtotal', value: formatCurrency(creditNote.subtotal) },
      { label: 'VAT (15%)', value: formatCurrency(creditNote.taxAmount) },
      { label: 'Total Credit', value: formatCurrency(creditNote.totalAmount), bold: true },
    ], y);

    // Bank details
    y = renderBankDetails(doc, profile, y);

    // Signature
    renderSignatureBlock(doc, y, 'Authorized Signatory', 'Date');

    doc.end();
    return bufferPromise;
  }

  private async getCustomer(customerId: string): Promise<Record<string, any> | null> {
    const result = await this.pool.query(
      `SELECT name, contact_person, phone, email, vat_no,
              billing_address_line1, billing_address_line2, billing_city,
              billing_postal_code, billing_country
       FROM customers WHERE id = $1`,
      [customerId],
    );
    return result.rows[0] || null;
  }
}
