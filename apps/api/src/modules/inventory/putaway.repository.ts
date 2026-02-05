import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface PutawayTask {
  id: string;
  tenantId: string;
  grnLineId: string;
  itemId: string;
  fromBinId: string;
  toBinId: string | null;
  qty: number;
  status: string;
  assignedTo: string | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface PutawayTaskDetail extends PutawayTask {
  itemSku: string;
  itemDescription: string;
  fromBinCode: string;
  toBinCode: string | null;
  assignedToName: string | null;
  grnId: string;
  batchNo: string | null;
}

export interface CreatePutawayTask {
  tenantId: string;
  grnLineId: string;
  itemId: string;
  fromBinId: string;
  toBinId?: string;
  qty: number;
}

export interface PutawayFilters {
  status?: string;
  warehouseId?: string;
  assignedTo?: string;
}

@Injectable()
export class PutawayRepository extends BaseRepository {
  async create(data: CreatePutawayTask): Promise<PutawayTask> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO putaway_tasks (tenant_id, grn_line_id, item_id, from_bin_id, to_bin_id, qty)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.tenantId, data.grnLineId, data.itemId, data.fromBinId, data.toBinId || null, data.qty],
    );
    return this.mapTask(row!);
  }

  async createMany(tasks: CreatePutawayTask[]): Promise<PutawayTask[]> {
    const results: PutawayTask[] = [];
    for (const task of tasks) {
      results.push(await this.create(task));
    }
    return results;
  }

  async findById(id: string): Promise<PutawayTaskDetail | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT pt.*,
              i.sku AS item_sku, i.description AS item_description,
              fb.code AS from_bin_code, tb.code AS to_bin_code,
              u.first_name || ' ' || u.last_name AS assigned_to_name,
              gl.grn_id, gl.batch_no
       FROM putaway_tasks pt
       JOIN items i ON i.id = pt.item_id
       JOIN bins fb ON fb.id = pt.from_bin_id
       LEFT JOIN bins tb ON tb.id = pt.to_bin_id
       LEFT JOIN users u ON u.id = pt.assigned_to
       JOIN grn_lines gl ON gl.id = pt.grn_line_id
       WHERE pt.id = $1`,
      [id],
    );
    return row ? this.mapTaskDetail(row) : null;
  }

  async findByTenant(
    tenantId: string,
    filters: PutawayFilters,
    limit = 25,
    offset = 0,
  ): Promise<PutawayTaskDetail[]> {
    const { conditions, values, idx } = this.buildFilters(tenantId, filters, 'pt');
    values.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT pt.*,
              i.sku AS item_sku, i.description AS item_description,
              fb.code AS from_bin_code, tb.code AS to_bin_code,
              u.first_name || ' ' || u.last_name AS assigned_to_name,
              gl.grn_id, gl.batch_no
       FROM putaway_tasks pt
       JOIN items i ON i.id = pt.item_id
       JOIN bins fb ON fb.id = pt.from_bin_id
       LEFT JOIN bins tb ON tb.id = pt.to_bin_id
       LEFT JOIN users u ON u.id = pt.assigned_to
       JOIN grn_lines gl ON gl.id = pt.grn_line_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pt.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values,
    );
    return rows.map(this.mapTaskDetail);
  }

  async countByTenant(tenantId: string, filters: PutawayFilters): Promise<number> {
    const { conditions, values } = this.buildFilters(tenantId, filters, 'pt');

    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT COUNT(*)::int AS total
       FROM putaway_tasks pt
       JOIN bins fb ON fb.id = pt.from_bin_id
       WHERE ${conditions.join(' AND ')}`,
      values,
    );
    return (row?.total as number) || 0;
  }

  async findByGrn(grnId: string): Promise<PutawayTaskDetail[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT pt.*,
              i.sku AS item_sku, i.description AS item_description,
              fb.code AS from_bin_code, tb.code AS to_bin_code,
              u.first_name || ' ' || u.last_name AS assigned_to_name,
              gl.grn_id, gl.batch_no
       FROM putaway_tasks pt
       JOIN items i ON i.id = pt.item_id
       JOIN bins fb ON fb.id = pt.from_bin_id
       LEFT JOIN bins tb ON tb.id = pt.to_bin_id
       LEFT JOIN users u ON u.id = pt.assigned_to
       JOIN grn_lines gl ON gl.id = pt.grn_line_id
       WHERE gl.grn_id = $1
       ORDER BY pt.created_at ASC`,
      [grnId],
    );
    return rows.map(this.mapTaskDetail);
  }

  async assignTask(id: string, userId: string): Promise<void> {
    await this.queryOne(
      `UPDATE putaway_tasks SET assigned_to = $1, status = 'ASSIGNED' WHERE id = $2`,
      [userId, id],
    );
  }

  async completeTask(id: string, toBinId: string): Promise<void> {
    await this.queryOne(
      `UPDATE putaway_tasks SET to_bin_id = $1, status = 'COMPLETE', completed_at = NOW() WHERE id = $2`,
      [toBinId, id],
    );
  }

  async cancelTask(id: string): Promise<void> {
    await this.queryOne(
      `UPDATE putaway_tasks SET status = 'CANCELLED' WHERE id = $1`,
      [id],
    );
  }

  async countPendingByGrn(grnId: string): Promise<number> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT COUNT(*)::int AS total
       FROM putaway_tasks pt
       JOIN grn_lines gl ON gl.id = pt.grn_line_id
       WHERE gl.grn_id = $1 AND pt.status NOT IN ('COMPLETE', 'CANCELLED')`,
      [grnId],
    );
    return (row?.total as number) || 0;
  }

  private buildFilters(
    tenantId: string,
    filters: PutawayFilters,
    alias: string,
  ): { conditions: string[]; values: unknown[]; idx: number } {
    const conditions = [`${alias}.tenant_id = $1`];
    const values: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      conditions.push(`${alias}.status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters.warehouseId) {
      conditions.push(`fb.warehouse_id = $${idx++}`);
      values.push(filters.warehouseId);
    }
    if (filters.assignedTo) {
      conditions.push(`${alias}.assigned_to = $${idx++}`);
      values.push(filters.assignedTo);
    }

    return { conditions, values, idx };
  }

  private mapTask(row: Record<string, unknown>): PutawayTask {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      grnLineId: row.grn_line_id as string,
      itemId: row.item_id as string,
      fromBinId: row.from_bin_id as string,
      toBinId: (row.to_bin_id as string) || null,
      qty: Number(row.qty),
      status: row.status as string,
      assignedTo: (row.assigned_to as string) || null,
      completedAt: (row.completed_at as Date) || null,
      createdAt: row.created_at as Date,
    };
  }

  private mapTaskDetail(row: Record<string, unknown>): PutawayTaskDetail {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      grnLineId: row.grn_line_id as string,
      itemId: row.item_id as string,
      fromBinId: row.from_bin_id as string,
      toBinId: (row.to_bin_id as string) || null,
      qty: Number(row.qty),
      status: row.status as string,
      assignedTo: (row.assigned_to as string) || null,
      completedAt: (row.completed_at as Date) || null,
      createdAt: row.created_at as Date,
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      fromBinCode: row.from_bin_code as string,
      toBinCode: (row.to_bin_code as string) || null,
      assignedToName: (row.assigned_to_name as string) || null,
      grnId: row.grn_id as string,
      batchNo: (row.batch_no as string) || null,
    };
  }
}
