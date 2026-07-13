import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { BaseRepository } from "../../common/db/base.repository";

export interface ImportShipmentHeaderRow {
  id: string;
  tenantId: string;
  siteId: string | null;
  reference: string;
  supplierId: string;
  supplierName: string | null;
  incoterm: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportShipmentLineRow {
  id: string;
  importShipmentId: string;
  lineNo: number;
  productDescription: string;
  itemId: string | null;
  quantity: number | null;
  cbm: number | null;
  palletQty: number | null;
  transportMode: string;
  carrier: string | null;
  vesselOrAwb: string | null;
  destinationPort: string | null;
  status: string;
  weekStartDate: Date | null;
  weekEndDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportShipmentDetail = ImportShipmentHeaderRow & {
  lines: ImportShipmentLineRow[];
};

export type FlattenedImportShipmentLine = ImportShipmentLineRow & {
  reference: string;
  supplierId: string;
  supplierName: string | null;
  incoterm: string | null;
};

export interface ImportShipmentLineInput {
  productDescription: string;
  itemId?: string | null;
  quantity?: number | null;
  cbm?: number | null;
  palletQty?: number | null;
  transportMode?: string;
  carrier?: string | null;
  vesselOrAwb?: string | null;
  destinationPort?: string | null;
  status?: string;
  weekStartDate?: Date | null;
  weekEndDate?: Date | null;
  notes?: string | null;
}

export interface ImportShipmentFilters {
  status?: string;
  search?: string;
  weekFrom?: number;
  weekTo?: number;
}

const DEFAULT_STATUS_BY_MODE: Record<string, string> = {
  AIR: "PLANNED_AIRFREIGHT",
  SEA: "PLANNED_SEAFREIGHT",
  ROAD: "PLANNED_SEAFREIGHT",
};

@Injectable()
export class ImportShipmentsRepository extends BaseRepository {
  async createWithLines(
    tenantId: string,
    header: {
      siteId?: string | null;
      reference: string;
      supplierId: string;
      incoterm?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
    lines: ImportShipmentLineInput[],
  ): Promise<ImportShipmentDetail> {
    return this.transaction(async (client) => {
      const headerResult = await (client as unknown as Pool).query(
        `INSERT INTO import_shipments (
          tenant_id, site_id, reference, supplier_id, incoterm, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tenantId,
          header.siteId || null,
          header.reference,
          header.supplierId,
          header.incoterm || null,
          header.notes || null,
          header.createdBy || null,
        ],
      );
      const headerRow = headerResult.rows[0];

      const lineRows = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const transportMode = line.transportMode || "SEA";
        const result = await (client as unknown as Pool).query(
          `INSERT INTO import_shipment_lines (
            tenant_id, import_shipment_id, line_no, product_description, item_id,
            quantity, cbm, pallet_qty, transport_mode, carrier, vessel_or_awb,
            destination_port, status, week_start_date, week_end_date, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            tenantId,
            headerRow.id,
            i + 1,
            line.productDescription,
            line.itemId || null,
            line.quantity ?? null,
            line.cbm ?? null,
            line.palletQty ?? null,
            transportMode,
            line.carrier || null,
            line.vesselOrAwb || null,
            line.destinationPort || null,
            line.status || DEFAULT_STATUS_BY_MODE[transportMode],
            line.weekStartDate || null,
            line.weekEndDate || null,
            line.notes || null,
          ],
        );
        lineRows.push(result.rows[0]);
      }

      return this.mapDetail(headerRow, lineRows);
    });
  }

  async findDetailById(
    id: string,
    tenantId: string,
  ): Promise<ImportShipmentDetail | null> {
    const headerRow = await this.queryOne<Record<string, unknown>>(
      `SELECT s.*, sup.name as supplier_name
       FROM import_shipments s
       LEFT JOIN suppliers sup ON sup.id = s.supplier_id AND sup.tenant_id = s.tenant_id
       WHERE s.id = $1 AND s.tenant_id = $2`,
      [id, tenantId],
    );
    if (!headerRow) return null;

    const lineRows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM import_shipment_lines
       WHERE import_shipment_id = $1 AND tenant_id = $2
       ORDER BY line_no ASC`,
      [id, tenantId],
    );

    return this.mapDetail(headerRow, lineRows);
  }

  async listFlattened(
    tenantId: string,
    filters: ImportShipmentFilters,
    limit = 50,
    offset = 0,
  ): Promise<FlattenedImportShipmentLine[]> {
    const { sql, params } = this.buildWhereClause(tenantId, filters);
    let idx = params.length + 1;

    const query = `SELECT l.*, s.reference, s.supplier_id, s.incoterm, sup.name as supplier_name
       FROM import_shipment_lines l
       JOIN import_shipments s ON s.id = l.import_shipment_id
       LEFT JOIN suppliers sup ON sup.id = s.supplier_id AND sup.tenant_id = s.tenant_id
       ${sql}
       ORDER BY l.week_start_date ASC NULLS LAST, s.created_at DESC, l.line_no ASC
       LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(query, params);
    return rows.map((r) => this.mapFlattenedLine(r));
  }

  async countFlattened(
    tenantId: string,
    filters: ImportShipmentFilters,
  ): Promise<number> {
    const { sql, params } = this.buildWhereClause(tenantId, filters);
    const result = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM import_shipment_lines l
       JOIN import_shipments s ON s.id = l.import_shipment_id
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
    let sql = `WHERE l.tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND l.status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.search) {
      sql += ` AND (s.reference ILIKE $${idx} OR sup.name ILIKE $${idx} OR l.product_description ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.weekFrom != null && !Number.isNaN(filters.weekFrom)) {
      sql += ` AND l.week_start_date IS NOT NULL AND EXTRACT(WEEK FROM l.week_start_date) >= $${idx++}`;
      params.push(filters.weekFrom);
    }
    if (filters.weekTo != null && !Number.isNaN(filters.weekTo)) {
      sql += ` AND l.week_start_date IS NOT NULL AND EXTRACT(WEEK FROM l.week_start_date) <= $${idx++}`;
      params.push(filters.weekTo);
    }

    return { sql, params };
  }

  async updateHeader(
    id: string,
    tenantId: string,
    data: {
      reference?: string;
      supplierId?: string;
      siteId?: string | null;
      incoterm?: string | null;
      notes?: string | null;
    },
  ): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, unknown> = {
      reference: data.reference,
      supplier_id: data.supplierId,
      site_id: data.siteId,
      incoterm: data.incoterm,
      notes: data.notes,
    };

    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        sets.push(`${column} = $${idx++}`);
        params.push(value);
      }
    }

    if (sets.length === 0) return;

    params.push(id, tenantId);
    await this.execute(
      `UPDATE import_shipments SET ${sets.join(", ")} WHERE id = $${idx++} AND tenant_id = $${idx}`,
      params,
    );
  }

  async replaceLines(
    shipmentId: string,
    tenantId: string,
    lines: ImportShipmentLineInput[],
  ): Promise<void> {
    await this.transaction(async (client) => {
      await (client as unknown as Pool).query(
        `DELETE FROM import_shipment_lines WHERE import_shipment_id = $1 AND tenant_id = $2`,
        [shipmentId, tenantId],
      );

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const transportMode = line.transportMode || "SEA";
        await (client as unknown as Pool).query(
          `INSERT INTO import_shipment_lines (
            tenant_id, import_shipment_id, line_no, product_description, item_id,
            quantity, cbm, pallet_qty, transport_mode, carrier, vessel_or_awb,
            destination_port, status, week_start_date, week_end_date, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            tenantId,
            shipmentId,
            i + 1,
            line.productDescription,
            line.itemId || null,
            line.quantity ?? null,
            line.cbm ?? null,
            line.palletQty ?? null,
            transportMode,
            line.carrier || null,
            line.vesselOrAwb || null,
            line.destinationPort || null,
            line.status || DEFAULT_STATUS_BY_MODE[transportMode],
            line.weekStartDate || null,
            line.weekEndDate || null,
            line.notes || null,
          ],
        );
      }
    });
  }

  async updateLineStatus(
    shipmentId: string,
    lineId: string,
    tenantId: string,
    status: string,
  ): Promise<ImportShipmentLineRow | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE import_shipment_lines SET status = $1
       WHERE id = $2 AND import_shipment_id = $3 AND tenant_id = $4
       RETURNING *`,
      [status, lineId, shipmentId, tenantId],
    );
    return row ? this.mapLine(row) : null;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const count = await this.execute(
      "DELETE FROM import_shipments WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    return count > 0;
  }

  private mapDetail(
    headerRow: Record<string, unknown>,
    lineRows: Record<string, unknown>[],
  ): ImportShipmentDetail {
    return {
      ...this.mapHeader(headerRow),
      lines: lineRows.map((r) => this.mapLine(r)),
    };
  }

  private mapHeader(row: Record<string, unknown>): ImportShipmentHeaderRow {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string | null,
      reference: row.reference as string,
      supplierId: row.supplier_id as string,
      supplierName: (row.supplier_name as string) || null,
      incoterm: row.incoterm as string | null,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapLine(row: Record<string, unknown>): ImportShipmentLineRow {
    return {
      id: row.id as string,
      importShipmentId: row.import_shipment_id as string,
      lineNo: row.line_no as number,
      productDescription: row.product_description as string,
      itemId: row.item_id as string | null,
      quantity: row.quantity !== null ? parseFloat(row.quantity as string) : null,
      cbm: row.cbm !== null ? parseFloat(row.cbm as string) : null,
      palletQty:
        row.pallet_qty !== null ? parseFloat(row.pallet_qty as string) : null,
      transportMode: row.transport_mode as string,
      carrier: row.carrier as string | null,
      vesselOrAwb: row.vessel_or_awb as string | null,
      destinationPort: row.destination_port as string | null,
      status: row.status as string,
      weekStartDate: row.week_start_date as Date | null,
      weekEndDate: row.week_end_date as Date | null,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapFlattenedLine(
    row: Record<string, unknown>,
  ): FlattenedImportShipmentLine {
    return {
      ...this.mapLine(row),
      reference: row.reference as string,
      supplierId: row.supplier_id as string,
      supplierName: (row.supplier_name as string) || null,
      incoterm: row.incoterm as string | null,
    };
  }
}
