import { Injectable, Inject } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../../common/db/database.module';

export interface StockMovement {
  tenantId: string;
  siteId?: string;
  itemId: string;
  fromBinId?: string;
  toBinId?: string;
  qty: number;
  uom?: string;
  reason: string;
  refType?: string;
  refId?: string;
  batchNo?: string;
  expiryDate?: Date;
  createdBy?: string;
}

export interface StockOnHand {
  itemId: string;
  itemSku?: string;
  itemDescription?: string;
  binId: string;
  binCode?: string;
  warehouseId?: string;
  warehouseName?: string;
  batchNo: string | null;
  expiryDate: Date | null;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

@Injectable()
export class StockLedgerService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  /**
   * Record a stock movement in the ledger
   * This is the single source of truth for all stock changes
   */
  async recordMovement(movement: StockMovement): Promise<string> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert ledger entry
      const ledgerResult = await client.query(
        `INSERT INTO stock_ledger (
          tenant_id, site_id, item_id, from_bin_id, to_bin_id,
          qty, uom, reason, ref_type, ref_id, batch_no, expiry_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          movement.tenantId,
          movement.siteId || null,
          movement.itemId,
          movement.fromBinId || null,
          movement.toBinId || null,
          movement.qty,
          movement.uom || 'EA',
          movement.reason,
          movement.refType || null,
          movement.refId || null,
          movement.batchNo || null,
          movement.expiryDate || null,
          movement.createdBy || null,
        ],
      );

      const movementId = ledgerResult.rows[0].id;

      // Update snapshot cache (decrement from source, increment at destination)
      if (movement.fromBinId) {
        await this.updateSnapshot(
          client,
          movement.tenantId,
          movement.fromBinId,
          movement.itemId,
          movement.batchNo || null,
          -movement.qty,
          0,
          movement.expiryDate,
        );
      }

      if (movement.toBinId) {
        await this.updateSnapshot(
          client,
          movement.tenantId,
          movement.toBinId,
          movement.itemId,
          movement.batchNo || null,
          movement.qty,
          0,
          movement.expiryDate,
        );
      }

      await client.query('COMMIT');
      return movementId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reserve stock (increases reserved qty, doesn't move stock)
   */
  async reserveStock(
    tenantId: string,
    binId: string,
    itemId: string,
    qty: number,
    batchNo?: string,
  ): Promise<void> {
    await this.updateSnapshot(
      this.pool,
      tenantId,
      binId,
      itemId,
      batchNo || null,
      0,
      qty,
    );
  }

  /**
   * Release reservation
   */
  async releaseReservation(
    tenantId: string,
    binId: string,
    itemId: string,
    qty: number,
    batchNo?: string,
  ): Promise<void> {
    await this.updateSnapshot(
      this.pool,
      tenantId,
      binId,
      itemId,
      batchNo || null,
      0,
      -qty,
    );
  }

  /**
   * Get stock on hand for an item across all bins (FEFO ordered)
   */
  async getStockOnHand(tenantId: string, itemId: string): Promise<StockOnHand[]> {
    const result = await this.pool.query<{
      item_id: string;
      item_sku: string;
      item_description: string;
      bin_id: string;
      bin_code: string;
      warehouse_id: string;
      warehouse_name: string;
      batch_no: string | null;
      expiry_date: Date | null;
      qty_on_hand: string;
      qty_reserved: string;
      qty_available: string;
    }>(
      `SELECT
        ss.item_id,
        i.sku as item_sku,
        i.description as item_description,
        ss.bin_id,
        b.code as bin_code,
        w.id as warehouse_id,
        w.name as warehouse_name,
        ss.batch_no,
        ss.expiry_date,
        ss.qty_on_hand,
        ss.qty_reserved,
        ss.qty_available
       FROM stock_snapshot ss
       JOIN items i ON i.id = ss.item_id
       JOIN bins b ON b.id = ss.bin_id
       JOIN warehouses w ON w.id = b.warehouse_id
       WHERE ss.tenant_id = $1 AND ss.item_id = $2 AND ss.qty_on_hand != 0
       ORDER BY ss.expiry_date ASC NULLS LAST, ss.created_at ASC`,
      [tenantId, itemId],
    );

    return result.rows.map((row) => ({
      itemId: row.item_id,
      itemSku: row.item_sku,
      itemDescription: row.item_description,
      binId: row.bin_id,
      binCode: row.bin_code,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name,
      batchNo: row.batch_no,
      expiryDate: row.expiry_date,
      qtyOnHand: parseFloat(row.qty_on_hand),
      qtyReserved: parseFloat(row.qty_reserved),
      qtyAvailable: parseFloat(row.qty_available),
    }));
  }

  /**
   * Get available stock for allocation (FEFO ordered, only available qty)
   */
  async getAvailableStockFEFO(tenantId: string, itemId: string): Promise<StockOnHand[]> {
    const result = await this.pool.query<{
      item_id: string;
      bin_id: string;
      batch_no: string | null;
      expiry_date: Date | null;
      qty_on_hand: string;
      qty_reserved: string;
      qty_available: string;
    }>(
      `SELECT item_id, bin_id, batch_no, expiry_date, qty_on_hand, qty_reserved, qty_available
       FROM stock_snapshot
       WHERE tenant_id = $1 AND item_id = $2 AND qty_available > 0
       ORDER BY expiry_date ASC NULLS LAST, created_at ASC`,
      [tenantId, itemId],
    );

    return result.rows.map((row) => ({
      itemId: row.item_id,
      binId: row.bin_id,
      batchNo: row.batch_no,
      expiryDate: row.expiry_date,
      qtyOnHand: parseFloat(row.qty_on_hand),
      qtyReserved: parseFloat(row.qty_reserved),
      qtyAvailable: parseFloat(row.qty_available),
    }));
  }

  /**
   * Get stock in a specific bin (FEFO ordered)
   */
  async getStockInBin(tenantId: string, binId: string): Promise<StockOnHand[]> {
    const result = await this.pool.query<{
      item_id: string;
      bin_id: string;
      batch_no: string | null;
      expiry_date: Date | null;
      qty_on_hand: string;
      qty_reserved: string;
      qty_available: string;
    }>(
      `SELECT item_id, bin_id, batch_no, expiry_date, qty_on_hand, qty_reserved, qty_available
       FROM stock_snapshot
       WHERE tenant_id = $1 AND bin_id = $2 AND qty_on_hand != 0
       ORDER BY item_id, expiry_date ASC NULLS LAST`,
      [tenantId, binId],
    );

    return result.rows.map((row) => ({
      itemId: row.item_id,
      binId: row.bin_id,
      batchNo: row.batch_no,
      expiryDate: row.expiry_date,
      qtyOnHand: parseFloat(row.qty_on_hand),
      qtyReserved: parseFloat(row.qty_reserved),
      qtyAvailable: parseFloat(row.qty_available),
    }));
  }

  /**
   * Get total available qty for an item (across all bins)
   */
  async getTotalAvailable(tenantId: string, itemId: string): Promise<number> {
    const result = await this.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(qty_available), 0) as total
       FROM stock_snapshot
       WHERE tenant_id = $1 AND item_id = $2`,
      [tenantId, itemId],
    );
    return parseFloat(result.rows[0]?.total || '0');
  }

  /**
   * Get ledger history for an item
   */
  async getLedgerHistory(
    tenantId: string,
    itemId: string,
    limit = 50,
    offset = 0,
  ) {
    const result = await this.pool.query(
      `SELECT sl.*,
              fb.code as from_bin_code,
              tb.code as to_bin_code,
              u.display_name as created_by_name
       FROM stock_ledger sl
       LEFT JOIN bins fb ON sl.from_bin_id = fb.id
       LEFT JOIN bins tb ON sl.to_bin_id = tb.id
       LEFT JOIN users u ON sl.created_by = u.id
       WHERE sl.tenant_id = $1 AND sl.item_id = $2
       ORDER BY sl.created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, itemId, limit, offset],
    );
    return result.rows;
  }

  async countLedgerHistory(tenantId: string, itemId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM stock_ledger WHERE tenant_id = $1 AND item_id = $2',
      [tenantId, itemId],
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Get paginated stock snapshots with search support
   * Searches across SKU, description, batch number, bin code, and warehouse name
   */
  async getStockSnapshots(
    tenantId: string,
    options: {
      search?: string;
      warehouseId?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: StockOnHand[]; total: number }> {
    const { search, warehouseId, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'ss.tenant_id = $1 AND ss.qty_on_hand != 0';
    const params: (string | number)[] = [tenantId];
    let paramIndex = 2;

    if (warehouseId) {
      whereClause += ` AND w.id = $${paramIndex}`;
      params.push(warehouseId);
      paramIndex++;
    }

    if (search) {
      const searchPattern = `%${search}%`;
      whereClause += ` AND (
        i.sku ILIKE $${paramIndex} OR
        i.description ILIKE $${paramIndex} OR
        ss.batch_no ILIKE $${paramIndex} OR
        b.code ILIKE $${paramIndex} OR
        w.name ILIKE $${paramIndex}
      )`;
      params.push(searchPattern);
      paramIndex++;
    }

    // Get total count
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM stock_snapshot ss
       JOIN items i ON i.id = ss.item_id
       JOIN bins b ON b.id = ss.bin_id
       JOIN warehouses w ON w.id = b.warehouse_id
       WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Get paginated data
    const dataParams = [...params, limit, offset];
    const result = await this.pool.query<{
      item_id: string;
      item_sku: string;
      item_description: string;
      bin_id: string;
      bin_code: string;
      warehouse_id: string;
      warehouse_name: string;
      batch_no: string | null;
      expiry_date: Date | null;
      qty_on_hand: string;
      qty_reserved: string;
      qty_available: string;
    }>(
      `SELECT
        ss.item_id,
        i.sku as item_sku,
        i.description as item_description,
        ss.bin_id,
        b.code as bin_code,
        w.id as warehouse_id,
        w.name as warehouse_name,
        ss.batch_no,
        ss.expiry_date,
        ss.qty_on_hand,
        ss.qty_reserved,
        ss.qty_available
       FROM stock_snapshot ss
       JOIN items i ON i.id = ss.item_id
       JOIN bins b ON b.id = ss.bin_id
       JOIN warehouses w ON w.id = b.warehouse_id
       WHERE ${whereClause}
       ORDER BY i.sku ASC, ss.batch_no ASC NULLS LAST, ss.expiry_date ASC NULLS LAST
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataParams,
    );

    const data = result.rows.map((row) => ({
      itemId: row.item_id,
      itemSku: row.item_sku,
      itemDescription: row.item_description,
      binId: row.bin_id,
      binCode: row.bin_code,
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name,
      batchNo: row.batch_no || null,
      expiryDate: row.expiry_date,
      qtyOnHand: parseFloat(row.qty_on_hand),
      qtyReserved: parseFloat(row.qty_reserved),
      qtyAvailable: parseFloat(row.qty_available),
    }));

    return { data, total };
  }

  private async updateSnapshot(
    client: Pool | PoolClient,
    tenantId: string,
    binId: string,
    itemId: string,
    batchNo: string | null,
    qtyDelta: number,
    reservedDelta: number,
    expiryDate?: Date | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved, expiry_date)
       VALUES ($1, $2, $3, COALESCE($4, ''), $5, $6, $7)
       ON CONFLICT (tenant_id, bin_id, item_id, batch_no)
       DO UPDATE SET
         qty_on_hand = stock_snapshot.qty_on_hand + $5,
         qty_reserved = stock_snapshot.qty_reserved + $6,
         expiry_date = COALESCE($7, stock_snapshot.expiry_date),
         updated_at = NOW()`,
      [tenantId, binId, itemId, batchNo, qtyDelta, reservedDelta, expiryDate || null],
    );
  }

  /**
   * Reserve stock with batch info (for FEFO allocation)
   */
  async reserveStockWithBatch(
    tenantId: string,
    binId: string,
    itemId: string,
    qty: number,
    batchNo: string | null,
    expiryDate: Date | null,
  ): Promise<void> {
    await this.updateSnapshot(
      this.pool,
      tenantId,
      binId,
      itemId,
      batchNo,
      0,
      qty,
      expiryDate,
    );
  }
}
