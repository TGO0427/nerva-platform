import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { DATABASE_POOL } from "../../common/db/database.module";
import { WorkOrderRepository } from "./repositories/work-order.repository";
import { ProductionDataRepository } from "./repositories/production-data.repository";
import { TenantProfileService } from "../../common/pdf/tenant-profile.service";
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
  formatDateTime,
} from "../../common/pdf/pdf-helpers";

@Injectable()
export class WorkOrderPdfService {
  constructor(
    private readonly repository: WorkOrderRepository,
    private readonly productionDataRepo: ProductionDataRepository,
    private readonly tenantProfile: TenantProfileService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async generate(workOrderId: string, tenantId: string): Promise<Buffer> {
    const wo = await this.repository.findById(workOrderId);
    if (!wo) throw new NotFoundException("Work order not found");

    const materials = await this.repository.getMaterials(workOrderId);
    const operations = await this.repository.getOperations(workOrderId);
    const checks = await this.productionDataRepo.findChecksByWorkOrder(workOrderId);
    const process = await this.productionDataRepo.findProcessByWorkOrder(workOrderId);
    const profile = await this.tenantProfile.getProfile(tenantId);

    // Get item details (product being manufactured)
    const itemResult = await this.pool.query(
      "SELECT sku, description FROM items WHERE id = $1",
      [wo.itemId],
    );
    const item = itemResult.rows[0] || { sku: "-", description: "-" };

    // Get warehouse name
    const warehouseResult = await this.pool.query(
      "SELECT name FROM warehouses WHERE id = $1",
      [wo.warehouseId],
    );
    const warehouseName = warehouseResult.rows[0]?.name || "-";

    const doc = createPdfDocument();
    const bufferPromise = pdfToBuffer(doc);

    // Company header
    let y = renderCompanyHeader(doc, profile);

    // Document title
    y = renderDocumentTitle(doc, "WORK ORDER", y);

    // Meta info
    y = renderDocumentMeta(
      doc,
      [
        { label: "WO Number", value: wo.workOrderNo },
        { label: "Date", value: formatDate(wo.createdAt) },
      ],
      [
        { label: "Status", value: wo.status },
        { label: "Priority", value: String(wo.priority) },
        { label: "Output Batch", value: wo.batchNo || "-" },
        ...(wo.salesOrderId
          ? [{ label: "Sales Order", value: wo.salesOrderNo || wo.salesOrderId }]
          : []),
      ],
      y,
    );

    y += 5;

    // Product info
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text("Product: ", 40, y, { continued: true });
    doc.font("Helvetica").text(`${item.sku} - ${item.description}`);
    y += 14;

    doc
      .font("Helvetica-Bold")
      .text("Qty Ordered: ", 40, y, { continued: true });
    doc.font("Helvetica").text(String(wo.qtyOrdered));
    y += 14;

    doc.font("Helvetica-Bold").text("Warehouse: ", 40, y, { continued: true });
    doc.font("Helvetica").text(warehouseName);
    y += 18;

    // Planned dates
    doc
      .font("Helvetica-Bold")
      .text("Planned Start: ", 40, y, { continued: true });
    doc.font("Helvetica").text(formatDate(wo.plannedStart));
    doc
      .font("Helvetica-Bold")
      .text("Planned End: ", 340, y, { continued: true });
    doc.font("Helvetica").text(formatDate(wo.plannedEnd));
    y += 20;

    // Materials table
    if (materials.length > 0) {
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Materials", 40, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: "sku", header: "SKU", width: 75 },
          { key: "description", header: "Description", width: 150 },
          { key: "batchNo", header: "Batch/Lot No", width: 90 },
          {
            key: "qtyRequired",
            header: "Qty Required",
            width: 65,
            align: "right",
          },
          { key: "qtyIssued", header: "Qty Issued", width: 60, align: "right" },
          { key: "status", header: "Status", width: 75 },
        ],
        rows: materials.map((mat) => ({
          sku: mat.itemSku || "-",
          description: (mat.itemDescription || "-").substring(0, 28),
          batchNo: mat.batchNo || "-",
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

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Operations", 40, y);
      y += 16;

      y = renderTable(doc, {
        columns: [
          { key: "opNo", header: "Op #", width: 40, align: "center" },
          { key: "name", header: "Name", width: 130 },
          { key: "workstation", header: "Workstation", width: 120 },
          { key: "assignedTo", header: "Assigned To", width: 110 },
          { key: "status", header: "Status", width: 115 },
        ],
        rows: operations.map((op) => ({
          opNo: String(op.operationNo),
          name: op.name,
          workstation: op.workstationName || op.workstationCode || "-",
          assignedTo: op.assignedUserName || "-",
          status: op.status,
        })),
        startY: y,
      });
    }

    // Production Process log - how the batch was actually run (who, which
    // vessel, and the key process timestamps like reaching 85C), distinct
    // from the Tipping Check Sheet's end-of-run yield count below.
    if (process) {
      if (y > 600) {
        doc.addPage();
        y = 40;
      }
      y += 10;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Production Process", 40, y);
      y += 16;

      y = renderDocumentMeta(
        doc,
        [
          { label: "Operator", value: process.operator || "-" },
          { label: "Time Started", value: formatDateTime(process.timeStarted) },
          { label: "Time Flavour Added", value: formatDateTime(process.timeFlavourAdded) },
        ],
        [
          { label: "Pot Used", value: process.potUsed || "-" },
          { label: "Time 85C", value: formatDateTime(process.time85c) },
          { label: "Time Completed", value: formatDateTime(process.timeCompleted) },
        ],
        y,
      );
      y += 5;

      const renderWrappedField = (label: string, value: string | null) => {
        if (!value) return;
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000").text(`${label}:`, 40, y);
        y += 12;
        doc.font("Helvetica").text(value, 40, y, { width: 515 });
        y += doc.heightOfString(value, { width: 515 }) + 8;
      };
      renderWrappedField("Instructions", process.instructions);
      renderWrappedField("Additions", process.additions);
      renderWrappedField("Reason for Addition", process.reasonForAddition);
      renderWrappedField("Comments", process.comments);
      y += 2;
    }

    // Tipping Check Sheet - the yield reconciliation and sign-off captured
    // when the batch was packed off, so the paper trail includes not just
    // what was made but whether the count matched what was planned.
    if (checks) {
      if (y > 620) {
        doc.addPage();
        y = 40;
      }
      y += 10;

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Tipping Check Sheet", 40, y);
      y += 16;

      y = renderDocumentMeta(
        doc,
        [
          { label: "Theoretical Boxes", value: checks.theoreticalBoxes != null ? String(checks.theoreticalBoxes) : "-" },
          { label: "Actual Boxes", value: checks.actualBoxes != null ? String(checks.actualBoxes) : "-" },
          { label: "Actual Overs", value: checks.actualOvers != null ? String(checks.actualOvers) : "-" },
          { label: "Actual Total", value: checks.actualTotal != null ? String(checks.actualTotal) : "-" },
        ],
        [
          { label: "Diff to Theoretical", value: checks.diffToTheoretical != null ? String(checks.diffToTheoretical) : "-" },
          { label: "Rework Product", value: checks.reworkProduct || "-" },
          { label: "Rework Qty (kgs)", value: checks.reworkQtyKgs != null ? String(checks.reworkQtyKgs) : "-" },
        ],
        y,
      );
      y += 5;

      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Loader Signature: ", 40, y, { continued: true });
      doc.font("Helvetica").text(checks.loaderSignature || "-");
      doc
        .font("Helvetica-Bold")
        .text("Operations Manager Signature: ", 300, y, { continued: true });
      doc.font("Helvetica").text(checks.operationsManagerSignature || "-");
      y += 18;
    }

    // Notes
    y = renderNotes(doc, wo.notes, y);

    // Signature block
    renderSignatureBlock(doc, y, "Supervisor", "Date");

    doc.end();
    return bufferPromise;
  }
}
