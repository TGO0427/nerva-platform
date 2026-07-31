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
