import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/db/base.repository";

export type BatchQualityStatusValue =
  | "AWAITING_QC"
  | "ON_HOLD"
  | "APPROVED"
  | "REJECTED"
  | "RELEASED";

export interface BatchQuality {
  id: string;
  tenantId: string;
  itemId: string;
  batchNo: string;
  qualityStatus: BatchQualityStatusValue;
  source: "PRODUCTION" | "RECEIVING";
  setBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// AWAITING_QC -> ON_HOLD | APPROVED | REJECTED
// ON_HOLD -> APPROVED | REJECTED
// APPROVED -> RELEASED | ON_HOLD (e.g. a hold discovered after approval)
// REJECTED / RELEASED are terminal
const ALLOWED_TRANSITIONS: Record<
  BatchQualityStatusValue,
  BatchQualityStatusValue[]
> = {
  AWAITING_QC: ["ON_HOLD", "APPROVED", "REJECTED"],
  ON_HOLD: ["APPROVED", "REJECTED"],
  APPROVED: ["RELEASED", "ON_HOLD"],
  REJECTED: [],
  RELEASED: [],
};

@Injectable()
export class BatchQualityRepository extends BaseRepository {
  isAllowedTransition(
    from: BatchQualityStatusValue,
    to: BatchQualityStatusValue,
  ): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /** Creates the status record for a batch the first time it's seen, if one doesn't already exist. No-op otherwise. */
  async ensureStatusRecord(data: {
    tenantId: string;
    itemId: string;
    batchNo: string;
    initialStatus: BatchQualityStatusValue;
    source: "PRODUCTION" | "RECEIVING";
  }): Promise<BatchQuality> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO batch_quality_status (tenant_id, item_id, batch_no, quality_status, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, item_id, batch_no) DO UPDATE SET tenant_id = batch_quality_status.tenant_id
       RETURNING *`,
      [data.tenantId, data.itemId, data.batchNo, data.initialStatus, data.source],
    );
    return this.mapBatchQuality(row!);
  }

  async findStatus(
    tenantId: string,
    itemId: string,
    batchNo: string,
  ): Promise<BatchQuality | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT * FROM batch_quality_status WHERE tenant_id = $1 AND item_id = $2 AND batch_no = $3`,
      [tenantId, itemId, batchNo],
    );
    return row ? this.mapBatchQuality(row) : null;
  }

  async findStatusesForWorkOrderOutput(
    tenantId: string,
    workOrderId: string,
  ): Promise<(BatchQuality & { itemSku?: string; itemDescription?: string })[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT DISTINCT bqs.*, i.sku as item_sku, i.description as item_description
       FROM production_ledger pl
       JOIN batch_quality_status bqs
         ON bqs.tenant_id = pl.tenant_id
        AND bqs.item_id = pl.item_id
        AND bqs.batch_no = pl.batch_no
       JOIN items i ON i.id = bqs.item_id
       WHERE pl.tenant_id = $1
         AND pl.work_order_id = $2
         AND pl.entry_type = 'PRODUCTION_OUTPUT'
         AND pl.batch_no IS NOT NULL
       ORDER BY bqs.batch_no`,
      [tenantId, workOrderId],
    );
    return rows.map((r) => ({
      ...this.mapBatchQuality(r),
      itemSku: r.item_sku as string | undefined,
      itemDescription: r.item_description as string | undefined,
    }));
  }

  /** Tenant-wide QC queue: every batch, regardless of which work order or item it came from. */
  async listBatches(
    tenantId: string,
    filters: { status?: BatchQualityStatusValue; search?: string },
    page = 1,
    limit = 20,
  ): Promise<{
    data: (BatchQuality & {
      itemSku: string;
      itemDescription: string;
      workOrderId: string | null;
      workOrderNo: string | null;
      qtyOnHand: number;
    })[];
    total: number;
  }> {
    const conditions: string[] = ["bqs.tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      conditions.push(`bqs.quality_status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push(
        `(i.sku ILIKE $${idx} OR i.description ILIKE $${idx} OR bqs.batch_no ILIKE $${idx})`,
      );
      params.push(`%${filters.search}%`);
      idx++;
    }
    const whereClause = conditions.join(" AND ");
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      this.queryMany<Record<string, unknown>>(
        `SELECT bqs.*, i.sku as item_sku, i.description as item_description,
                wo.work_order_id, wo.work_order_no,
                COALESCE(stock.qty_on_hand, 0) as qty_on_hand
         FROM batch_quality_status bqs
         JOIN items i ON i.id = bqs.item_id
         LEFT JOIN LATERAL (
           SELECT pl.work_order_id, w.work_order_no
           FROM production_ledger pl
           JOIN work_orders w ON w.id = pl.work_order_id
           WHERE pl.tenant_id = bqs.tenant_id AND pl.item_id = bqs.item_id
             AND pl.batch_no = bqs.batch_no AND pl.entry_type = 'PRODUCTION_OUTPUT'
           LIMIT 1
         ) wo ON true
         LEFT JOIN LATERAL (
           SELECT SUM(ss.qty_on_hand) as qty_on_hand
           FROM stock_snapshot ss
           WHERE ss.tenant_id = bqs.tenant_id AND ss.item_id = bqs.item_id AND ss.batch_no = bqs.batch_no
         ) stock ON true
         WHERE ${whereClause}
         ORDER BY bqs.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      this.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM batch_quality_status bqs
         JOIN items i ON i.id = bqs.item_id
         WHERE ${whereClause}`,
        params,
      ),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.mapBatchQuality(r),
        itemSku: r.item_sku as string,
        itemDescription: r.item_description as string,
        workOrderId: (r.work_order_id as string) || null,
        workOrderNo: (r.work_order_no as string) || null,
        qtyOnHand: parseFloat((r.qty_on_hand as string) || "0"),
      })),
      total: parseInt(countResult?.count || "0", 10),
    };
  }

  async setStatus(
    tenantId: string,
    itemId: string,
    batchNo: string,
    newStatus: BatchQualityStatusValue,
    setBy: string,
    notes?: string,
  ): Promise<BatchQuality> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE batch_quality_status
       SET quality_status = $4, set_by = $5, notes = COALESCE($6, notes)
       WHERE tenant_id = $1 AND item_id = $2 AND batch_no = $3
       RETURNING *`,
      [tenantId, itemId, batchNo, newStatus, setBy, notes ?? null],
    );
    return this.mapBatchQuality(row!);
  }

  private mapBatchQuality(row: Record<string, unknown>): BatchQuality {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      itemId: row.item_id as string,
      batchNo: row.batch_no as string,
      qualityStatus: row.quality_status as BatchQualityStatusValue,
      source: row.source as "PRODUCTION" | "RECEIVING",
      setBy: row.set_by as string | null,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
