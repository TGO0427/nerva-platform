import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { DATABASE_POOL } from "../../common/db/database.module";
import { WorkOrderRepository } from "./repositories/work-order.repository";
import { BomRepository } from "./repositories/bom.repository";
import { ProductionDataRepository } from "./repositories/production-data.repository";
import { TenantProfileService } from "../../common/pdf/tenant-profile.service";
import {
  createPdfDocument,
  pdfToBuffer,
  TenantProfile,
  formatDate,
} from "../../common/pdf/pdf-helpers";

// ---- Layout constants ----
const MARGIN = 40;
const PAGE_W = 595.28; // A4 width
const PAGE_H = 841.89; // A4 height
const CW = PAGE_W - MARGIN * 2; // content width
const DARK = "#1a1a2e";
const ACCENT = "#16213e";
const LIGHT_BG = "#f8f9fa";
const BORDER = "#cccccc";
const LABEL_CLR = "#555555";
const TOTAL_PAGES = 3;

// ---- Inline drawing helpers ----

function drawPageBorder(doc: any) {
  doc
    .save()
    .lineWidth(0.75)
    .strokeColor("#999999")
    .rect(MARGIN - 10, MARGIN - 10, CW + 20, PAGE_H - MARGIN * 2 + 20)
    .stroke()
    .restore();
}

function stampFooters(doc: any, printDate: string) {
  const footerY = 780;
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.save().fontSize(7).font("Helvetica").fillColor("#999999");
    doc.text(`Printed: ${printDate}`, MARGIN, footerY, {
      width: CW / 2,
      lineBreak: false,
    });
    doc.text(`Page ${i + 1} of ${TOTAL_PAGES}`, MARGIN, footerY, {
      width: CW,
      align: "right",
      lineBreak: false,
    });
    doc.restore();
  }
}

function drawCompanyHeader(doc: any, profile: TenantProfile): number {
  let y = MARGIN;
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor(DARK)
    .text(profile.name, MARGIN, y, { width: CW });
  y += 18;

  doc.fontSize(7).font("Helvetica").fillColor(LABEL_CLR);
  const parts: string[] = [];
  if (profile.addressLine1) parts.push(profile.addressLine1);
  if (profile.city || profile.postalCode)
    parts.push([profile.city, profile.postalCode].filter(Boolean).join(", "));
  if (profile.phone) parts.push(`Tel: ${profile.phone}`);
  if (profile.email) parts.push(profile.email);
  if (parts.length > 0) {
    doc.text(parts.join("  |  "), MARGIN, y, { width: CW });
    y += 10;
  }

  // Divider
  y += 2;
  doc
    .save()
    .lineWidth(1.5)
    .strokeColor(DARK)
    .moveTo(MARGIN, y)
    .lineTo(PAGE_W - MARGIN, y)
    .stroke()
    .restore();
  return y + 6;
}

function drawSectionBar(doc: any, title: string, y: number): number {
  const barH = 18;
  doc
    .save()
    .rect(MARGIN, y, CW, barH)
    .fill(ACCENT)
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
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

  // Outer border
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER)
    .rect(MARGIN, y, CW, rows * cellH)
    .stroke()
    .restore();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= fields.length) break;
      const field = fields[idx];
      const cellX = MARGIN + c * colW;
      const cellY = y + r * cellH;

      // Vertical dividers (skip first column)
      if (c > 0) {
        doc
          .save()
          .lineWidth(0.5)
          .strokeColor(BORDER)
          .moveTo(cellX, cellY)
          .lineTo(cellX, cellY + cellH)
          .stroke()
          .restore();
      }
      // Horizontal dividers (skip first row)
      if (r > 0) {
        doc
          .save()
          .lineWidth(0.5)
          .strokeColor(BORDER)
          .moveTo(MARGIN, cellY)
          .lineTo(MARGIN + CW, cellY)
          .stroke()
          .restore();
      }

      // Label
      doc
        .fontSize(6.5)
        .font("Helvetica")
        .fillColor(LABEL_CLR)
        .text(field.label, cellX + 4, cellY + 2, {
          width: colW - 8,
          lineBreak: false,
        });
      // Value — use smaller font if text is long relative to cell width
      const val = field.value || "-";
      const valFontSize = val.length > colW / 5 ? 7.5 : 8.5;
      doc
        .fontSize(valFontSize)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(val, cellX + 4, cellY + 11, {
          width: colW - 8,
          lineBreak: false,
        });
    }
  }

  return y + rows * cellH + 6;
}

function drawGridTable(
  doc: any,
  columns: {
    key: string;
    header: string;
    width: number;
    align?: "left" | "right" | "center";
  }[],
  rows: Record<string, string | number>[],
  startY: number,
): number {
  const rowH = 18;
  const headerH = 18;
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  let y = startY;

  // Header row
  doc.save().rect(MARGIN, y, totalW, headerH).fill(ACCENT);
  let x = MARGIN;
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff");
  for (const col of columns) {
    doc.text(col.header, x + 3, y + 5, {
      width: col.width - 6,
      align: col.align || "left",
      lineBreak: false,
    });
    x += col.width;
  }
  doc.restore();
  y += headerH;

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    // Page overflow — won't happen in our controlled layout but safety
    if (y + rowH > PAGE_H - MARGIN - 20) {
      doc.addPage();
      drawPageBorder(doc);
      y = MARGIN;
      // Redraw header
      doc.save().rect(MARGIN, y, totalW, headerH).fill(ACCENT);
      x = MARGIN;
      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff");
      for (const col of columns) {
        doc.text(col.header, x + 3, y + 5, {
          width: col.width - 6,
          align: col.align || "left",
          lineBreak: false,
        });
        x += col.width;
      }
      doc.restore();
      y += headerH;
    }

    // Alternating shade
    if (r % 2 === 0) {
      doc.save().rect(MARGIN, y, totalW, rowH).fill(LIGHT_BG).restore();
    }

    // Cell borders + text
    x = MARGIN;
    doc.fontSize(8).font("Helvetica").fillColor("#000000");
    for (const col of columns) {
      doc
        .save()
        .lineWidth(0.3)
        .strokeColor(BORDER)
        .rect(x, y, col.width, rowH)
        .stroke()
        .restore();
      const val = String(rows[r][col.key] ?? "");
      doc.text(val, x + 3, y + 5, {
        width: col.width - 6,
        align: col.align || "left",
        lineBreak: false,
      });
      x += col.width;
    }
    y += rowH;
  }

  // Bottom border
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER)
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + totalW, y)
    .stroke()
    .restore();

  return y + 4;
}

function drawFormField(
  doc: any,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h = 28,
): number {
  // Border
  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(BORDER)
    .rect(x, y, w, h)
    .stroke()
    .restore();
  // Label
  doc
    .fontSize(6.5)
    .font("Helvetica")
    .fillColor(LABEL_CLR)
    .text(label, x + 4, y + 2, { width: w - 8, lineBreak: false });
  // Value
  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor("#000000")
    .text(value, x + 4, y + 12, { width: w - 8, lineBreak: false });
  return y + h;
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
    drawFormField(doc, f.label, f.value, x, y, w, h);
    x += w;
  }
  return y + h;
}

function drawSignatureRow(doc: any, labels: string[], y: number): number {
  const h = 36;
  const colW = CW / labels.length;
  for (let i = 0; i < labels.length; i++) {
    const x = MARGIN + i * colW;
    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(BORDER)
      .rect(x, y, colW, h)
      .stroke()
      .restore();
    doc
      .fontSize(6.5)
      .font("Helvetica")
      .fillColor(LABEL_CLR)
      .text(labels[i], x + 4, y + 2, { width: colW - 8, lineBreak: false });
    // Signature line inside box
    doc
      .save()
      .lineWidth(0.3)
      .strokeColor("#aaaaaa")
      .moveTo(x + 4, y + h - 8)
      .lineTo(x + colW - 4, y + h - 8)
      .stroke()
      .restore();
  }
  return y + h;
}

// ---- Main service ----

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
    if (!wo) throw new NotFoundException("Work order not found");

    const profile = await this.tenantProfile.getProfile(tenantId);

    const itemResult = await this.pool.query(
      "SELECT sku, description FROM items WHERE id = $1",
      [wo.itemId],
    );
    const item = itemResult.rows[0] || { sku: "-", description: "-" };

    // BOM data
    let bomHeader: {
      version: number;
      revision: string;
      baseQty: number;
    } | null = null;
    let ingredientLines: Array<{
      lineNo: number;
      itemSku: string;
      itemDescription: string;
      scaledQty: number;
      bomPct: number;
      scrapPct: number;
    }> = [];
    let packagingLines: Array<{
      lineNo: number;
      itemSku: string;
      itemDescription: string;
      scaledQty: number;
      bomPct: number;
      scrapPct: number;
    }> = [];

    if (wo.bomHeaderId) {
      const header = await this.bomRepo.findHeaderById(wo.bomHeaderId);
      if (header) {
        bomHeader = {
          version: header.version,
          revision: header.revision,
          baseQty: header.baseQty,
        };
        const allLines = await this.bomRepo.getLines(wo.bomHeaderId);
        const scaleFactor = wo.qtyOrdered / (header.baseQty || 1);

        const ingredients = allLines.filter(
          (l) => l.category === "INGREDIENT" || !l.category,
        );
        const packaging = allLines.filter((l) => l.category === "PACKAGING");

        const ingredientTotal = ingredients.reduce(
          (sum, l) => sum + l.qtyPer,
          0,
        );
        const packagingTotal = packaging.reduce((sum, l) => sum + l.qtyPer, 0);

        ingredientLines = ingredients.map((l) => {
          const rawQty = l.qtyPer * scaleFactor * (1 + l.scrapPct / 100);
          return {
            lineNo: l.lineNo,
            itemSku: (l as any).itemSku || "-",
            itemDescription: (l as any).itemDescription || "-",
            scaledQty: Math.round(rawQty * 1000) / 1000,
            bomPct:
              ingredientTotal > 0 ? (l.qtyPer / ingredientTotal) * 100 : 0,
            scrapPct: l.scrapPct,
          };
        });

        packagingLines = packaging.map((l) => {
          const rawQty = l.qtyPer * scaleFactor * (1 + l.scrapPct / 100);
          return {
            lineNo: l.lineNo,
            itemSku: (l as any).itemSku || "-",
            itemDescription: (l as any).itemDescription || "-",
            scaledQty: Math.ceil(rawQty),
            bomPct: packagingTotal > 0 ? (l.qtyPer / packagingTotal) * 100 : 0,
            scrapPct: l.scrapPct,
          };
        });
      }
    }

    const [checks, process] = await Promise.all([
      this.productionDataRepo.findChecksByWorkOrder(workOrderId),
      this.productionDataRepo.findProcessByWorkOrder(workOrderId),
    ]);

    const doc = createPdfDocument({ bufferPages: true });
    const bufferPromise = pdfToBuffer(doc);
    const printDate = new Date().toLocaleString("en-ZA");

    // ================================================================
    //  PAGE 1 — PRODUCTION SHEET
    // ================================================================
    drawPageBorder(doc);
    let y = drawCompanyHeader(doc, profile);

    // Title bar
    doc.save().rect(MARGIN, y, CW, 22).fill(DARK);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("PRODUCTION SHEET", MARGIN, y + 5, { width: CW, align: "center" });
    doc.restore();
    y += 28;

    // Meta grid (4 cols top row, 4 cols second row)
    y = drawMetaGrid(
      doc,
      [
        { label: "Work Ticket No", value: wo.workOrderNo },
        { label: "FG Code", value: item.sku },
        { label: "Prod Size (kg)", value: String(wo.qtyOrdered) },
        { label: "Print Date", value: formatDate(new Date()) },
        { label: "Product", value: item.description },
        {
          label: "BOM Version",
          value: bomHeader
            ? `V${bomHeader.version} Rev ${bomHeader.revision}`
            : "-",
        },
        { label: "Batch No", value: wo.batchNo || "" },
        { label: "Status", value: wo.status },
      ],
      y,
      4,
    );

    // Ingredients
    if (ingredientLines.length > 0) {
      y = drawSectionBar(doc, "INGREDIENTS", y);
      y = drawGridTable(
        doc,
        [
          { key: "lineNo", header: "#", width: 28, align: "center" },
          { key: "code", header: "Code", width: 75 },
          { key: "description", header: "Description", width: 135 },
          { key: "trfQty", header: "Trf Qty (kg)", width: 65, align: "right" },
          { key: "bomPct", header: "BOM %", width: 50, align: "right" },
          { key: "actualQty", header: "Actual Qty", width: 65, align: "right" },
          { key: "batchNo", header: "Batch No", width: 97 },
        ],
        ingredientLines.map((l) => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 28),
          trfQty: l.scaledQty.toFixed(3),
          bomPct: l.bomPct.toFixed(1),
          actualQty: "",
          batchNo: "",
        })),
        y,
      );
    }

    // Packaging
    if (packagingLines.length > 0) {
      y = drawSectionBar(doc, "PACKAGING", y);
      y = drawGridTable(
        doc,
        [
          { key: "lineNo", header: "#", width: 28, align: "center" },
          { key: "code", header: "Code", width: 75 },
          { key: "description", header: "Description", width: 135 },
          { key: "trfQty", header: "Trf Qty", width: 65, align: "right" },
          { key: "bomPct", header: "BOM %", width: 50, align: "right" },
          { key: "actualQty", header: "Actual Qty", width: 65, align: "right" },
          { key: "batchNo", header: "Batch No", width: 97 },
        ],
        packagingLines.map((l) => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 28),
          trfQty: l.scaledQty.toFixed(0),
          bomPct: l.bomPct.toFixed(1),
          actualQty: "",
          batchNo: "",
        })),
        y,
      );
    }

    // Production Tracking
    y = drawSectionBar(doc, "PRODUCTION TRACKING", y);
    y = drawFormFieldRow(
      doc,
      [
        { label: "Start Time", value: "" },
        { label: "End Time", value: "" },
        { label: "Pallet Weight", value: "" },
      ],
      y,
    );
    y += 6;

    // Signatures
    y = drawSignatureRow(
      doc,
      ["Prepared By", "Date", "Departmental Signature", "Date"],
      y,
    );

    // ================================================================
    //  PAGE 2 — TIPPING CHECK SHEET
    // ================================================================
    doc.addPage();
    drawPageBorder(doc);
    y = drawCompanyHeader(doc, profile);

    doc.save().rect(MARGIN, y, CW, 22).fill(DARK);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("TIPPING CHECK SHEET", MARGIN, y + 5, {
        width: CW,
        align: "center",
      });
    doc.restore();
    y += 28;

    // Compact meta
    y = drawMetaGrid(
      doc,
      [
        { label: "Work Ticket No", value: wo.workOrderNo },
        { label: "Product", value: `${item.sku} - ${item.description}` },
        { label: "Batch No", value: wo.batchNo || "" },
        { label: "Date", value: formatDate(new Date()) },
      ],
      y,
      4,
    );

    // Ingredients tipping
    if (ingredientLines.length > 0) {
      y = drawSectionBar(doc, "INGREDIENTS", y);
      y = drawGridTable(
        doc,
        [
          { key: "lineNo", header: "#", width: 28, align: "center" },
          { key: "code", header: "Code", width: 80 },
          { key: "description", header: "Description", width: 155 },
          { key: "trfQty", header: "Trf Qty (kg)", width: 70, align: "right" },
          { key: "check", header: "Check", width: 50, align: "center" },
          { key: "tippedBy", header: "Tipped By", width: 132 },
        ],
        ingredientLines.map((l) => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 32),
          trfQty: l.scaledQty.toFixed(3),
          check: "",
          tippedBy: "",
        })),
        y,
      );
    }

    // Packaging tipping
    if (packagingLines.length > 0) {
      y = drawSectionBar(doc, "PACKAGING", y);
      y = drawGridTable(
        doc,
        [
          { key: "lineNo", header: "#", width: 28, align: "center" },
          { key: "code", header: "Code", width: 80 },
          { key: "description", header: "Description", width: 155 },
          { key: "trfQty", header: "Trf Qty", width: 70, align: "right" },
          { key: "check", header: "Check", width: 50, align: "center" },
          { key: "tippedBy", header: "Tipped By", width: 132 },
        ],
        packagingLines.map((l) => ({
          lineNo: l.lineNo,
          code: l.itemSku,
          description: l.itemDescription.substring(0, 32),
          trfQty: l.scaledQty.toFixed(0),
          check: "",
          tippedBy: "",
        })),
        y,
      );
    }

    // Rework section
    y = drawSectionBar(doc, "REWORK", y);
    y = drawFormFieldRow(
      doc,
      [
        {
          label: "Rework Product",
          value: checks?.reworkProduct || "",
          flex: 2,
        },
        {
          label: "Rework Qty (kgs)",
          value:
            checks?.reworkQtyKgs != null ? String(checks.reworkQtyKgs) : "",
        },
      ],
      y,
    );
    y += 4;

    // Box count
    y = drawSectionBar(doc, "BOX COUNT", y);
    y = drawFormFieldRow(
      doc,
      [
        {
          label: "Theoretical Boxes",
          value:
            checks?.theoreticalBoxes != null
              ? String(checks.theoreticalBoxes)
              : "",
        },
        {
          label: "Actual Boxes",
          value: checks?.actualBoxes != null ? String(checks.actualBoxes) : "",
        },
        {
          label: "Actual Overs",
          value: checks?.actualOvers != null ? String(checks.actualOvers) : "",
        },
      ],
      y,
    );
    y = drawFormFieldRow(
      doc,
      [
        {
          label: "Actual Total",
          value: checks?.actualTotal != null ? String(checks.actualTotal) : "",
        },
        {
          label: "Diff to Theoretical",
          value:
            checks?.diffToTheoretical != null
              ? String(checks.diffToTheoretical)
              : "",
        },
      ],
      y,
    );
    y += 6;

    // Signatures
    y = drawSignatureRow(
      doc,
      ["Loader", "Date", "Operations Manager", "Date"],
      y,
    );

    // ================================================================
    //  PAGE 3 — PRODUCTION PROCESS
    // ================================================================
    doc.addPage();
    drawPageBorder(doc);
    y = drawCompanyHeader(doc, profile);

    doc.save().rect(MARGIN, y, CW, 22).fill(DARK);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#ffffff")
      .text("PRODUCTION PROCESS", MARGIN, y + 5, {
        width: CW,
        align: "center",
      });
    doc.restore();
    y += 28;

    // Meta
    y = drawMetaGrid(
      doc,
      [
        { label: "Work Ticket No", value: wo.workOrderNo },
        { label: "Product", value: `${item.sku} - ${item.description}` },
      ],
      y,
      2,
    );

    // Instructions
    y = drawSectionBar(doc, "INSTRUCTIONS", y);
    const instructions = process?.instructions || "";
    if (instructions) {
      // Bordered instructions box
      doc.fontSize(8.5).font("Helvetica").fillColor("#000000");
      const textH = doc.heightOfString(instructions, { width: CW - 10 });
      const boxH = Math.max(textH + 10, 30);
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER)
        .rect(MARGIN, y, CW, boxH)
        .stroke()
        .restore();
      doc.text(instructions, MARGIN + 5, y + 5, { width: CW - 10 });
      y += boxH + 4;
    } else {
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(BORDER)
        .rect(MARGIN, y, CW, 24)
        .stroke()
        .restore();
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(LABEL_CLR)
        .text("(No instructions provided)", MARGIN + 5, y + 7, {
          width: CW - 10,
        });
      y += 28;
    }

    // Specs table
    const specsJson = process?.specsJson ?? {};
    const specsEntries = Object.entries(specsJson);
    if (specsEntries.length > 0) {
      y = drawSectionBar(doc, "SPECIFICATIONS", y);
      y = drawGridTable(
        doc,
        [
          { key: "parameter", header: "Parameter", width: 200 },
          { key: "value", header: "Value", width: 315 },
        ],
        specsEntries.map(([k, v]) => ({
          parameter: k,
          value: String(v ?? ""),
        })),
        y,
      );
    }

    // Process details
    y = drawSectionBar(doc, "PROCESS DETAILS", y);
    y = drawFormFieldRow(
      doc,
      [
        { label: "Operator", value: process?.operator || "" },
        { label: "Pot Used", value: process?.potUsed || "" },
      ],
      y,
    );
    y = drawFormFieldRow(
      doc,
      [
        {
          label: "Time Started",
          value: process?.timeStarted ? formatDate(process.timeStarted) : "",
        },
        {
          label: "Time 85\u00B0C",
          value: process?.time85c ? formatDate(process.time85c) : "",
        },
      ],
      y,
    );
    y = drawFormFieldRow(
      doc,
      [
        {
          label: "Time Flavour Added",
          value: process?.timeFlavourAdded
            ? formatDate(process.timeFlavourAdded)
            : "",
        },
        {
          label: "Time Completed",
          value: process?.timeCompleted
            ? formatDate(process.timeCompleted)
            : "",
        },
      ],
      y,
    );
    y += 4;

    // Additions
    y = drawSectionBar(doc, "ADDITIONS & COMMENTS", y);
    y = drawFormFieldRow(
      doc,
      [
        { label: "Additions", value: process?.additions || "", flex: 2 },
        {
          label: "Reason for Addition",
          value: process?.reasonForAddition || "",
          flex: 2,
        },
      ],
      y,
    );
    y = drawFormFieldRow(
      doc,
      [{ label: "Comments", value: process?.comments || "" }],
      y,
      36,
    );
    y += 6;

    // Signature
    y = drawSignatureRow(doc, ["Operator Signature", "Date"], y);

    // Stamp footers on all pages (using switchToPage to avoid auto-pagination)
    stampFooters(doc, printDate);

    doc.end();
    return bufferPromise;
  }
}
