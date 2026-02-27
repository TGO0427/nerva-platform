import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/db/base.repository';

export interface NonConformance {
  id: string;
  tenantId: string;
  ncNo: string;
  workOrderId: string | null;
  itemId: string | null;
  reportedBy: string;
  defectType: string;
  severity: string;
  description: string;
  qtyAffected: number | null;
  disposition: string | null;
  correctiveAction: string | null;
  status: string;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class NonConformanceRepository extends BaseRepository {
  async generateNcNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<Record<string, unknown>>(
      `SELECT nc_no FROM non_conformances WHERE tenant_id = $1 ORDER BY nc_no DESC LIMIT 1`,
      [tenantId],
    );
    let next = 1;
    if (result?.nc_no) {
      const match = (result.nc_no as string).match(/NC-(\d+)/);
      if (match) {
        next = parseInt(match[1], 10) + 1;
      }
    }
    return `NC-${next.toString().padStart(6, '0')}`;
  }

  async findByTenant(
    tenantId: string,
    filters: { status?: string; severity?: string; workOrderId?: string; search?: string },
    limit = 50,
    offset = 0,
  ): Promise<{ data: (NonConformance & { itemSku?: string; itemDescription?: string; workOrderNo?: string; reportedByName?: string })[]; total: number }> {
    let sql = `
      SELECT nc.*, i.sku as item_sku, i.description as item_description,
             wo.work_order_no, u.display_name as reported_by_name
      FROM non_conformances nc
      LEFT JOIN items i ON i.id = nc.item_id
      LEFT JOIN work_orders wo ON wo.id = nc.work_order_id
      LEFT JOIN users u ON u.id = nc.reported_by
      WHERE nc.tenant_id = $1
    `;
    let countSql = `
      SELECT COUNT(*) as count FROM non_conformances nc
      LEFT JOIN items i ON i.id = nc.item_id
      WHERE nc.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    const countParams: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND nc.status = $${idx}`;
      countSql += ` AND nc.status = $${idx}`;
      params.push(filters.status);
      countParams.push(filters.status);
      idx++;
    }
    if (filters.severity) {
      sql += ` AND nc.severity = $${idx}`;
      countSql += ` AND nc.severity = $${idx}`;
      params.push(filters.severity);
      countParams.push(filters.severity);
      idx++;
    }
    if (filters.workOrderId) {
      sql += ` AND nc.work_order_id = $${idx}`;
      countSql += ` AND nc.work_order_id = $${idx}`;
      params.push(filters.workOrderId);
      countParams.push(filters.workOrderId);
      idx++;
    }
    if (filters.search) {
      sql += ` AND (nc.nc_no ILIKE $${idx} OR nc.description ILIKE $${idx} OR i.sku ILIKE $${idx})`;
      countSql += ` AND (nc.nc_no ILIKE $${idx} OR nc.description ILIKE $${idx} OR i.sku ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      countParams.push(`%${filters.search}%`);
      idx++;
    }

    sql += ` ORDER BY nc.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      this.queryMany<Record<string, unknown>>(sql, params),
      this.queryOne<{ count: string }>(countSql, countParams),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.mapNc(r),
        itemSku: r.item_sku as string | undefined,
        itemDescription: r.item_description as string | undefined,
        workOrderNo: r.work_order_no as string | undefined,
        reportedByName: r.reported_by_name as string | undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  async findById(id: string): Promise<(NonConformance & {
    itemSku?: string;
    itemDescription?: string;
    workOrderNo?: string;
    reportedByName?: string;
    resolvedByName?: string;
  }) | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT nc.*, i.sku as item_sku, i.description as item_description,
              wo.work_order_no, u.display_name as reported_by_name,
              u2.display_name as resolved_by_name
       FROM non_conformances nc
       LEFT JOIN items i ON i.id = nc.item_id
       LEFT JOIN work_orders wo ON wo.id = nc.work_order_id
       LEFT JOIN users u ON u.id = nc.reported_by
       LEFT JOIN users u2 ON u2.id = nc.resolved_by
       WHERE nc.id = $1`,
      [id],
    );
    if (!row) return null;
    return {
      ...this.mapNc(row),
      itemSku: row.item_sku as string | undefined,
      itemDescription: row.item_description as string | undefined,
      workOrderNo: row.work_order_no as string | undefined,
      reportedByName: row.reported_by_name as string | undefined,
      resolvedByName: row.resolved_by_name as string | undefined,
    };
  }

  async create(data: {
    tenantId: string;
    ncNo: string;
    workOrderId?: string;
    itemId?: string;
    reportedBy: string;
    defectType: string;
    severity: string;
    description: string;
    qtyAffected?: number;
  }): Promise<NonConformance> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO non_conformances (
        tenant_id, nc_no, work_order_id, item_id, reported_by,
        defect_type, severity, description, qty_affected
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.tenantId,
        data.ncNo,
        data.workOrderId || null,
        data.itemId || null,
        data.reportedBy,
        data.defectType,
        data.severity,
        data.description,
        data.qtyAffected ?? null,
      ],
    );
    return this.mapNc(row!);
  }

  async update(
    id: string,
    data: Partial<{
      defectType: string;
      severity: string;
      description: string;
      qtyAffected: number;
      disposition: string;
      correctiveAction: string;
      status: string;
      resolvedBy: string;
      resolvedAt: Date;
    }>,
  ): Promise<NonConformance | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.defectType !== undefined) {
      updates.push(`defect_type = $${idx++}`);
      params.push(data.defectType);
    }
    if (data.severity !== undefined) {
      updates.push(`severity = $${idx++}`);
      params.push(data.severity);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(data.description);
    }
    if (data.qtyAffected !== undefined) {
      updates.push(`qty_affected = $${idx++}`);
      params.push(data.qtyAffected);
    }
    if (data.disposition !== undefined) {
      updates.push(`disposition = $${idx++}`);
      params.push(data.disposition);
    }
    if (data.correctiveAction !== undefined) {
      updates.push(`corrective_action = $${idx++}`);
      params.push(data.correctiveAction);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      params.push(data.status);
    }
    if (data.resolvedBy !== undefined) {
      updates.push(`resolved_by = $${idx++}`);
      params.push(data.resolvedBy);
    }
    if (data.resolvedAt !== undefined) {
      updates.push(`resolved_at = $${idx++}`);
      params.push(data.resolvedAt);
    }

    if (updates.length === 0) return null;

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE non_conformances SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapNc(row) : null;
  }

  private mapNc(row: Record<string, unknown>): NonConformance {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ncNo: row.nc_no as string,
      workOrderId: row.work_order_id as string | null,
      itemId: row.item_id as string | null,
      reportedBy: row.reported_by as string,
      defectType: row.defect_type as string,
      severity: row.severity as string,
      description: row.description as string,
      qtyAffected: row.qty_affected ? parseFloat(row.qty_affected as string) : 0,
      disposition: row.disposition as string | null,
      correctiveAction: row.corrective_action as string | null,
      status: row.status as string,
      resolvedBy: row.resolved_by as string | null,
      resolvedAt: row.resolved_at as Date | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
