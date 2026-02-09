import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/db/base.repository';

export interface Workstation {
  id: string;
  tenantId: string;
  siteId: string;
  code: string;
  name: string;
  description: string | null;
  workstationType: string;
  capacityPerHour: number | null;
  costPerHour: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WorkstationRepository extends BaseRepository {
  async create(data: {
    tenantId: string;
    siteId: string;
    code: string;
    name: string;
    description?: string;
    workstationType: string;
    capacityPerHour?: number;
    costPerHour?: number;
  }): Promise<Workstation> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO workstations (
        tenant_id, site_id, code, name, description, workstation_type,
        capacity_per_hour, cost_per_hour
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.tenantId,
        data.siteId,
        data.code,
        data.name,
        data.description || null,
        data.workstationType,
        data.capacityPerHour || null,
        data.costPerHour || null,
      ],
    );
    return this.mapWorkstation(row!);
  }

  async findById(id: string): Promise<Workstation | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM workstations WHERE id = $1',
      [id],
    );
    return row ? this.mapWorkstation(row) : null;
  }

  async findByTenant(
    tenantId: string,
    filters: { siteId?: string; status?: string; search?: string },
    limit = 50,
    offset = 0,
  ): Promise<{ data: Workstation[]; total: number }> {
    let sql = 'SELECT * FROM workstations WHERE tenant_id = $1';
    let countSql = 'SELECT COUNT(*) as count FROM workstations WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    const countParams: unknown[] = [tenantId];
    let idx = 2;

    if (filters.siteId) {
      sql += ` AND site_id = $${idx}`;
      countSql += ` AND site_id = $${idx}`;
      params.push(filters.siteId);
      countParams.push(filters.siteId);
      idx++;
    }
    if (filters.status) {
      sql += ` AND status = $${idx}`;
      countSql += ` AND status = $${idx}`;
      params.push(filters.status);
      countParams.push(filters.status);
      idx++;
    }
    if (filters.search) {
      sql += ` AND (code ILIKE $${idx} OR name ILIKE $${idx})`;
      countSql += ` AND (code ILIKE $${idx} OR name ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      countParams.push(`%${filters.search}%`);
      idx++;
    }

    sql += ` ORDER BY code ASC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      this.queryMany<Record<string, unknown>>(sql, params),
      this.queryOne<{ count: string }>(countSql, countParams),
    ]);

    return {
      data: rows.map((r) => this.mapWorkstation(r)),
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  async update(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      description: string;
      workstationType: string;
      capacityPerHour: number;
      costPerHour: number;
      status: string;
    }>,
  ): Promise<Workstation | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.code !== undefined) {
      updates.push(`code = $${idx++}`);
      params.push(data.code);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(data.description);
    }
    if (data.workstationType !== undefined) {
      updates.push(`workstation_type = $${idx++}`);
      params.push(data.workstationType);
    }
    if (data.capacityPerHour !== undefined) {
      updates.push(`capacity_per_hour = $${idx++}`);
      params.push(data.capacityPerHour);
    }
    if (data.costPerHour !== undefined) {
      updates.push(`cost_per_hour = $${idx++}`);
      params.push(data.costPerHour);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }

    if (updates.length === 0) return this.findById(id);

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE workstations SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapWorkstation(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM workstations WHERE id = $1', [id]);
    return count > 0;
  }

  private mapWorkstation(row: Record<string, unknown>): Workstation {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      code: row.code as string,
      name: row.name as string,
      description: row.description as string | null,
      workstationType: row.workstation_type as string,
      capacityPerHour: row.capacity_per_hour ? parseFloat(row.capacity_per_hour as string) : null,
      costPerHour: row.cost_per_hour ? parseFloat(row.cost_per_hour as string) : null,
      status: row.status as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
