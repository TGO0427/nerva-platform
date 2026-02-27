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

  async getDashboardStats(tenantId: string): Promise<{
    activeWorkOrders: number;
    todayOutput: number;
    yieldRate: number;
    workstationUtilization: number;
    statusDistribution: Array<{ status: string; count: number }>;
    dailyOutput: Array<{ date: string; output: number; scrap: number }>;
    topItems: Array<{ itemId: string; itemSku: string; itemDescription: string; totalOutput: number }>;
    activeOrders: Array<{ id: string; workOrderNo: string; itemSku: string; status: string; qtyOrdered: number; qtyCompleted: number; plannedEnd: Date | null }>;
  }> {
    const [
      activeWoResult,
      todayOutputResult,
      yieldResult,
      utilizationActiveResult,
      utilizationTotalResult,
      statusRows,
      dailyRows,
      topItemRows,
      activeOrderRows,
    ] = await Promise.all([
      this.queryOne<Record<string, unknown>>(
        `SELECT COUNT(*) as count FROM work_orders WHERE status IN ('RELEASED', 'IN_PROGRESS') AND tenant_id = $1`,
        [tenantId],
      ),
      this.queryOne<Record<string, unknown>>(
        `SELECT COALESCE(SUM(ABS(qty)), 0) as total
         FROM production_ledger
         WHERE entry_type = 'PRODUCTION_OUTPUT' AND created_at::date = CURRENT_DATE AND tenant_id = $1`,
        [tenantId],
      ),
      this.queryOne<Record<string, unknown>>(
        `SELECT
           COALESCE(SUM(CASE WHEN entry_type = 'PRODUCTION_OUTPUT' THEN qty ELSE 0 END), 0) as output,
           COALESCE(SUM(CASE WHEN entry_type = 'SCRAP' THEN ABS(qty) ELSE 0 END), 0) as scrap
         FROM production_ledger
         WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
        [tenantId],
      ),
      this.queryOne<Record<string, unknown>>(
        `SELECT COUNT(DISTINCT workstation_id) as count
         FROM work_order_operations
         WHERE status = 'IN_PROGRESS' AND tenant_id = $1`,
        [tenantId],
      ),
      this.queryOne<Record<string, unknown>>(
        `SELECT COUNT(*) as count FROM workstations WHERE status = 'ACTIVE' AND tenant_id = $1`,
        [tenantId],
      ),
      this.queryMany<Record<string, unknown>>(
        `SELECT status, COUNT(*) as count FROM work_orders WHERE tenant_id = $1 GROUP BY status`,
        [tenantId],
      ),
      this.queryMany<Record<string, unknown>>(
        `SELECT
           created_at::date as date,
           COALESCE(SUM(CASE WHEN entry_type = 'PRODUCTION_OUTPUT' THEN qty ELSE 0 END), 0) as output,
           COALESCE(SUM(CASE WHEN entry_type = 'SCRAP' THEN ABS(qty) ELSE 0 END), 0) as scrap
         FROM production_ledger
         WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY created_at::date
         ORDER BY date`,
        [tenantId],
      ),
      this.queryMany<Record<string, unknown>>(
        `SELECT pl.item_id, i.sku, i.description,
                COALESCE(SUM(pl.qty), 0) as total_output
         FROM production_ledger pl
         JOIN items i ON i.id = pl.item_id
         WHERE pl.tenant_id = $1 AND pl.entry_type = 'PRODUCTION_OUTPUT'
           AND pl.created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY pl.item_id, i.sku, i.description
         ORDER BY total_output DESC
         LIMIT 10`,
        [tenantId],
      ),
      this.queryMany<Record<string, unknown>>(
        `SELECT wo.id, wo.work_order_no, i.sku as item_sku, wo.status,
                wo.qty_ordered, wo.qty_completed, wo.planned_end
         FROM work_orders wo
         JOIN items i ON i.id = wo.item_id
         WHERE wo.tenant_id = $1 AND wo.status IN ('RELEASED', 'IN_PROGRESS')
         ORDER BY wo.planned_end ASC NULLS LAST
         LIMIT 20`,
        [tenantId],
      ),
    ]);

    const output = parseFloat((yieldResult?.output as string) || '0');
    const scrap = parseFloat((yieldResult?.scrap as string) || '0');
    const yieldRate = output + scrap > 0 ? (output / (output + scrap)) * 100 : 0;

    const activeWs = parseFloat((utilizationActiveResult?.count as string) || '0');
    const totalWs = parseFloat((utilizationTotalResult?.count as string) || '0');
    const workstationUtilization = totalWs > 0 ? (activeWs / totalWs) * 100 : 0;

    return {
      activeWorkOrders: parseInt((activeWoResult?.count as string) || '0', 10),
      todayOutput: parseFloat((todayOutputResult?.total as string) || '0'),
      yieldRate,
      workstationUtilization,
      statusDistribution: statusRows.map((r) => ({
        status: r.status as string,
        count: parseInt((r.count as string) || '0', 10),
      })),
      dailyOutput: dailyRows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().substring(0, 10) : String(r.date).substring(0, 10),
        output: parseFloat((r.output as string) || '0'),
        scrap: parseFloat((r.scrap as string) || '0'),
      })),
      topItems: topItemRows.map((r) => ({
        itemId: r.item_id as string,
        itemSku: r.sku as string,
        itemDescription: r.description as string,
        totalOutput: parseFloat((r.total_output as string) || '0'),
      })),
      activeOrders: activeOrderRows.map((r) => ({
        id: r.id as string,
        workOrderNo: r.work_order_no as string,
        itemSku: r.item_sku as string,
        status: r.status as string,
        qtyOrdered: parseFloat((r.qty_ordered as string) || '0'),
        qtyCompleted: parseFloat((r.qty_completed as string) || '0'),
        plannedEnd: (r.planned_end as Date) || null,
      })),
    };
  }

  async getManufacturingReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: {
      totalOutput: number;
      totalScrap: number;
      totalMaterialIssued: number;
      yieldRate: number;
      uniqueWorkOrders: number;
    };
    productionByDay: Array<{ date: string; output: number; scrap: number }>;
    yieldByItem: Array<{
      itemId: string;
      itemSku: string;
      itemDescription: string;
      output: number;
      scrap: number;
      yieldRate: number;
    }>;
    materialConsumption: Array<{
      itemId: string;
      itemSku: string;
      itemDescription: string;
      totalConsumed: number;
      totalReturned: number;
      netConsumed: number;
    }>;
    workstationEfficiency: Array<{
      workstationId: string;
      workstationName: string;
      operationsCompleted: number;
      avgRunTime: number;
      totalRunTime: number;
    }>;
  }> {
    const [summaryResult, productionByDayRows, yieldByItemRows, materialRows, workstationRows] =
      await Promise.all([
        this.queryOne<Record<string, unknown>>(
          `SELECT
             COALESCE(SUM(CASE WHEN entry_type = 'PRODUCTION_OUTPUT' THEN qty ELSE 0 END), 0) as total_output,
             COALESCE(SUM(CASE WHEN entry_type = 'SCRAP' THEN ABS(qty) ELSE 0 END), 0) as total_scrap,
             COALESCE(SUM(CASE WHEN entry_type = 'MATERIAL_ISSUE' THEN ABS(qty) ELSE 0 END), 0) as total_material_issued,
             COUNT(DISTINCT work_order_id) as unique_work_orders
           FROM production_ledger
           WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
          [tenantId, startDate, endDate],
        ),
        this.queryMany<Record<string, unknown>>(
          `SELECT
             created_at::date as date,
             COALESCE(SUM(CASE WHEN entry_type = 'PRODUCTION_OUTPUT' THEN qty ELSE 0 END), 0) as output,
             COALESCE(SUM(CASE WHEN entry_type = 'SCRAP' THEN ABS(qty) ELSE 0 END), 0) as scrap
           FROM production_ledger
           WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
           GROUP BY created_at::date
           ORDER BY date`,
          [tenantId, startDate, endDate],
        ),
        this.queryMany<Record<string, unknown>>(
          `SELECT
             i.id as item_id, i.sku, i.description,
             COALESCE(SUM(CASE WHEN pl.entry_type = 'PRODUCTION_OUTPUT' THEN pl.qty ELSE 0 END), 0) as output,
             COALESCE(SUM(CASE WHEN pl.entry_type = 'SCRAP' THEN ABS(pl.qty) ELSE 0 END), 0) as scrap
           FROM production_ledger pl
           JOIN items i ON i.id = pl.item_id
           WHERE pl.tenant_id = $1 AND pl.created_at >= $2 AND pl.created_at <= $3
             AND pl.entry_type IN ('PRODUCTION_OUTPUT', 'SCRAP')
           GROUP BY i.id, i.sku, i.description
           ORDER BY i.sku`,
          [tenantId, startDate, endDate],
        ),
        this.queryMany<Record<string, unknown>>(
          `SELECT
             i.id as item_id, i.sku, i.description,
             COALESCE(SUM(CASE WHEN pl.entry_type = 'MATERIAL_ISSUE' THEN ABS(pl.qty) ELSE 0 END), 0) as total_consumed,
             COALESCE(SUM(CASE WHEN pl.entry_type = 'MATERIAL_RETURN' THEN ABS(pl.qty) ELSE 0 END), 0) as total_returned
           FROM production_ledger pl
           JOIN items i ON i.id = pl.item_id
           WHERE pl.tenant_id = $1 AND pl.created_at >= $2 AND pl.created_at <= $3
             AND pl.entry_type IN ('MATERIAL_ISSUE', 'MATERIAL_RETURN')
           GROUP BY i.id, i.sku, i.description
           ORDER BY i.sku`,
          [tenantId, startDate, endDate],
        ),
        this.queryMany<Record<string, unknown>>(
          `SELECT
             ws.id as workstation_id, ws.name,
             COUNT(*) as operations_completed,
             COALESCE(AVG(woo.run_time_actual), 0) as avg_run_time,
             COALESCE(SUM(woo.run_time_actual), 0) as total_run_time
           FROM work_order_operations woo
           JOIN workstations ws ON ws.id = woo.workstation_id
           WHERE woo.tenant_id = $1 AND woo.status = 'COMPLETED'
             AND woo.actual_end >= $2 AND woo.actual_end <= $3
           GROUP BY ws.id, ws.name
           ORDER BY ws.name`,
          [tenantId, startDate, endDate],
        ),
      ]);

    const totalOutput = parseFloat((summaryResult?.total_output as string) || '0');
    const totalScrap = parseFloat((summaryResult?.total_scrap as string) || '0');
    const summaryYieldRate =
      totalOutput + totalScrap > 0 ? (totalOutput / (totalOutput + totalScrap)) * 100 : 0;

    return {
      summary: {
        totalOutput,
        totalScrap,
        totalMaterialIssued: parseFloat((summaryResult?.total_material_issued as string) || '0'),
        yieldRate: summaryYieldRate,
        uniqueWorkOrders: parseInt((summaryResult?.unique_work_orders as string) || '0', 10),
      },
      productionByDay: productionByDayRows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().substring(0, 10) : String(r.date).substring(0, 10),
        output: parseFloat((r.output as string) || '0'),
        scrap: parseFloat((r.scrap as string) || '0'),
      })),
      yieldByItem: yieldByItemRows.map((r) => {
        const itemOutput = parseFloat((r.output as string) || '0');
        const itemScrap = parseFloat((r.scrap as string) || '0');
        return {
          itemId: r.item_id as string,
          itemSku: r.sku as string,
          itemDescription: r.description as string,
          output: itemOutput,
          scrap: itemScrap,
          yieldRate: itemOutput + itemScrap > 0 ? (itemOutput / (itemOutput + itemScrap)) * 100 : 0,
        };
      }),
      materialConsumption: materialRows.map((r) => {
        const totalConsumed = parseFloat((r.total_consumed as string) || '0');
        const totalReturned = parseFloat((r.total_returned as string) || '0');
        return {
          itemId: r.item_id as string,
          itemSku: r.sku as string,
          itemDescription: r.description as string,
          totalConsumed,
          totalReturned,
          netConsumed: totalConsumed - totalReturned,
        };
      }),
      workstationEfficiency: workstationRows.map((r) => ({
        workstationId: r.workstation_id as string,
        workstationName: r.name as string,
        operationsCompleted: parseInt((r.operations_completed as string) || '0', 10),
        avgRunTime: parseFloat((r.avg_run_time as string) || '0'),
        totalRunTime: parseFloat((r.total_run_time as string) || '0'),
      })),
    };
  }

  async traceByBatch(
    tenantId: string,
    batchNo: string,
  ): Promise<{
    workOrder: {
      id: string;
      workOrderNo: string;
      batchNo: string;
      itemSku: string;
      itemDescription: string;
      status: string;
      qtyOrdered: number;
      qtyCompleted: number;
    } | null;
    materialsUsed: Array<{
      itemSku: string;
      itemDescription: string;
      batchNo: string | null;
      qty: number;
      createdAt: Date;
    }>;
    outputProduced: Array<{
      itemSku: string;
      batchNo: string | null;
      qty: number;
      createdAt: Date;
    }>;
    scrapEntries: Array<{
      itemSku: string;
      batchNo: string | null;
      qty: number;
      reasonCode: string | null;
      createdAt: Date;
    }>;
  }> {
    const workOrderRow = await this.queryOne<Record<string, unknown>>(
      `SELECT wo.id, wo.work_order_no, wo.batch_no, wo.status,
              wo.qty_ordered, wo.qty_completed,
              i.sku as item_sku, i.description as item_description
       FROM work_orders wo
       JOIN items i ON i.id = wo.item_id
       WHERE wo.tenant_id = $1 AND wo.batch_no = $2`,
      [tenantId, batchNo],
    );

    if (!workOrderRow) {
      return { workOrder: null, materialsUsed: [], outputProduced: [], scrapEntries: [] };
    }

    const workOrderId = workOrderRow.id as string;

    const [materialRows, outputRows, scrapRows] = await Promise.all([
      this.queryMany<Record<string, unknown>>(
        `SELECT pl.id, pl.item_id, i.sku as item_sku, i.description as item_description,
                pl.qty, pl.uom, pl.batch_no, pl.created_at
         FROM production_ledger pl
         JOIN items i ON i.id = pl.item_id
         WHERE pl.tenant_id = $1 AND pl.work_order_id = $2 AND pl.entry_type = 'MATERIAL_ISSUE'
         ORDER BY pl.created_at`,
        [tenantId, workOrderId],
      ),
      this.queryMany<Record<string, unknown>>(
        `SELECT pl.id, pl.item_id, i.sku as item_sku, pl.qty, pl.uom, pl.batch_no, pl.created_at
         FROM production_ledger pl
         JOIN items i ON i.id = pl.item_id
         WHERE pl.tenant_id = $1 AND pl.work_order_id = $2 AND pl.entry_type = 'PRODUCTION_OUTPUT'
         ORDER BY pl.created_at`,
        [tenantId, workOrderId],
      ),
      this.queryMany<Record<string, unknown>>(
        `SELECT pl.id, pl.item_id, i.sku as item_sku, pl.qty, pl.uom, pl.batch_no,
                pl.reason_code, pl.notes, pl.created_at
         FROM production_ledger pl
         JOIN items i ON i.id = pl.item_id
         WHERE pl.tenant_id = $1 AND pl.work_order_id = $2 AND pl.entry_type = 'SCRAP'
         ORDER BY pl.created_at`,
        [tenantId, workOrderId],
      ),
    ]);

    return {
      workOrder: {
        id: workOrderRow.id as string,
        workOrderNo: workOrderRow.work_order_no as string,
        batchNo: workOrderRow.batch_no as string,
        itemSku: workOrderRow.item_sku as string,
        itemDescription: workOrderRow.item_description as string,
        status: workOrderRow.status as string,
        qtyOrdered: parseFloat((workOrderRow.qty_ordered as string) || '0'),
        qtyCompleted: parseFloat((workOrderRow.qty_completed as string) || '0'),
      },
      materialsUsed: materialRows.map((r) => ({
        itemSku: r.item_sku as string,
        itemDescription: r.item_description as string,
        batchNo: (r.batch_no as string) || null,
        qty: parseFloat((r.qty as string) || '0'),
        createdAt: r.created_at as Date,
      })),
      outputProduced: outputRows.map((r) => ({
        itemSku: r.item_sku as string,
        batchNo: (r.batch_no as string) || null,
        qty: parseFloat((r.qty as string) || '0'),
        createdAt: r.created_at as Date,
      })),
      scrapEntries: scrapRows.map((r) => ({
        itemSku: r.item_sku as string,
        batchNo: (r.batch_no as string) || null,
        qty: parseFloat((r.qty as string) || '0'),
        reasonCode: (r.reason_code as string) || null,
        createdAt: r.created_at as Date,
      })),
    };
  }

  async forwardTrace(
    tenantId: string,
    batchNo: string,
  ): Promise<{
    sourceBatchNo: string;
    workOrders: Array<{
      id: string;
      workOrderNo: string;
      itemSku: string;
      finishedBatchNo: string | null;
      qtyConsumed: number;
    }>;
  }> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT pl.work_order_id as id, wo.work_order_no, i.sku as item_sku,
              wo.batch_no as finished_batch_no, ABS(pl.qty) as qty_consumed
       FROM production_ledger pl
       JOIN work_orders wo ON wo.id = pl.work_order_id
       JOIN items i ON i.id = wo.item_id
       WHERE pl.tenant_id = $1 AND pl.batch_no = $2 AND pl.entry_type = 'MATERIAL_ISSUE'
       ORDER BY wo.work_order_no`,
      [tenantId, batchNo],
    );

    return {
      sourceBatchNo: batchNo,
      workOrders: rows.map((r) => ({
        id: r.id as string,
        workOrderNo: r.work_order_no as string,
        itemSku: r.item_sku as string,
        finishedBatchNo: (r.finished_batch_no as string) || null,
        qtyConsumed: parseFloat((r.qty_consumed as string) || '0'),
      })),
    };
  }

  async backwardTrace(
    tenantId: string,
    batchNo: string,
  ): Promise<{
    finishedBatchNo: string;
    workOrderId: string | null;
    workOrderNo: string | null;
    materials: Array<{
      itemSku: string;
      itemDescription: string;
      batchNo: string | null;
      qty: number;
    }>;
  }> {
    const workOrderRow = await this.queryOne<Record<string, unknown>>(
      `SELECT wo.id, wo.work_order_no
       FROM work_orders wo
       WHERE wo.tenant_id = $1 AND wo.batch_no = $2`,
      [tenantId, batchNo],
    );

    if (!workOrderRow) {
      return { finishedBatchNo: batchNo, workOrderId: null, workOrderNo: null, materials: [] };
    }

    const workOrderId = workOrderRow.id as string;

    const materialRows = await this.queryMany<Record<string, unknown>>(
      `SELECT i.sku as item_sku, i.description as item_description, pl.batch_no, pl.qty
       FROM production_ledger pl
       JOIN items i ON i.id = pl.item_id
       WHERE pl.tenant_id = $1 AND pl.work_order_id = $2 AND pl.entry_type = 'MATERIAL_ISSUE'
       ORDER BY i.sku`,
      [tenantId, workOrderId],
    );

    return {
      finishedBatchNo: batchNo,
      workOrderId: workOrderRow.id as string,
      workOrderNo: workOrderRow.work_order_no as string,
      materials: materialRows.map((r) => ({
        itemSku: r.item_sku as string,
        itemDescription: r.item_description as string,
        batchNo: (r.batch_no as string) || null,
        qty: parseFloat((r.qty as string) || '0'),
      })),
    };
  }

  async getRecentBatches(tenantId: string): Promise<
    Array<{
      batchNo: string;
      workOrderNo: string;
      itemSku: string;
      status: string;
    }>
  > {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT wo.batch_no, wo.work_order_no, i.sku as item_sku, wo.status
       FROM work_orders wo
       JOIN items i ON i.id = wo.item_id
       WHERE wo.tenant_id = $1 AND wo.batch_no IS NOT NULL
       ORDER BY wo.created_at DESC
       LIMIT 20`,
      [tenantId],
    );
    return rows.map((r) => ({
      batchNo: r.batch_no as string,
      workOrderNo: r.work_order_no as string,
      itemSku: r.item_sku as string,
      status: r.status as string,
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
