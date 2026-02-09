import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/db/base.repository';

export interface BomHeader {
  id: string;
  tenantId: string;
  itemId: string;
  version: number;
  revision: string;
  status: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  baseQty: number;
  uom: string;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BomLine {
  id: string;
  tenantId: string;
  bomHeaderId: string;
  lineNo: number;
  itemId: string;
  qtyPer: number;
  uom: string;
  scrapPct: number;
  isCritical: boolean;
  notes: string | null;
  createdAt: Date;
}

@Injectable()
export class BomRepository extends BaseRepository {
  async createHeader(data: {
    tenantId: string;
    itemId: string;
    version?: number;
    revision?: string;
    baseQty?: number;
    uom?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
    notes?: string;
    createdBy: string;
  }): Promise<BomHeader> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO bom_headers (
        tenant_id, item_id, version, revision, base_qty, uom,
        effective_from, effective_to, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.tenantId,
        data.itemId,
        data.version || 1,
        data.revision || 'A',
        data.baseQty || 1,
        data.uom || 'EA',
        data.effectiveFrom || null,
        data.effectiveTo || null,
        data.notes || null,
        data.createdBy,
      ],
    );
    return this.mapHeader(row!);
  }

  async findHeaderById(id: string): Promise<BomHeader | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM bom_headers WHERE id = $1',
      [id],
    );
    return row ? this.mapHeader(row) : null;
  }

  async findHeadersByTenant(
    tenantId: string,
    filters: { itemId?: string; status?: string; search?: string },
    limit = 50,
    offset = 0,
  ): Promise<{ data: (BomHeader & { itemSku?: string; itemDescription?: string; lineCount?: number })[]; total: number }> {
    let sql = `
      SELECT bh.*, i.sku as item_sku, i.description as item_description,
             (SELECT COUNT(*) FROM bom_lines bl WHERE bl.bom_header_id = bh.id) as line_count
      FROM bom_headers bh
      JOIN items i ON i.id = bh.item_id
      WHERE bh.tenant_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as count FROM bom_headers bh JOIN items i ON i.id = bh.item_id WHERE bh.tenant_id = $1';
    const params: unknown[] = [tenantId];
    const countParams: unknown[] = [tenantId];
    let idx = 2;

    if (filters.itemId) {
      sql += ` AND bh.item_id = $${idx}`;
      countSql += ` AND bh.item_id = $${idx}`;
      params.push(filters.itemId);
      countParams.push(filters.itemId);
      idx++;
    }
    if (filters.status) {
      sql += ` AND bh.status = $${idx}`;
      countSql += ` AND bh.status = $${idx}`;
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

    sql += ` ORDER BY i.sku ASC, bh.version DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      this.queryMany<Record<string, unknown>>(sql, params),
      this.queryOne<{ count: string }>(countSql, countParams),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.mapHeader(r),
        itemSku: r.item_sku as string,
        itemDescription: r.item_description as string,
        lineCount: parseInt(r.line_count as string, 10),
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  async findActiveForItem(tenantId: string, itemId: string): Promise<BomHeader | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT * FROM bom_headers
       WHERE tenant_id = $1 AND item_id = $2 AND status = 'APPROVED'
       AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY version DESC, revision DESC
       LIMIT 1`,
      [tenantId, itemId],
    );
    return row ? this.mapHeader(row) : null;
  }

  async getNextVersion(tenantId: string, itemId: string): Promise<number> {
    const result = await this.queryOne<{ max_version: string }>(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM bom_headers WHERE tenant_id = $1 AND item_id = $2',
      [tenantId, itemId],
    );
    return parseInt(result?.max_version || '0', 10) + 1;
  }

  async updateHeader(
    id: string,
    data: Partial<{
      revision: string;
      baseQty: number;
      uom: string;
      effectiveFrom: Date;
      effectiveTo: Date;
      notes: string;
      status: string;
      approvedBy: string;
      approvedAt: Date;
    }>,
  ): Promise<BomHeader | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.revision !== undefined) {
      updates.push(`revision = $${idx++}`);
      params.push(data.revision);
    }
    if (data.baseQty !== undefined) {
      updates.push(`base_qty = $${idx++}`);
      params.push(data.baseQty);
    }
    if (data.uom !== undefined) {
      updates.push(`uom = $${idx++}`);
      params.push(data.uom);
    }
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

    if (updates.length === 0) return this.findHeaderById(id);

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE bom_headers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapHeader(row) : null;
  }

  async deleteHeader(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM bom_headers WHERE id = $1', [id]);
    return count > 0;
  }

  // Lines
  async addLine(data: {
    tenantId: string;
    bomHeaderId: string;
    lineNo: number;
    itemId: string;
    qtyPer: number;
    uom?: string;
    scrapPct?: number;
    isCritical?: boolean;
    notes?: string;
  }): Promise<BomLine> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO bom_lines (
        tenant_id, bom_header_id, line_no, item_id, qty_per, uom, scrap_pct, is_critical, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.tenantId,
        data.bomHeaderId,
        data.lineNo,
        data.itemId,
        data.qtyPer,
        data.uom || 'EA',
        data.scrapPct || 0,
        data.isCritical || false,
        data.notes || null,
      ],
    );
    return this.mapLine(row!);
  }

  async getLines(bomHeaderId: string): Promise<(BomLine & { itemSku?: string; itemDescription?: string })[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT bl.*, i.sku as item_sku, i.description as item_description
       FROM bom_lines bl
       JOIN items i ON i.id = bl.item_id
       WHERE bl.bom_header_id = $1
       ORDER BY bl.line_no`,
      [bomHeaderId],
    );
    return rows.map((r) => ({
      ...this.mapLine(r),
      itemSku: r.item_sku as string,
      itemDescription: r.item_description as string,
    }));
  }

  async updateLine(
    id: string,
    data: Partial<{
      qtyPer: number;
      uom: string;
      scrapPct: number;
      isCritical: boolean;
      notes: string;
    }>,
  ): Promise<BomLine | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.qtyPer !== undefined) {
      updates.push(`qty_per = $${idx++}`);
      params.push(data.qtyPer);
    }
    if (data.uom !== undefined) {
      updates.push(`uom = $${idx++}`);
      params.push(data.uom);
    }
    if (data.scrapPct !== undefined) {
      updates.push(`scrap_pct = $${idx++}`);
      params.push(data.scrapPct);
    }
    if (data.isCritical !== undefined) {
      updates.push(`is_critical = $${idx++}`);
      params.push(data.isCritical);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    if (updates.length === 0) return null;

    params.push(id);
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE bom_lines SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return row ? this.mapLine(row) : null;
  }

  async deleteLine(id: string): Promise<boolean> {
    const count = await this.execute('DELETE FROM bom_lines WHERE id = $1', [id]);
    return count > 0;
  }

  async deleteLinesByHeader(bomHeaderId: string): Promise<number> {
    return await this.execute('DELETE FROM bom_lines WHERE bom_header_id = $1', [bomHeaderId]);
  }

  private mapHeader(row: Record<string, unknown>): BomHeader {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      itemId: row.item_id as string,
      version: row.version as number,
      revision: row.revision as string,
      status: row.status as string,
      effectiveFrom: row.effective_from as Date | null,
      effectiveTo: row.effective_to as Date | null,
      baseQty: parseFloat(row.base_qty as string),
      uom: row.uom as string,
      notes: row.notes as string | null,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at as Date | null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapLine(row: Record<string, unknown>): BomLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      bomHeaderId: row.bom_header_id as string,
      lineNo: row.line_no as number,
      itemId: row.item_id as string,
      qtyPer: parseFloat(row.qty_per as string),
      uom: row.uom as string,
      scrapPct: parseFloat(row.scrap_pct as string),
      isCritical: row.is_critical as boolean,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
    };
  }
}
