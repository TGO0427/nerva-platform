import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import {
  ImportShipmentsRepository,
  ImportShipment,
} from "./import-shipments.repository";
import { buildPaginatedResult } from "../../common/utils/pagination";

const VALID_STATUSES = [
  "PLANNED",
  "IN_TRANSIT",
  "ARRIVED",
  "DELAYED",
  "CANCELLED",
];

@Injectable()
export class ImportShipmentsService {
  constructor(private readonly repository: ImportShipmentsRepository) {}

  async create(data: {
    tenantId: string;
    siteId?: string | null;
    reference: string;
    supplierId: string;
    transportMode?: string;
    carrier?: string;
    vesselOrAwb?: string;
    destinationPort?: string;
    etaDate?: Date;
    quantity?: number;
    cbm?: number;
    palletQty?: number;
    incoterm?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<ImportShipment> {
    return this.repository.create(data);
  }

  async get(id: string): Promise<ImportShipment> {
    const shipment = await this.repository.findById(id);
    if (!shipment) throw new NotFoundException("Shipment not found");
    return shipment;
  }

  async list(
    tenantId: string,
    filters: { status?: string; search?: string },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repository.findByTenant(tenantId, filters, limit, offset),
      this.repository.countByTenant(tenantId, filters),
    ]);
    return buildPaginatedResult(data, total, page, limit);
  }

  async update(
    id: string,
    data: {
      siteId?: string | null;
      supplierId?: string;
      transportMode?: string;
      carrier?: string | null;
      vesselOrAwb?: string | null;
      destinationPort?: string | null;
      etaDate?: Date | null;
      quantity?: number | null;
      cbm?: number | null;
      palletQty?: number | null;
      incoterm?: string | null;
      notes?: string | null;
    },
  ): Promise<ImportShipment> {
    await this.get(id);
    const updated = await this.repository.update(id, data);
    return updated!;
  }

  async updateStatus(id: string, status: string): Promise<ImportShipment> {
    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    await this.get(id);
    const updated = await this.repository.updateStatus(id, status);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.repository.delete(id);
  }
}
