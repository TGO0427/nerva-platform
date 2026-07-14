import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ALL_IMPORT_SHIPMENT_STATUSES } from "@nerva/shared";
import {
  ImportShipmentsRepository,
  ImportShipmentDetail,
  ImportShipmentLineInput,
  ImportShipmentLineRow,
} from "./import-shipments.repository";
import { buildPaginatedResult, normalizePagination } from "../../common/utils/pagination";

@Injectable()
export class ImportShipmentsService {
  constructor(private readonly repository: ImportShipmentsRepository) {}

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
