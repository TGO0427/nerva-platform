import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface Batch {
  id: string;
  tenantId: string;
  itemId: string;
  batchNo: string;
  expiryDate: Date;
  manufacturedDate: Date | null;
  supplierId: string | null;
  grnId: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpiringStock {
  tenantId: string;
  binId: string;
  binCode: string;
  itemId: string;
  itemSku: string;
  itemDescription: string;
  batchNo: string;
  expiryDate: Date;
  qtyOnHand: number;
  qtyAvailable: number;
  expiryStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK';
  daysUntilExpiry: number;
}

@Injectable()
export class BatchRepository extends BaseRepository {
  async createBatch(data: {
    tenantId: string;
    itemId: string;
    batchNo: string;
    expiryDate: Date;
    manufacturedDate?: Date;
    supplierId?: string;
    grnId?: string;
    notes?: string;
  }): Promise<Batch> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO batches (tenant_id, item_id, batch_no, expiry_date, manufactured_date, supplier_id, grn_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.tenantId,
        data.itemId,
        data.batchNo,
        data.expiryDate,
        data.manufacturedDate || null,
        data.supplierId || null,
        data.grnId || null,
        data.notes || null,
      ],
    );
    return this.mapBatch(row!);
  }

  async findOrCreateBatch(data: {
    tenantId: string;
    itemId: string;
    batchNo: string;
    expiryDate: Date;
    supplierId?: string;
    grnId?: string;
  }): Promise<Batch> {
    // Try to find existing batch
    const existing = await this.queryOne<Record<string, unknown>>(
      `SELECT * FROM batches WHERE tenant_id = $1 AND item_id = $2 AND batch_no = $3`,
      [data.tenantId, data.itemId, data.batchNo],
    );

    if (existing) {
      return this.mapBatch(existing);
    }

    // Create new batch
    return this.createBatch(data);
  }

  async findBatchById(id: string): Promise<Batch | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM batches WHERE id = $1',
      [id],
    );
    return row ? this.mapBatch(row) : null;
  }

  async findBatchByNo(tenantId: string, itemId: string, batchNo: string): Promise<Batch | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM batches WHERE tenant_id = $1 AND item_id = $2 AND batch_no = $3',
      [tenantId, itemId, batchNo],
    );
    return row ? this.mapBatch(row) : null;
  }

  async findBatchesByItem(tenantId: string, itemId: string): Promise<Batch[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM batches
       WHERE tenant_id = $1 AND item_id = $2 AND is_active = true
       ORDER BY expiry_date ASC`,
      [tenantId, itemId],
    );
    return rows.map((r) => this.mapBatch(r));
  }

  async getExpiringStock(
    tenantId: string,
    daysAhead: number = 30,
    warehouseId?: string,
  ): Promise<ExpiringStock[]> {
    let sql = `
      SELECT
        ss.tenant_id,
        ss.bin_id,
        b.code as bin_code,
        ss.item_id,
        i.sku as item_sku,
        i.description as item_description,
        ss.batch_no,
        ss.expiry_date,
        ss.qty_on_hand,
        ss.qty_available,
        CASE
          WHEN ss.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
          WHEN ss.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
          WHEN ss.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
          ELSE 'OK'
        END as expiry_status,
        (ss.expiry_date - CURRENT_DATE)::integer as days_until_expiry
      FROM stock_snapshot ss
      JOIN items i ON i.id = ss.item_id
      JOIN bins b ON b.id = ss.bin_id
      WHERE ss.tenant_id = $1
        AND ss.expiry_date IS NOT NULL
        AND ss.expiry_date <= CURRENT_DATE + $2 * INTERVAL '1 day'
        AND ss.qty_on_hand > 0
    `;

    const params: unknown[] = [tenantId, daysAhead];

    if (warehouseId) {
      sql += ` AND b.warehouse_id = $3`;
      params.push(warehouseId);
    }

    sql += ` ORDER BY ss.expiry_date ASC, i.sku`;

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map((r) => this.mapExpiringStock(r));
  }

  async getExpiredStock(tenantId: string, warehouseId?: string): Promise<ExpiringStock[]> {
    let sql = `
      SELECT
        ss.tenant_id,
        ss.bin_id,
        b.code as bin_code,
        ss.item_id,
        i.sku as item_sku,
        i.description as item_description,
        ss.batch_no,
        ss.expiry_date,
        ss.qty_on_hand,
        ss.qty_available,
        'EXPIRED' as expiry_status,
        (ss.expiry_date - CURRENT_DATE)::integer as days_until_expiry
      FROM stock_snapshot ss
      JOIN items i ON i.id = ss.item_id
      JOIN bins b ON b.id = ss.bin_id
      WHERE ss.tenant_id = $1
        AND ss.expiry_date IS NOT NULL
        AND ss.expiry_date < CURRENT_DATE
        AND ss.qty_on_hand > 0
    `;

    const params: unknown[] = [tenantId];

    if (warehouseId) {
      sql += ` AND b.warehouse_id = $2`;
      params.push(warehouseId);
    }

    sql += ` ORDER BY ss.expiry_date ASC, i.sku`;

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map((r) => this.mapExpiringStock(r));
  }

  async getExpiryAlertsSummary(tenantId: string): Promise<{
    expired: number;
    critical: number;
    warning: number;
  }> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT
        COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) as expired,
        COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '7 days') as critical,
        COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + INTERVAL '7 days' AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') as warning
      FROM stock_snapshot
      WHERE tenant_id = $1
        AND expiry_date IS NOT NULL
        AND qty_on_hand > 0`,
      [tenantId],
    );

    return {
      expired: Number(row?.expired || 0),
      critical: Number(row?.critical || 0),
      warning: Number(row?.warning || 0),
    };
  }

  private mapBatch(row: Record<string, unknown>): Batch {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      itemId: row.item_id as string,
      batchNo: row.batch_no as string,
      expiryDate: row.expiry_date as Date,
      manufacturedDate: row.manufactured_date as Date | null,
      supplierId: row.supplier_id as string | null,
      grnId: row.grn_id as string | null,
      notes: row.notes as string | null,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapExpiringStock(row: Record<string, unknown>): ExpiringStock {
    return {
      tenantId: row.tenant_id as string,
      binId: row.bin_id as string,
      binCode: row.bin_code as string,
      itemId: row.item_id as string,
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      batchNo: row.batch_no as string,
      expiryDate: row.expiry_date as Date,
      qtyOnHand: Number(row.qty_on_hand),
      qtyAvailable: Number(row.qty_available),
      expiryStatus: row.expiry_status as 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK',
      daysUntilExpiry: Number(row.days_until_expiry),
    };
  }
}
