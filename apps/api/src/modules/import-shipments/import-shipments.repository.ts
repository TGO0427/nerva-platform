import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/db/base.repository";

export interface ImportShipment {
  id: string;
  tenantId: string;
  siteId: string | null;
  reference: string;
  supplierId: string;
  supplierName: string | null;
  transportMode: string;
  carrier: string | null;
  vesselOrAwb: string | null;
  destinationPort: string | null;
  etaDate: Date | null;
  status: string;
  quantity: number | null;
  cbm: number | null;
  palletQty: number | null;
  incoterm: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportShipmentFilters {
  status?: string;
  search?: string;
}

@Injectable()
export class ImportShipmentsRepository extends BaseRepository {
  async create(data: {
    tenantId: string;
    siteId?: string | null;
    reference: string;
    supplierId: string;
    transportMode?: string;
    carrier?: string;
    vesselOrAwb?: string;
    destinationPort?: string;
    etaDate?: Date | null;
    status?: string;
    quantity?: number;
    cbm?: number;
    palletQty?: number;
    incoterm?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<ImportShipment> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO import_shipments (
        tenant_id, site_id, reference, supplier_id, transport_mode, carrier,
        vessel_or_awb, destination_port, eta_date, status, quantity, cbm,
        pallet_qty, incoterm, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.tenantId,
        data.siteId || null,
        data.reference,
        data.supplierId,
        data.transportMode || "SEA",
        data.carrier || null,
        data.vesselOrAwb || null,
        data.destinationPort || null,
        data.etaDate || null,
        data.status || "PLANNED",
        data.quantity ?? null,
        data.cbm ?? null,
        data.palletQty ?? null,
        data.incoterm || null,
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapShipment(row!);
  }

  async findById(id: string): Promise<ImportShipment | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT s.*, sup.name as supplier_name
       FROM import_shipments s
       LEFT JOIN suppliers sup ON sup.id = s.supplier_id AND sup.tenant_id = s.tenant_id
       WHERE s.id = $1`,
      [id],
    );
    return row ? this.mapShipment(row) : null;
  }

  async findByTenant(
    tenantId: string,
    filters: ImportShipmentFilters,
    limit = 50,
    offset = 0,
  ): Promise<ImportShipment[]> {
    const { sql, params } = this.buildWhereClause(tenantId, filters);
    let idx = params.length + 1;

    const query = `SELECT s.*, sup.name as supplier_name
       FROM import_shipments s
       LEFT JOIN suppliers sup ON sup.id = s.supplier_id AND sup.tenant_id = s.tenant_id
       ${sql}
       ORDER BY s.eta_date ASC NULLS LAST, s.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(query, params);
    return rows.map(this.mapShipment);
  }

  async countByTenant(
    tenantId: string,
    filters: ImportShipmentFilters,
  ): Promise<number> {
    const { sql, params } = this.buildWhereClause(tenantId, filters);
    const result = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM import_shipments s
       LEFT JOIN suppliers sup ON sup.id = s.supplier_id AND sup.tenant_id = s.tenant_id
       ${sql}`,
      params,
    );
    return parseInt(result?.count || "0", 10);
  }

  private buildWhereClause(
    tenantId: string,
    filters: ImportShipmentFilters,
  ): { sql: string; params: unknown[] } {
    let sql = `WHERE s.tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND s.status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.search) {
      sql += ` AND (s.reference ILIKE $${idx} OR sup.name ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    return { sql, params };
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
  ): Promise<ImportShipment | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, unknown> = {
      site_id: data.siteId,
      supplier_id: data.supplierId,
      transport_mode: data.transportMode,
      carrier: data.carrier,
      vessel_or_awb: data.vesselOrAwb,
      destination_port: data.destinationPort,
      eta_date: data.etaDate,
      quantity: data.quantity,
      cbm: data.cbm,
      pallet_qty: data.palletQty,
      incoterm: data.incoterm,
      notes: data.notes,
    };

    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        sets.push(`${column} = $${idx++}`);
        params.push(value);
      }
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await this.execute(
      `UPDATE import_shipments SET ${sets.join(", ")} WHERE id = $${idx}`,
      params,
    );
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: string,
  ): Promise<ImportShipment | null> {
    await this.execute(
      "UPDATE import_shipments SET status = $1 WHERE id = $2",
      [status, id],
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.execute(
      "DELETE FROM import_shipments WHERE id = $1",
      [id],
    );
    return count > 0;
  }

  private mapShipment(row: Record<string, unknown>): ImportShipment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string | null,
      reference: row.reference as string,
      supplierId: row.supplier_id as string,
      supplierName: (row.supplier_name as string) || null,
      transportMode: row.transport_mode as string,
      carrier: row.carrier as string | null,
      vesselOrAwb: row.vessel_or_awb as string | null,
      destinationPort: row.destination_port as string | null,
      etaDate: row.eta_date as Date | null,
      status: row.status as string,
      quantity: row.quantity !== null ? parseFloat(row.quantity as string) : null,
      cbm: row.cbm !== null ? parseFloat(row.cbm as string) : null,
      palletQty:
        row.pallet_qty !== null ? parseFloat(row.pallet_qty as string) : null,
      incoterm: row.incoterm as string | null,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
