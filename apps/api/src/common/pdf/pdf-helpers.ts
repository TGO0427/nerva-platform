import * as PDFDocument from 'pdfkit';

// ---- Types ----

export interface TenantProfile {
  name: string;
  code?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  vatNo?: string;
  registrationNo?: string;
  logoUrl?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankBranchCode?: string;
}

export interface AddressInfo {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNo?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  key: string;
}

export interface TableConfig {
  columns: TableColumn[];
  rows: Record<string, string | number>[];
  startY: number;
  startX?: number;
  rowHeight?: number;
  fontSize?: number;
  headerBg?: string;
}

// ---- Formatters ----

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'R 0.00';
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ---- Document Creation ----

export function createPdfDocument(): typeof PDFDocument.prototype {
  return new PDFDocument({ size: 'A4', margin: 40 });
}

export function pdfToBuffer(doc: typeof PDFDocument.prototype): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

// ---- Rendering Functions ----

const PAGE_WIDTH = 595.28; // A4 width in points
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function renderCompanyHeader(
  doc: typeof PDFDocument.prototype,
  profile: TenantProfile,
): number {
  const startY = MARGIN;

  // Company name
  doc.fontSize(16).font('Helvetica-Bold').text(profile.name, MARGIN, startY, { width: CONTENT_WIDTH });

  let y = startY + 22;
  doc.fontSize(8).font('Helvetica').fillColor('#555555');

  const details: string[] = [];
  if (profile.addressLine1) details.push(profile.addressLine1);
  if (profile.addressLine2) details.push(profile.addressLine2);
  const cityLine = [profile.city, profile.postalCode, profile.country].filter(Boolean).join(', ');
  if (cityLine) details.push(cityLine);

  for (const line of details) {
    doc.text(line, MARGIN, y, { width: 250 });
    y += 11;
  }

  // Right side - contact & registration
  let rightY = startY + 22;
  const rightX = 350;

  const rightDetails: string[] = [];
  if (profile.phone) rightDetails.push(`Tel: ${profile.phone}`);
  if (profile.email) rightDetails.push(`Email: ${profile.email}`);
  if (profile.vatNo) rightDetails.push(`VAT: ${profile.vatNo}`);
  if (profile.registrationNo) rightDetails.push(`Reg: ${profile.registrationNo}`);

  for (const line of rightDetails) {
    doc.text(line, rightX, rightY, { width: 200, align: 'right' });
    rightY += 11;
  }

  const bottomY = Math.max(y, rightY) + 5;

  // Divider line
  doc.fillColor('#000000');
  doc.moveTo(MARGIN, bottomY).lineTo(PAGE_WIDTH - MARGIN, bottomY).lineWidth(1).stroke();

  return bottomY + 10;
}

export function renderDocumentTitle(
  doc: typeof PDFDocument.prototype,
  title: string,
  y: number,
): number {
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text(title, MARGIN, y, {
    width: CONTENT_WIDTH,
    align: 'center',
  });
  return y + 25;
}

export function renderDocumentMeta(
  doc: typeof PDFDocument.prototype,
  leftFields: { label: string; value: string }[],
  rightFields: { label: string; value: string }[],
  y: number,
): number {
  doc.fontSize(9).font('Helvetica');

  let leftY = y;
  for (const field of leftFields) {
    doc.font('Helvetica-Bold').fillColor('#000000').text(`${field.label}: `, MARGIN, leftY, { continued: true });
    doc.font('Helvetica').text(field.value);
    leftY += 14;
  }

  let rightY = y;
  const rightX = 340;
  for (const field of rightFields) {
    doc.font('Helvetica-Bold').text(`${field.label}: `, rightX, rightY, { continued: true, width: 200 });
    doc.font('Helvetica').text(field.value);
    rightY += 14;
  }

  return Math.max(leftY, rightY) + 5;
}

export function renderAddressBlock(
  doc: typeof PDFDocument.prototype,
  label: string,
  address: AddressInfo,
  x: number,
  y: number,
  width = 220,
): number {
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text(label, x, y);
  y += 14;

  doc.font('Helvetica');
  doc.text(address.name, x, y, { width });
  y += 12;

  if (address.contactPerson) {
    doc.text(`Attn: ${address.contactPerson}`, x, y, { width });
    y += 12;
  }
  if (address.addressLine1) {
    doc.text(address.addressLine1, x, y, { width });
    y += 12;
  }
  if (address.addressLine2) {
    doc.text(address.addressLine2, x, y, { width });
    y += 12;
  }
  const cityLine = [address.city, address.postalCode, address.country].filter(Boolean).join(', ');
  if (cityLine) {
    doc.text(cityLine, x, y, { width });
    y += 12;
  }
  if (address.vatNo) {
    doc.text(`VAT: ${address.vatNo}`, x, y, { width });
    y += 12;
  }
  if (address.phone) {
    doc.text(`Tel: ${address.phone}`, x, y, { width });
    y += 12;
  }
  if (address.email) {
    doc.text(address.email, x, y, { width });
    y += 12;
  }

  return y;
}

export function renderTable(
  doc: typeof PDFDocument.prototype,
  config: TableConfig,
): number {
  const {
    columns,
    rows,
    startY,
    startX = MARGIN,
    rowHeight = 20,
    fontSize = 9,
    headerBg = '#f0f0f0',
  } = config;

  let y = startY;

  // Helper to draw header row
  const drawHeader = (atY: number) => {
    // Header background
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    doc.rect(startX, atY - 3, totalWidth, rowHeight).fill(headerBg);

    // Header text
    doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#000000');
    let x = startX;
    for (const col of columns) {
      doc.text(col.header, x + 3, atY, {
        width: col.width - 6,
        align: col.align || 'left',
        lineBreak: false,
      });
      x += col.width;
    }

    // Header bottom line
    doc.moveTo(startX, atY + rowHeight - 3)
      .lineTo(startX + totalWidth, atY + rowHeight - 3)
      .lineWidth(0.5)
      .stroke();

    return atY + rowHeight;
  };

  y = drawHeader(y);

  // Data rows
  doc.font('Helvetica').fontSize(fontSize);
  for (let i = 0; i < rows.length; i++) {
    // Page break check
    if (y > 740) {
      doc.addPage();
      y = MARGIN;
      y = drawHeader(y);
      doc.font('Helvetica').fontSize(fontSize);
    }

    // Alternating row shading
    if (i % 2 === 1) {
      const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
      doc.rect(startX, y - 3, totalWidth, rowHeight).fill('#fafafa');
      doc.fillColor('#000000');
    }

    let x = startX;
    for (const col of columns) {
      const value = String(rows[i][col.key] ?? '-');
      doc.fillColor('#000000').text(value, x + 3, y, {
        width: col.width - 6,
        align: col.align || 'left',
        lineBreak: false,
      });
      x += col.width;
    }

    y += rowHeight;
  }

  // Bottom line
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  doc.moveTo(startX, y - 3).lineTo(startX + totalWidth, y - 3).lineWidth(0.5).stroke();

  return y + 5;
}

export function renderTotals(
  doc: typeof PDFDocument.prototype,
  items: { label: string; value: string; bold?: boolean }[],
  y: number,
): number {
  const rightX = 380;
  const valueX = 470;

  doc.fontSize(9);

  for (const item of items) {
    if (item.bold) {
      doc.font('Helvetica-Bold');
      // Draw a line above the total
      doc.moveTo(rightX, y - 3).lineTo(PAGE_WIDTH - MARGIN, y - 3).lineWidth(0.5).stroke();
      y += 3;
    } else {
      doc.font('Helvetica');
    }
    doc.fillColor('#000000').text(item.label, rightX, y, { width: 85, align: 'right' });
    doc.text(item.value, valueX, y, { width: 85, align: 'right' });
    y += 15;
  }

  return y + 5;
}

export function renderNotes(
  doc: typeof PDFDocument.prototype,
  notes: string | null | undefined,
  y: number,
): number {
  if (!notes) return y;

  // Page break check
  if (y > 700) {
    doc.addPage();
    y = MARGIN;
  }

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Notes:', MARGIN, y);
  y += 14;
  doc.font('Helvetica').text(notes, MARGIN, y, { width: CONTENT_WIDTH });
  y += doc.heightOfString(notes, { width: CONTENT_WIDTH }) + 10;

  return y;
}

export function renderBankDetails(
  doc: typeof PDFDocument.prototype,
  profile: TenantProfile,
  y: number,
): number {
  if (!profile.bankName && !profile.bankAccountNo) return y;

  if (y > 700) {
    doc.addPage();
    y = MARGIN;
  }

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Bank Details:', MARGIN, y);
  y += 14;
  doc.font('Helvetica');
  if (profile.bankName) {
    doc.text(`Bank: ${profile.bankName}`, MARGIN, y);
    y += 12;
  }
  if (profile.bankAccountNo) {
    doc.text(`Account: ${profile.bankAccountNo}`, MARGIN, y);
    y += 12;
  }
  if (profile.bankBranchCode) {
    doc.text(`Branch Code: ${profile.bankBranchCode}`, MARGIN, y);
    y += 12;
  }

  return y + 5;
}

export function renderSignatureBlock(
  doc: typeof PDFDocument.prototype,
  y: number,
  leftLabel = 'Authorized Signatory',
  rightLabel = 'Date',
): number {
  if (y > 720) {
    doc.addPage();
    y = MARGIN;
  }

  const sigY = Math.max(y + 20, 720);

  doc.fontSize(9).font('Helvetica').fillColor('#000000');
  doc.text(`${leftLabel}: _________________________`, MARGIN, sigY);
  doc.text(`${rightLabel}: _______________`, 340, sigY);

  return sigY + 25;
}
