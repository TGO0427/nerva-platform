import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ALL_IMPORT_SHIPMENT_STATUSES, INSPECTION_FAILURE_REASONS } from "@nerva/shared";
import {
  ImportShipmentsRepository,
  ImportShipmentDetail,
  ImportShipmentLineInput,
  ImportShipmentLineRow,
} from "./import-shipments.repository";
import { buildPaginatedResult, normalizePagination } from "../../common/utils/pagination";
import { InventoryService } from "../inventory/inventory.service";
import { CurrentUserData } from "../../common/decorators/current-user.decorator";

const INSPECTION_REASON_LABELS: Record<string, string> = Object.fromEntries(
  INSPECTION_FAILURE_REASONS.map((r) => [r.value, r.label]),
);

@Injectable()
export class ImportShipmentsService {
  constructor(
    private readonly repository: ImportShipmentsRepository,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(
    tenantId: string,
    data: {
      siteId?: string | null;
      reference: string;
      supplierId: string;
      incoterm?: string;
      notes?: string;
      purchaseOrderId?: string | null;
      createdBy?: string;
      lines: ImportShipmentLineInput[];
    },
  ): Promise<ImportShipmentDetail> {
    const { lines, ...header } = data;
    return this.repository.createWithLines(tenantId, header, lines);
  }

  async get(id: string, tenantId: string): Promise<ImportShipmentDetail> {
    const shipment = await this.repository.findDetailById(id, tenantId);
    if (!shipment) throw new NotFoundException("Shipment not found");
    return shipment;
  }

  async list(
    tenantId: string,
    filters: { status?: string; search?: string; weekFrom?: number; weekTo?: number },
    rawPage?: number,
    rawLimit?: number,
  ) {
    const { page, limit, offset } = normalizePagination({ page: rawPage, limit: rawLimit });
    const [data, total] = await Promise.all([
      this.repository.listFlattened(tenantId, filters, limit, offset),
      this.repository.countFlattened(tenantId, filters),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      reference?: string;
      supplierId?: string;
      siteId?: string | null;
      incoterm?: string | null;
      notes?: string | null;
      lines?: ImportShipmentLineInput[];
    },
  ): Promise<ImportShipmentDetail> {
    await this.get(id, tenantId);
    const { lines, ...header } = data;
    await this.repository.updateHeader(id, tenantId, header);
    if (lines !== undefined) {
      await this.repository.replaceLines(id, tenantId, lines);
    }
    return this.get(id, tenantId);
  }

  async updateLineStatus(
    shipmentId: string,
    lineId: string,
    tenantId: string,
    status: string,
  ): Promise<ImportShipmentLineRow> {
    if (!ALL_IMPORT_SHIPMENT_STATUSES.includes(status as any)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    await this.get(shipmentId, tenantId);
    const updated = await this.repository.updateLineStatus(
      shipmentId,
      lineId,
      tenantId,
      status,
    );
    if (!updated) throw new NotFoundException("Shipment line not found");
    return updated;
  }

  async completeInspection(
    shipmentId: string,
    lineId: string,
    tenantId: string,
    data: { passed: boolean; reason?: string; notes?: string },
    user: CurrentUserData,
  ): Promise<ImportShipmentLineRow> {
    const shipment = await this.get(shipmentId, tenantId);
    if (!data.passed && !data.reason) {
      throw new BadRequestException("Reason is required when inspection fails");
    }

    let ncrId: string | undefined;
    if (!data.passed) {
      const reasonLabel = data.reason ? INSPECTION_REASON_LABELS[data.reason] : undefined;
      const description = `Inspection failed on shipment ${shipment.reference}: ${reasonLabel || data.reason}${data.notes ? ` — ${data.notes}` : ""}`;
      ncrId = await this.repository.createNcrForFailedInspection(
        tenantId,
        shipment.supplierId,
        description,
        user.id,
      );
    }

    const updated = await this.repository.completeInspection(shipmentId, lineId, tenantId, {
      status: data.passed ? "INSPECTION_PASSED" : "INSPECTION_FAILED",
      reason: data.reason,
      notes: data.notes,
      inspectedBy: user.displayName,
      ncrId,
    });
    if (!updated) throw new NotFoundException("Shipment line not found");
    return updated;
  }

  async startReceiving(
    shipmentId: string,
    lineId: string,
    tenantId: string,
    data: { warehouseId?: string },
  ): Promise<ImportShipmentLineRow> {
    const shipment = await this.get(shipmentId, tenantId);
    const line = shipment.lines.find((l) => l.id === lineId);
    if (!line) throw new NotFoundException("Shipment line not found");

    let grnId: string | undefined;
    if (line.itemId) {
      if (!data.warehouseId) {
        throw new BadRequestException("Warehouse is required to receive a linked item");
      }
      const grn = await this.inventoryService.createGrn({
        tenantId,
        warehouseId: data.warehouseId,
        supplierId: shipment.supplierId,
        notes: `Auto-created from import shipment ${shipment.reference}`,
      });
      grnId = grn.id;
    }

    const updated = await this.repository.startReceiving(shipmentId, lineId, tenantId, { grnId });
    if (!updated) throw new NotFoundException("Shipment line not found");
    return updated;
  }

  async completeReceiving(
    shipmentId: string,
    lineId: string,
    tenantId: string,
    data: {
      receivedQty?: number;
      binId?: string;
      binLocation?: string;
      batchNo?: string;
      expiryDate?: string;
      discrepancyNotes?: string;
    },
    user: CurrentUserData,
  ): Promise<ImportShipmentLineRow> {
    const shipment = await this.get(shipmentId, tenantId);
    const line = shipment.lines.find((l) => l.id === lineId);
    if (!line) throw new NotFoundException("Shipment line not found");

    if (line.grnId) {
      if (!data.receivedQty || !data.binId) {
        throw new BadRequestException("Quantity and bin are required");
      }
      await this.inventoryService.receiveGrnLine(line.grnId, {
        tenantId,
        itemId: line.itemId!,
        qtyReceived: data.receivedQty,
        batchNo: data.batchNo,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        receivingBinId: data.binId,
        createdBy: user.id,
      });
      await this.inventoryService.completeGrn(line.grnId);
    }

    const updated = await this.repository.completeReceiving(shipmentId, lineId, tenantId, {
      receivedQty: data.receivedQty,
      receivingBinLocation: line.grnId ? undefined : data.binLocation,
      discrepancyNotes: data.discrepancyNotes,
      receivedBy: user.displayName,
    });
    if (!updated) throw new NotFoundException("Shipment line not found");
    return updated;
  }

  async updateLine(
    shipmentId: string,
    lineId: string,
    tenantId: string,
    data: Partial<ImportShipmentLineInput>,
  ): Promise<ImportShipmentLineRow> {
    if (data.status && !ALL_IMPORT_SHIPMENT_STATUSES.includes(data.status as any)) {
      throw new BadRequestException(`Invalid status: ${data.status}`);
    }
    await this.get(shipmentId, tenantId);
    const updated = await this.repository.updateLine(shipmentId, lineId, tenantId, data);
    if (!updated) throw new NotFoundException("Shipment line not found");
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.get(id, tenantId);
    await this.repository.delete(id, tenantId);
  }
}
