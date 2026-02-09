import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/db/base.repository';

export interface ProductionLedgerEntry {
  id: string;
  tenantId: string;
  workOrderId: string;
  workOrderOperationId: string | null;
  entryType: string;
  itemId: string;
  warehouseId: string;
  binId: string | null;
  batchNo: string | null;
  qty: number;
  uom: string;
  workstationId: string | null;
  operatorId: string | null;
  reference: string | null;
  reasonCode: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

@Injectable()
export class ProductionLedgerRepository extends BaseRepository {
  async create(data: {
    tenantId: string;
    workOrderId: string;
    workOrderOperationId?: string;
    entryType: string;
    itemId: string;
    warehouseId: string;
    binId?: string;
    batchNo?: string;
    qty: number;
    uom: string;
    workstationId?: string;
    operatorId?: string;
    reference?: string;
    reasonCode?: string;
    notes?: string;
    createdBy: string;
  }): Promise<ProductionLedgerEntry> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO production_ledger (
        tenant_id, work_order_id, work_order_operation_id, entry_type, item_id, warehouse_id,
        bin_id, batch_no, qty, uom, workstation_id, operator_id, reference, reason_code, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.tenantId,
        data.workOrderId,
        data.workOrderOperationId || null,
        data.entryType,
        data.itemId,
        data.warehouseId,
        data.binId || null,
        data.batchNo || null,
        data.qty,
        data.uom,
        data.workstationId || null,
        data.operatorId || null,
        data.reference || null,
        data.reasonCode || null,
        data.notes || null,
        data.createdBy,
      ],
    );
    return this.mapEntry(row!);
  }

  async findByTenant(
    tenantId: string,
    filters: {
      workOrderId?: string;
      itemId?: string;
      entryType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit = 100,
    offset = 0,
  ): Promise<{
    data: (ProductionLedgerEntry & {
      itemSku?: string;
      itemDescription?: string;
      workOrderNo?: string;
      operatorName?: string;
      warehouseName?: string;
      binCode?: string;
    })[];
    total: number;
  }> {
    let sql = `
      SELECT pl.*, i.sku as item_sku, i.description as item_description,
             wo.work_order_no, u.display_name as operator_name,
             w.name as warehouse_name, b.code as bin_code
      FROM production_ledger pl
      JOIN items i ON i.id = pl.item_id
      JOIN work_orders wo ON wo.id = pl.work_order_id
      JOIN warehouses w ON w.id = pl.warehouse_id
      LEFT JOIN bins b ON b.id = pl.bin_id
      LEFT JOIN users u ON u.id = pl.operator_id
      WHERE pl.tenant_id = $1
    `;
    let countSql = 'SELECT COUNT(*) as count FROM production_ledger pl WHERE pl.tenant_id = $1';
    const params: unknown[] = [tenantId];
    const countParams: unknown[] = [tenantId];
    let idx = 2;

    if (filters.workOrderId) {
      sql += ` AND pl.work_order_id = $${idx}`;
      countSql += ` AND pl.work_order_id = $${idx}`;
      params.push(filters.workOrderId);
      countParams.push(filters.workOrderId);
      idx++;
    }
    if (filters.itemId) {
      sql += ` AND pl.item_id = $${idx}`;
      countSql += ` AND pl.item_id = $${idx}`;
      params.push(filters.itemId);
      countParams.push(filters.itemId);
      idx++;
    }
    if (filters.entryType) {
      sql += ` AND pl.entry_type = $${idx}`;
      countSql += ` AND pl.entry_type = $${idx}`;
      params.push(filters.entryType);
      countParams.push(filters.entryType);
      idx++;
    }
    if (filters.startDate) {
      sql += ` AND pl.created_at >= $${idx}`;
      countSql += ` AND pl.created_at >= $${idx}`;
      params.push(filters.startDate);
      countParams.push(filters.startDate);
      idx++;
    }
    if (filters.endDate) {
      sql += ` AND pl.created_at <= $${idx}`;
      countSql += ` AND pl.created_at <= $${idx}`;
      params.push(filters.endDate);
      countParams.push(filters.endDate);
      idx++;
    }

    sql += ` ORDER BY pl.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      this.queryMany<Record<string, unknown>>(sql, params),
      this.queryOne<{ count: string }>(countSql, countParams),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.mapEntry(r),
        itemSku: r.item_sku as string,
        itemDescription: r.item_description as string,
        workOrderNo: r.work_order_no as string,
        operatorName: r.operator_name as string | undefined,
        warehouseName: r.warehouse_name as string,
        binCode: r.bin_code as string | undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  }

  async getByWorkOrder(workOrderId: string): Promise<ProductionLedgerEntry[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM production_ledger WHERE work_order_id = $1 ORDER BY created_at',
      [workOrderId],
    );
    return rows.map((r) => this.mapEntry(r));
  }

  async getSummaryByWorkOrder(tenantId: string): Promise<
    Array<{
      workOrderId: string;
      workOrderNo: string;
      itemSku: string;
      totalIssued: number;
      totalOutput: number;
      totalScrap: number;
    }>
  > {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT
        wo.id as work_order_id,
        wo.work_order_no,
        i.sku as item_sku,
        COALESCE(SUM(CASE WHEN pl.entry_type = 'MATERIAL_ISSUE' THEN ABS(pl.qty) ELSE 0 END), 0) as total_issued,
        COALESCE(SUM(CASE WHEN pl.entry_type = 'PRODUCTION_OUTPUT' THEN pl.qty ELSE 0 END), 0) as total_output,
        COALESCE(SUM(CASE WHEN pl.entry_type = 'SCRAP' THEN ABS(pl.qty) ELSE 0 END), 0) as total_scrap
      FROM work_orders wo
      JOIN items i ON i.id = wo.item_id
      LEFT JOIN production_ledger pl ON pl.work_order_id = wo.id
      WHERE wo.tenant_id = $1 AND wo.status IN ('IN_PROGRESS', 'COMPLETED')
      GROUP BY wo.id, wo.work_order_no, i.sku
      ORDER BY wo.work_order_no DESC`,
      [tenantId],
    );

    return rows.map((r) => ({
      workOrderId: r.work_order_id as string,
      workOrderNo: r.work_order_no as string,
      itemSku: r.item_sku as string,
      totalIssued: parseFloat((r.total_issued as string) || '0'),
      totalOutput: parseFloat((r.total_output as string) || '0'),
      totalScrap: parseFloat((r.total_scrap as string) || '0'),
    }));
  }

  async getSummaryByItem(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Array<{
      itemId: string;
      itemSku: string;
      itemDescription: string;
      totalConsumed: number;
      totalProduced: number;
      totalScrapped: number;
    }>
  > {
    let sql = `
      SELECT
        i.id as item_id,
        i.sku as item_sku,
        i.description as item_description,
        COALESCE(SUM(CASE WHEN pl.entry_type IN ('MATERIAL_ISSUE') THEN ABS(pl.qty) ELSE 0 END), 0) as total_consumed,
        COALESCE(SUM(CASE WHEN pl.entry_type = 'PRODUCTION_OUTPUT' THEN pl.qty ELSE 0 END), 0) as total_produced,
        COALESCE(SUM(CASE WHEN pl.entry_type = 'SCRAP' THEN ABS(pl.qty) ELSE 0 END), 0) as total_scrapped
      FROM production_ledger pl
      JOIN items i ON i.id = pl.item_id
      WHERE pl.tenant_id = $1
    `;
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (startDate) {
      sql += ` AND pl.created_at >= $${idx++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND pl.created_at <= $${idx++}`;
      params.push(endDate);
    }

    sql += ` GROUP BY i.id, i.sku, i.description ORDER BY i.sku`;

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);

    return rows.map((r) => ({
      itemId: r.item_id as string,
      itemSku: r.item_sku as string,
      itemDescription: r.item_description as string,
      totalConsumed: parseFloat((r.total_consumed as string) || '0'),
      totalProduced: parseFloat((r.total_produced as string) || '0'),
      totalScrapped: parseFloat((r.total_scrapped as string) || '0'),
    }));
  }

  private mapEntry(row: Record<string, unknown>): ProductionLedgerEntry {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      workOrderId: row.work_order_id as string,
      workOrderOperationId: row.work_order_operation_id as string | null,
      entryType: row.entry_type as string,
      itemId: row.item_id as string,
      warehouseId: row.warehouse_id as string,
      binId: row.bin_id as string | null,
      batchNo: row.batch_no as string | null,
      qty: parseFloat(row.qty as string),
      uom: row.uom as string,
      workstationId: row.workstation_id as string | null,
      operatorId: row.operator_id as string | null,
      reference: row.reference as string | null,
      reasonCode: row.reason_code as string | null,
      notes: row.notes as string | null,
      createdBy: row.created_by as string,
      createdAt: row.created_at as Date,
    };
  }
}
