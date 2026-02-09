import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/db/base.repository';

export interface Routing {
  id: string;
  tenantId: string;
  itemId: string;
  version: number;
  status: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutingOperation {
  id: string;
  tenantId: string;
  routingId: string;
  operationNo: number;
  name: string;
  description: string | null;
  workstationId: string | null;
  setupTimeMins: number;
  runTimeMins: number;
  queueTimeMins: number;
  overlapPct: number;
  isSubcontracted: boolean;
  instructions: string | null;
  createdAt: Date;
}

@Injectable()
export class RoutingRepository extends BaseRepository {
  async create(data: {
    tenantId: string;
    itemId: string;
    version?: number;
    effectiveFrom?: Date;
    effectiveTo?: Date;
    notes?: string;
    createdBy: string;
  }): Promise<Routing> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO routings (
        tenant_id, item_id, version, effective_from, effective_to, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.tenantId,
        data.itemId,
        data.version || 1,
        data.effectiveFrom || null,
        data.effectiveTo || null,
        data.notes || null,
        data.createdBy,
      ],
    );
    return this.mapRouting(row!);
  }

  async findById(id: string): Promise<Routing | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM routings WHERE id = $1',
      [id],
    );
    return row ? this.mapRouting(row) : null;
  }

  async findByTenant(
    tenantId: string,
    filters: { itemId?: string; status?: string; search?: string },
    limit = 50,
    offset = 0,
  ): Promise<{ data: (Routing & { itemSku?: string; itemDescription?: string; operationCount?: number })[]; total: number }> {
    let sql = `
      SELECT r.*, i.sku as item_sku, i.description as item_description,
             (SELECT COUNT(*) FROM routing_operations ro WHERE ro.routing_id = r.id) as operation_count
      FROM routings r
      JOIN items i ON i.id = r.item_id
      WHERE r.tenant_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as count FROM routings r JOIN items i ON i.id = r.item_id WHERE r.tenant_id = $1';
    const params: unknown[] = [tenantId];
    const countParams: unknown[] = [tenantId];
    let idx = 2;

    if (filters.itemId) {
      sql += ` AND r.item_id = $${idx}`;
      countSql += ` AND r.item_id = $${idx}`;
      params.push(filters.itemId);
      countParams.push(filters.itemId);
      idx++;
    }
    if (filters.status) {
      sql += ` AND r.status = $${idx}`;
      countSql += ` AND r.status = $${idx}`;
      params.push(filters.status);
      countParams.push(filters.status);
      idx++;
    }
    if (filters.search) {
      sql += ` AND (i.sku ILIKE $${idx} OR i.description ILIKE $${idx})`;
      countSql += ` AND (i.sku ILIKE $${idx} OR i.description ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      countParams.push(`%${filters.search}%`);
      idx++;
    }

    sql += ` ORDER BY i.sku ASC, r.version DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      this.queryMany<Record<string, unknown>>(sql, params),
      this.queryOne<{ count: string }>(countSql, countParams),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.mapRouting(r),
        itemSku: r.item_sku as string,
        itemDescription: r.item_description as string,
        operationCount: parseInt(r.operation_count as string, 10),
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  async findActiveForItem(tenantId: string, itemId: string): Promise<Routing | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT * FROM routings
       WHERE tenant_id = $1 AND item_id = $2 AND status = 'APPROVED'
       AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY version DESC
       LIMIT 1`,
      [tenantId, itemId],
    );
    return row ? this.mapRouting(row) : null;
  }

  async getNextVersion(tenantId: string, itemId: string): Promise<number> {
    const result = await this.queryOne<{ max_version: string }>(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM routings WHERE tenant_id = $1 AND item_id = $2',
      [tenantId, itemId],
    );
    return parseInt(result?.max_version || '0', 10) + 1;
  }

  async update(
    id: string,
    data: Partial<{
      effectiveFrom: Date;
      effectiveTo: Date;
      notes: string;
      status: string;
      approvedBy: string;
      approvedAt: Date;
    }>,
  ): Promise<Routing | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.effectiveFrom !== undefined) {
      updates.push(`effective_from = $${idx++}`);
      params.push(data.effectiveFrom);
    }
    if (data.effectiveTo !== undefined) {
      updates.push(`effective_to = $${idx++}`);
      params.push(data.effectiveTo);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(data.notes);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.approvedBy !== undefined) {
      updates.push(`approved_by = $${idx++}`);
      params.push(data.approvedBy);
    }
    if (data.approvedAt !== undefined) {
      updates.push(`approved_at = $${idx++}`);
      params.push(data.approvedAt);
    }

    if (updates.length === 0) return this.findById(id);

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE routings SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapRouting(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM routings WHERE id = $1', [id]);
    return count > 0;
  }

  // Operations
  async addOperation(data: {
    tenantId: string;
    routingId: string;
    operationNo: number;
    name: string;
    description?: string;
    workstationId?: string;
    setupTimeMins?: number;
    runTimeMins: number;
    queueTimeMins?: number;
    overlapPct?: number;
    isSubcontracted?: boolean;
    instructions?: string;
  }): Promise<RoutingOperation> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO routing_operations (
        tenant_id, routing_id, operation_no, name, description, workstation_id,
        setup_time_mins, run_time_mins, queue_time_mins, overlap_pct, is_subcontracted, instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.tenantId,
        data.routingId,
        data.operationNo,
        data.name,
        data.description || null,
        data.workstationId || null,
        data.setupTimeMins || 0,
        data.runTimeMins,
        data.queueTimeMins || 0,
        data.overlapPct || 0,
        data.isSubcontracted || false,
        data.instructions || null,
      ],
    );
    return this.mapOperation(row!);
  }

  async getOperations(routingId: string): Promise<(RoutingOperation & { workstationCode?: string; workstationName?: string })[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT ro.*, w.code as workstation_code, w.name as workstation_name
       FROM routing_operations ro
       LEFT JOIN workstations w ON w.id = ro.workstation_id
       WHERE ro.routing_id = $1
       ORDER BY ro.operation_no`,
      [routingId],
    );
    return rows.map((r) => ({
      ...this.mapOperation(r),
      workstationCode: r.workstation_code as string | undefined,
      workstationName: r.workstation_name as string | undefined,
    }));
  }

  async updateOperation(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      workstationId: string;
      setupTimeMins: number;
      runTimeMins: number;
      queueTimeMins: number;
      overlapPct: number;
      isSubcontracted: boolean;
      instructions: string;
    }>,
  ): Promise<RoutingOperation | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(data.description);
    }
    if (data.workstationId !== undefined) {
      updates.push(`workstation_id = $${idx++}`);
      params.push(data.workstationId);
    }
    if (data.setupTimeMins !== undefined) {
      updates.push(`setup_time_mins = $${idx++}`);
      params.push(data.setupTimeMins);
    }
    if (data.runTimeMins !== undefined) {
      updates.push(`run_time_mins = $${idx++}`);
      params.push(data.runTimeMins);
    }
    if (data.queueTimeMins !== undefined) {
      updates.push(`queue_time_mins = $${idx++}`);
      params.push(data.queueTimeMins);
    }
    if (data.overlapPct !== undefined) {
      updates.push(`overlap_pct = $${idx++}`);
      params.push(data.overlapPct);
    }
    if (data.isSubcontracted !== undefined) {
      updates.push(`is_subcontracted = $${idx++}`);
      params.push(data.isSubcontracted);
    }
    if (data.instructions !== undefined) {
      updates.push(`instructions = $${idx++}`);
      params.push(data.instructions);
    }

    if (updates.length === 0) return null;

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE routing_operations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapOperation(row) : null;
  }

  async deleteOperation(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM routing_operations WHERE id = $1', [id]);
    return count > 0;
  }

  async deleteOperationsByRouting(routingId: string): Promise<number> {
    return await this.execute('DELETE FROM routing_operations WHERE routing_id = $1', [routingId]);
  }

  private mapRouting(row: Record<string, unknown>): Routing {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      itemId: row.item_id as string,
      version: row.version as number,
      status: row.status as string,
      effectiveFrom: row.effective_from as Date | null,
      effectiveTo: row.effective_to as Date | null,
      notes: row.notes as string | null,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at as Date | null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapOperation(row: Record<string, unknown>): RoutingOperation {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      routingId: row.routing_id as string,
      operationNo: row.operation_no as number,
      name: row.name as string,
      description: row.description as string | null,
      workstationId: row.workstation_id as string | null,
      setupTimeMins: parseFloat(row.setup_time_mins as string),
      runTimeMins: parseFloat(row.run_time_mins as string),
      queueTimeMins: parseFloat(row.queue_time_mins as string),
      overlapPct: parseFloat(row.overlap_pct as string),
      isSubcontracted: row.is_subcontracted as boolean,
      instructions: row.instructions as string | null,
      createdAt: row.created_at as Date,
    };
  }
}
