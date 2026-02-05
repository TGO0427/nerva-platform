import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface CycleCount {
  id: string;
  tenantId: string;
  warehouseId: string;
  countNo: string;
  status: string;
  startedAt: Date | null;
  closedAt: Date | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  warehouseName?: string;
  lineCount?: number;
  varianceCount?: number;
}

export interface CycleCountLine {
  id: string;
  tenantId: string;
  cycleCountId: string;
  binId: string;
  itemId: string;
  systemQty: number;
  countedQty: number | null;
  varianceQty: number;
  countedBy: string | null;
  countedAt: Date | null;
  createdAt: Date;
  binCode?: string;
  itemSku?: string;
  itemDescription?: string;
}

@Injectable()
export class CycleCountRepository extends BaseRepository {
  async generateCountNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM cycle_counts WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `CC-${count.toString().padStart(6, '0')}`;
  }

  async create(data: {
    tenantId: string;
    warehouseId: string;
    countNo: string;
    createdBy?: string;
  }): Promise<CycleCount> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO cycle_counts (tenant_id, warehouse_id, count_no, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.tenantId, data.warehouseId, data.countNo, data.createdBy || null],
    );
    return this.mapCycleCount(row!);
  }

  async findById(id: string): Promise<CycleCount | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM cycle_counts WHERE id = $1',
      [id],
    );
    return row ? this.mapCycleCount(row) : null;
  }

  async findByTenant(
    tenantId: string,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<CycleCount[]> {
    let sql = `SELECT cc.*,
      w.name as warehouse_name,
      (SELECT COUNT(*) FROM cycle_count_lines WHERE cycle_count_id = cc.id) as line_count,
      (SELECT COUNT(*) FROM cycle_count_lines WHERE cycle_count_id = cc.id AND counted_qty IS NOT NULL AND variance_qty != 0) as variance_count
      FROM cycle_counts cc
      LEFT JOIN warehouses w ON w.id = cc.warehouse_id
      WHERE cc.tenant_id = $1`;
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND cc.status = $2';
      params.push(status);
    }

    sql += ` ORDER BY cc.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map((row) => this.mapCycleCount(row));
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: { startedAt?: Date; closedAt?: Date; approvedBy?: string },
  ): Promise<CycleCount | null> {
    const setClauses = ['status = $1'];
    const params: unknown[] = [status];
    let idx = 2;

    if (extra?.startedAt) {
      setClauses.push(`started_at = $${idx}`);
      params.push(extra.startedAt);
      idx++;
    }
    if (extra?.closedAt) {
      setClauses.push(`closed_at = $${idx}`);
      params.push(extra.closedAt);
      idx++;
    }
    if (extra?.approvedBy) {
      setClauses.push(`approved_by = $${idx}`);
      params.push(extra.approvedBy);
      idx++;
    }

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE cycle_counts SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapCycleCount(row) : null;
  }

  // Line methods
  async addLine(data: {
    tenantId: string;
    cycleCountId: string;
    binId: string;
    itemId: string;
    systemQty: number;
  }): Promise<CycleCountLine> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO cycle_count_lines (tenant_id, cycle_count_id, bin_id, item_id, system_qty)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.tenantId, data.cycleCountId, data.binId, data.itemId, data.systemQty],
    );
    return this.mapCycleCountLine(row!);
  }

  async addLines(lines: Array<{
    tenantId: string;
    cycleCountId: string;
    binId: string;
    itemId: string;
    systemQty: number;
  }>): Promise<number> {
    let count = 0;
    for (const line of lines) {
      await this.addLine(line);
      count++;
    }
    return count;
  }

  async getLines(cycleCountId: string): Promise<CycleCountLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT ccl.*, b.code as bin_code, i.sku as item_sku, i.description as item_description
       FROM cycle_count_lines ccl
       JOIN bins b ON b.id = ccl.bin_id
       JOIN items i ON i.id = ccl.item_id
       WHERE ccl.cycle_count_id = $1
       ORDER BY b.code, i.sku`,
      [cycleCountId],
    );
    return rows.map((row) => this.mapCycleCountLine(row));
  }

  async getLine(lineId: string): Promise<CycleCountLine | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM cycle_count_lines WHERE id = $1',
      [lineId],
    );
    return row ? this.mapCycleCountLine(row) : null;
  }

  async updateLineCount(
    lineId: string,
    countedQty: number,
    countedBy: string,
  ): Promise<CycleCountLine | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE cycle_count_lines SET counted_qty = $1, counted_by = $2, counted_at = NOW()
       WHERE id = $3 RETURNING *`,
      [countedQty, countedBy, lineId],
    );
    return row ? this.mapCycleCountLine(row) : null;
  }

  async deleteLine(lineId: string): Promise<void> {
    await this.queryOne('DELETE FROM cycle_count_lines WHERE id = $1', [lineId]);
  }

  async getLinesWithVariance(cycleCountId: string): Promise<CycleCountLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT ccl.*, b.code as bin_code, i.sku as item_sku, i.description as item_description
       FROM cycle_count_lines ccl
       JOIN bins b ON b.id = ccl.bin_id
       JOIN items i ON i.id = ccl.item_id
       WHERE ccl.cycle_count_id = $1 AND ccl.counted_qty IS NOT NULL AND ccl.variance_qty != 0
       ORDER BY b.code, i.sku`,
      [cycleCountId],
    );
    return rows.map((row) => this.mapCycleCountLine(row));
  }

  async getCountedLineCount(cycleCountId: string): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM cycle_count_lines WHERE cycle_count_id = $1 AND counted_qty IS NOT NULL',
      [cycleCountId],
    );
    return parseInt(result?.count || '0', 10);
  }

  async getTotalLineCount(cycleCountId: string): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM cycle_count_lines WHERE cycle_count_id = $1',
      [cycleCountId],
    );
    return parseInt(result?.count || '0', 10);
  }

  private mapCycleCount(row: Record<string, unknown>): CycleCount {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      warehouseId: row.warehouse_id as string,
      countNo: row.count_no as string,
      status: row.status as string,
      startedAt: row.started_at as Date | null,
      closedAt: row.closed_at as Date | null,
      createdBy: row.created_by as string | null,
      approvedBy: row.approved_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
      warehouseName: row.warehouse_name as string | undefined,
      lineCount: row.line_count !== undefined ? parseInt(row.line_count as string, 10) : undefined,
      varianceCount: row.variance_count !== undefined ? parseInt(row.variance_count as string, 10) : undefined,
    };
  }

  private mapCycleCountLine(row: Record<string, unknown>): CycleCountLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      cycleCountId: row.cycle_count_id as string,
      binId: row.bin_id as string,
      itemId: row.item_id as string,
      systemQty: parseFloat(row.system_qty as string),
      countedQty: row.counted_qty !== null ? parseFloat(row.counted_qty as string) : null,
      varianceQty: parseFloat(row.variance_qty as string) || 0,
      countedBy: row.counted_by as string | null,
      countedAt: row.counted_at as Date | null,
      createdAt: row.created_at as Date,
      binCode: row.bin_code as string | undefined,
      itemSku: row.item_sku as string | undefined,
      itemDescription: row.item_description as string | undefined,
    };
  }
}
