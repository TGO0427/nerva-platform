import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface IbtRecord {
  id: string;
  tenantId: string;
  ibtNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: string;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  shippedAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IbtDetail extends IbtRecord {
  fromWarehouseName: string;
  toWarehouseName: string;
  createdByName: string | null;
  approvedByName: string | null;
  lineCount: number;
}

export interface IbtLineRecord {
  id: string;
  tenantId: string;
  ibtId: string;
  itemId: string;
  qtyRequested: number;
  qtyShipped: number;
  qtyReceived: number;
  fromBinId: string | null;
  toBinId: string | null;
  batchNo: string | null;
  createdAt: Date;
}

export interface IbtLineDetail extends IbtLineRecord {
  itemSku: string;
  itemDescription: string;
  fromBinCode: string | null;
  toBinCode: string | null;
}

export interface CreateIbt {
  tenantId: string;
  ibtNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  createdBy?: string;
}

export interface CreateIbtLine {
  tenantId: string;
  ibtId: string;
  itemId: string;
  qtyRequested: number;
  fromBinId?: string;
  toBinId?: string;
  batchNo?: string;
}

export interface IbtFilters {
  status?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
}

@Injectable()
export class IbtRepository extends BaseRepository {
  async deleteIbt(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM ibts WHERE id = $1', [id]);
    return count > 0;
  }

  async generateIbtNo(tenantId: string): Promise<string> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT COUNT(*)::int + 1 AS next FROM ibts WHERE tenant_id = $1`,
      [tenantId],
    );
    const num = (row?.next as number) || 1;
    return `IBT-${String(num).padStart(6, '0')}`;
  }

  async create(data: CreateIbt): Promise<IbtRecord> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO ibts (tenant_id, ibt_no, from_warehouse_id, to_warehouse_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.tenantId, data.ibtNo, data.fromWarehouseId, data.toWarehouseId, data.notes || null, data.createdBy || null],
    );
    return this.mapIbt(row!);
  }

  async findById(id: string): Promise<IbtDetail | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT ibt.*,
              fw.name AS from_warehouse_name,
              tw.name AS to_warehouse_name,
              uc.first_name || ' ' || uc.last_name AS created_by_name,
              ua.first_name || ' ' || ua.last_name AS approved_by_name,
              (SELECT COUNT(*)::int FROM ibt_lines WHERE ibt_id = ibt.id) AS line_count
       FROM ibts ibt
       JOIN warehouses fw ON fw.id = ibt.from_warehouse_id
       JOIN warehouses tw ON tw.id = ibt.to_warehouse_id
       LEFT JOIN users uc ON uc.id = ibt.created_by
       LEFT JOIN users ua ON ua.id = ibt.approved_by
       WHERE ibt.id = $1`,
      [id],
    );
    return row ? this.mapIbtDetail(row) : null;
  }

  async findByTenant(
    tenantId: string,
    filters: IbtFilters,
    limit = 25,
    offset = 0,
  ): Promise<IbtDetail[]> {
    const { conditions, values, idx } = this.buildFilters(tenantId, filters);
    values.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT ibt.*,
              fw.name AS from_warehouse_name,
              tw.name AS to_warehouse_name,
              uc.first_name || ' ' || uc.last_name AS created_by_name,
              ua.first_name || ' ' || ua.last_name AS approved_by_name,
              (SELECT COUNT(*)::int FROM ibt_lines WHERE ibt_id = ibt.id) AS line_count
       FROM ibts ibt
       JOIN warehouses fw ON fw.id = ibt.from_warehouse_id
       JOIN warehouses tw ON tw.id = ibt.to_warehouse_id
       LEFT JOIN users uc ON uc.id = ibt.created_by
       LEFT JOIN users ua ON ua.id = ibt.approved_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY ibt.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values,
    );
    return rows.map((r) => this.mapIbtDetail(r));
  }

  async countByTenant(tenantId: string, filters: IbtFilters): Promise<number> {
    const { conditions, values } = this.buildFilters(tenantId, filters);

    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT COUNT(*)::int AS total
       FROM ibts ibt
       WHERE ${conditions.join(' AND ')}`,
      values,
    );
    return (row?.total as number) || 0;
  }

  async updateStatus(
    id: string,
    status: string,
    extras?: { approvedBy?: string; approvedAt?: Date; shippedAt?: Date; receivedAt?: Date },
  ): Promise<IbtRecord | null> {
    const sets = ['status = $1'];
    const values: unknown[] = [status];
    let idx = 2;

    if (extras?.approvedBy) {
      sets.push(`approved_by = $${idx++}`);
      values.push(extras.approvedBy);
    }
    if (extras?.approvedAt) {
      sets.push(`approved_at = $${idx++}`);
      values.push(extras.approvedAt);
    }
    if (extras?.shippedAt) {
      sets.push(`shipped_at = $${idx++}`);
      values.push(extras.shippedAt);
    }
    if (extras?.receivedAt) {
      sets.push(`received_at = $${idx++}`);
      values.push(extras.receivedAt);
    }

    values.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE ibts SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return row ? this.mapIbt(row) : null;
  }

  async addLine(data: CreateIbtLine): Promise<IbtLineRecord> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO ibt_lines (tenant_id, ibt_id, item_id, qty_requested, from_bin_id, to_bin_id, batch_no)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [data.tenantId, data.ibtId, data.itemId, data.qtyRequested, data.fromBinId || null, data.toBinId || null, data.batchNo || null],
    );
    return this.mapLine(row!);
  }

  async getLines(ibtId: string): Promise<IbtLineDetail[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT il.*,
              i.sku AS item_sku, i.description AS item_description,
              fb.code AS from_bin_code, tb.code AS to_bin_code
       FROM ibt_lines il
       JOIN items i ON i.id = il.item_id
       LEFT JOIN bins fb ON fb.id = il.from_bin_id
       LEFT JOIN bins tb ON tb.id = il.to_bin_id
       WHERE il.ibt_id = $1
       ORDER BY il.created_at ASC`,
      [ibtId],
    );
    return rows.map((r) => this.mapLineDetail(r));
  }

  async deleteLine(lineId: string): Promise<void> {
    await this.queryOne(`DELETE FROM ibt_lines WHERE id = $1`, [lineId]);
  }

  async updateLineShipped(lineId: string, qtyShipped: number): Promise<void> {
    await this.queryOne(
      `UPDATE ibt_lines SET qty_shipped = $1 WHERE id = $2`,
      [qtyShipped, lineId],
    );
  }

  async updateLineReceived(lineId: string, qtyReceived: number, toBinId?: string): Promise<void> {
    if (toBinId) {
      await this.queryOne(
        `UPDATE ibt_lines SET qty_received = $1, to_bin_id = $2 WHERE id = $3`,
        [qtyReceived, toBinId, lineId],
      );
    } else {
      await this.queryOne(
        `UPDATE ibt_lines SET qty_received = $1 WHERE id = $2`,
        [qtyReceived, lineId],
      );
    }
  }

  private buildFilters(
    tenantId: string,
    filters: IbtFilters,
  ): { conditions: string[]; values: unknown[]; idx: number } {
    const conditions = ['ibt.tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      conditions.push(`ibt.status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.fromWarehouseId) {
      conditions.push(`ibt.from_warehouse_id = $${idx++}`);
      values.push(filters.fromWarehouseId);
    }
    if (filters.toWarehouseId) {
      conditions.push(`ibt.to_warehouse_id = $${idx++}`);
      values.push(filters.toWarehouseId);
    }

    return { conditions, values, idx };
  }

  private mapIbt(row: Record<string, unknown>): IbtRecord {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ibtNo: row.ibt_no as string,
      fromWarehouseId: row.from_warehouse_id as string,
      toWarehouseId: row.to_warehouse_id as string,
      status: row.status as string,
      notes: (row.notes as string) || null,
      createdBy: (row.created_by as string) || null,
      approvedBy: (row.approved_by as string) || null,
      approvedAt: (row.approved_at as Date) || null,
      shippedAt: (row.shipped_at as Date) || null,
      receivedAt: (row.received_at as Date) || null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapIbtDetail(row: Record<string, unknown>): IbtDetail {
    return {
      ...this.mapIbt(row),
      fromWarehouseName: row.from_warehouse_name as string,
      toWarehouseName: row.to_warehouse_name as string,
      createdByName: (row.created_by_name as string) || null,
      approvedByName: (row.approved_by_name as string) || null,
      lineCount: Number(row.line_count) || 0,
    };
  }

  private mapLine(row: Record<string, unknown>): IbtLineRecord {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ibtId: row.ibt_id as string,
      itemId: row.item_id as string,
      qtyRequested: Number(row.qty_requested),
      qtyShipped: Number(row.qty_shipped),
      qtyReceived: Number(row.qty_received),
      fromBinId: (row.from_bin_id as string) || null,
      toBinId: (row.to_bin_id as string) || null,
      batchNo: (row.batch_no as string) || null,
      createdAt: row.created_at as Date,
    };
  }

  private mapLineDetail(row: Record<string, unknown>): IbtLineDetail {
    return {
      ...this.mapLine(row),
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      fromBinCode: (row.from_bin_code as string) || null,
      toBinCode: (row.to_bin_code as string) || null,
    };
  }
}
