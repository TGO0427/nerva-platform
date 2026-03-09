import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../../common/db/base.repository";

@Injectable()
export class MrpRepository extends BaseRepository {
  async calculateRequirements(tenantId: string) {
    const demandRows = await this.queryMany<Record<string, unknown>>(
      `SELECT
        wo.id as work_order_id,
        wo.work_order_no,
        wo.status as work_order_status,
        wom.item_id,
        i.sku as item_sku,
        i.description as item_description,
        wom.qty_required,
        wom.qty_issued,
        (wom.qty_required - wom.qty_issued) as qty_outstanding,
        COALESCE(ss.qty_available, 0) as available_stock,
        GREATEST((wom.qty_required - wom.qty_issued) - COALESCE(ss.qty_available, 0), 0) as shortage
      FROM work_order_materials wom
      JOIN work_orders wo ON wo.id = wom.work_order_id
      JOIN items i ON i.id = wom.item_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(qty_available), 0) as qty_available
        FROM stock_snapshot WHERE item_id = wom.item_id AND tenant_id = $1
      ) ss ON true
      WHERE wo.tenant_id = $1
        AND wo.status IN ('DRAFT', 'RELEASED', 'IN_PROGRESS')
        AND wom.qty_required > wom.qty_issued
      ORDER BY shortage DESC, wo.work_order_no`,
      [tenantId],
    );

    const summaryRows = await this.queryMany<Record<string, unknown>>(
      `SELECT
        wom.item_id,
        i.sku as item_sku,
        i.description as item_description,
        SUM(wom.qty_required) as total_demand,
        SUM(wom.qty_required - wom.qty_issued) as total_outstanding,
        COALESCE(ss.qty_available, 0) as available_stock,
        GREATEST(SUM(wom.qty_required - wom.qty_issued) - COALESCE(ss.qty_available, 0), 0) as net_shortage
      FROM work_order_materials wom
      JOIN work_orders wo ON wo.id = wom.work_order_id
      JOIN items i ON i.id = wom.item_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(qty_available), 0) as qty_available
        FROM stock_snapshot WHERE item_id = wom.item_id AND tenant_id = $1
      ) ss ON true
      WHERE wo.tenant_id = $1
        AND wo.status IN ('DRAFT', 'RELEASED', 'IN_PROGRESS')
        AND wom.qty_required > wom.qty_issued
      GROUP BY wom.item_id, i.sku, i.description, ss.qty_available
      ORDER BY net_shortage DESC`,
      [tenantId],
    );

    const workOrderDemand = demandRows.map((row) => ({
      workOrderId: row.work_order_id as string,
      workOrderNo: row.work_order_no as string,
      workOrderStatus: row.work_order_status as string,
      itemId: row.item_id as string,
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      qtyRequired: parseFloat((row.qty_required as string) || "0"),
      qtyIssued: parseFloat((row.qty_issued as string) || "0"),
      qtyOutstanding: parseFloat((row.qty_outstanding as string) || "0"),
      availableStock: parseFloat((row.available_stock as string) || "0"),
      shortage: parseFloat((row.shortage as string) || "0"),
    }));

    const itemSummary = summaryRows.map((row) => ({
      itemId: row.item_id as string,
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      totalDemand: parseFloat((row.total_demand as string) || "0"),
      totalOutstanding: parseFloat((row.total_outstanding as string) || "0"),
      availableStock: parseFloat((row.available_stock as string) || "0"),
      netShortage: parseFloat((row.net_shortage as string) || "0"),
    }));

    return { workOrderDemand, itemSummary };
  }
}
