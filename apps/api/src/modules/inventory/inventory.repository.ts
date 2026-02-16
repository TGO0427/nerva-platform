import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface Grn {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  purchaseOrderId: string | null;
  grnNo: string;
  supplierId: string | null;
  status: string;
  receivedAt: Date | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrnLine {
  id: string;
  tenantId: string;
  grnId: string;
  purchaseOrderLineId: string | null;
  itemId: string;
  qtyExpected: number;
  qtyReceived: number;
  batchNo: string | null;
  expiryDate: Date | null;
  batchId: string | null;
  receivingBinId: string | null;
  createdAt: Date;
}

export interface Adjustment {
  id: string;
  tenantId: string;
  warehouseId: string;
  adjustmentNo: string;
  status: string;
  reason: string;
  notes: string | null;
  cycleCountId: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdjustmentLine {
  id: string;
  tenantId: string;
  adjustmentId: string;
  binId: string;
  itemId: string;
  qtyBefore: number;
  qtyAfter: number;
  qtyDelta: number;
  batchNo: string | null;
  createdAt: Date;
}

@Injectable()
export class InventoryRepository extends BaseRepository {
  // GRN methods
  async createGrn(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    grnNo: string;
    purchaseOrderId?: string;
    supplierId?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<Grn> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO grns (tenant_id, site_id, warehouse_id, grn_no, purchase_order_id, supplier_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.tenantId,
        data.siteId,
        data.warehouseId,
        data.grnNo,
        data.purchaseOrderId || null,
        data.supplierId || null,
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapGrn(row!);
  }

  async findGrnById(id: string): Promise<Grn | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM grns WHERE id = $1',
      [id],
    );
    return row ? this.mapGrn(row) : null;
  }

  async findGrnsByTenant(
    tenantId: string,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<Grn[]> {
    let sql = 'SELECT * FROM grns WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapGrn);
  }

  async countGrnsByTenant(tenantId: string, status?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM grns WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }
    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async updateGrnStatus(id: string, status: string): Promise<Grn | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE grns SET status = $1, received_at = CASE WHEN $1 = 'RECEIVED' THEN NOW() ELSE received_at END
       WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return row ? this.mapGrn(row) : null;
  }

  async addGrnLine(data: {
    tenantId: string;
    grnId: string;
    purchaseOrderLineId?: string;
    itemId: string;
    qtyExpected?: number;
    qtyReceived: number;
    batchNo?: string;
    expiryDate?: Date;
    batchId?: string;
    receivingBinId?: string;
  }): Promise<GrnLine> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO grn_lines (tenant_id, grn_id, purchase_order_line_id, item_id, qty_expected, qty_received, batch_no, expiry_date, batch_id, receiving_bin_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.tenantId,
        data.grnId,
        data.purchaseOrderLineId || null,
        data.itemId,
        data.qtyExpected || 0,
        data.qtyReceived,
        data.batchNo || null,
        data.expiryDate || null,
        data.batchId || null,
        data.receivingBinId || null,
      ],
    );
    return this.mapGrnLine(row!);
  }

  async getGrnLines(grnId: string): Promise<GrnLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM grn_lines WHERE grn_id = $1 ORDER BY created_at',
      [grnId],
    );
    return rows.map(this.mapGrnLine);
  }

  // Adjustment methods
  async createAdjustment(data: {
    tenantId: string;
    warehouseId: string;
    adjustmentNo: string;
    reason: string;
    notes?: string;
    cycleCountId?: string;
    createdBy?: string;
  }): Promise<Adjustment> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO adjustments (tenant_id, warehouse_id, adjustment_no, reason, notes, cycle_count_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.tenantId,
        data.warehouseId,
        data.adjustmentNo,
        data.reason,
        data.notes || null,
        data.cycleCountId || null,
        data.createdBy || null,
      ],
    );
    return this.mapAdjustment(row!);
  }

  async findAdjustmentById(id: string): Promise<Adjustment | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM adjustments WHERE id = $1',
      [id],
    );
    return row ? this.mapAdjustment(row) : null;
  }

  async findAdjustmentsByTenant(
    tenantId: string,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<Adjustment[]> {
    let sql = 'SELECT * FROM adjustments WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapAdjustment);
  }

  async countAdjustmentsByTenant(tenantId: string, status?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM adjustments WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }
    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async approveAdjustment(id: string, approvedBy: string): Promise<Adjustment | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE adjustments SET status = 'APPROVED', approved_by = $1, approved_at = NOW()
       WHERE id = $2 AND status = 'SUBMITTED'
       RETURNING *`,
      [approvedBy, id],
    );
    return row ? this.mapAdjustment(row) : null;
  }

  // Adjustment line methods
  async addAdjustmentLine(data: {
    tenantId: string;
    adjustmentId: string;
    binId: string;
    itemId: string;
    qtyBefore: number;
    qtyAfter: number;
    batchNo?: string;
  }): Promise<AdjustmentLine> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO adjustment_lines (tenant_id, adjustment_id, bin_id, item_id, qty_before, qty_after, batch_no)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *, (qty_after - qty_before) as qty_delta`,
      [
        data.tenantId,
        data.adjustmentId,
        data.binId,
        data.itemId,
        data.qtyBefore,
        data.qtyAfter,
        data.batchNo || null,
      ],
    );
    return this.mapAdjustmentLine(row!);
  }

  async getAdjustmentLines(adjustmentId: string): Promise<AdjustmentLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT *, (qty_after - qty_before) as qty_delta FROM adjustment_lines WHERE adjustment_id = $1 ORDER BY created_at`,
      [adjustmentId],
    );
    return rows.map(this.mapAdjustmentLine);
  }

  async deleteAdjustmentLine(id: string): Promise<void> {
    await this.queryOne(
      'DELETE FROM adjustment_lines WHERE id = $1',
      [id],
    );
  }

  async updateAdjustmentStatus(id: string, status: string): Promise<Adjustment | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE adjustments SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id],
    );
    return row ? this.mapAdjustment(row) : null;
  }

  async generateGrnNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM grns WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `GRN-${count.toString().padStart(6, '0')}`;
  }

  async generateAdjustmentNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM adjustments WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `ADJ-${count.toString().padStart(6, '0')}`;
  }

  private mapGrn(row: Record<string, unknown>): Grn {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      purchaseOrderId: row.purchase_order_id as string | null,
      grnNo: row.grn_no as string,
      supplierId: row.supplier_id as string | null,
      status: row.status as string,
      receivedAt: row.received_at as Date | null,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapGrnLine(row: Record<string, unknown>): GrnLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      grnId: row.grn_id as string,
      purchaseOrderLineId: row.purchase_order_line_id as string | null,
      itemId: row.item_id as string,
      qtyExpected: parseFloat(row.qty_expected as string),
      qtyReceived: parseFloat(row.qty_received as string),
      batchNo: row.batch_no as string | null,
      expiryDate: row.expiry_date as Date | null,
      batchId: row.batch_id as string | null,
      receivingBinId: row.receiving_bin_id as string | null,
      createdAt: row.created_at as Date,
    };
  }

  private mapAdjustmentLine(row: Record<string, unknown>): AdjustmentLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      adjustmentId: row.adjustment_id as string,
      binId: row.bin_id as string,
      itemId: row.item_id as string,
      qtyBefore: parseFloat(row.qty_before as string),
      qtyAfter: parseFloat(row.qty_after as string),
      qtyDelta: parseFloat(row.qty_delta as string),
      batchNo: row.batch_no as string | null,
      createdAt: row.created_at as Date,
    };
  }

  private mapAdjustment(row: Record<string, unknown>): Adjustment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      warehouseId: row.warehouse_id as string,
      adjustmentNo: row.adjustment_no as string,
      status: row.status as string,
      reason: row.reason as string,
      notes: row.notes as string | null,
      cycleCountId: row.cycle_count_id as string | null,
      createdBy: row.created_by as string | null,
      approvedBy: row.approved_by as string | null,
      approvedAt: row.approved_at as Date | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
