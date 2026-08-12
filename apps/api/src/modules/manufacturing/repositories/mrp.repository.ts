import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../../common/db/base.repository";

@Injectable()
export class MrpRepository extends BaseRepository {
  async calculateRequirements(tenantId: string) {
    // Nearest open PO per item (soonest expected_date among PO statuses that
    // still represent incoming stock), plus a fallback to the preferred
    // supplier's quoted lead time when no PO exists yet.
    const poLookupCte = `
      po_lookup AS (
        SELECT DISTINCT ON (pol.item_id)
          pol.item_id,
          po.po_no,
          po.expected_date
        FROM purchase_order_lines pol
        JOIN purchase_orders po ON po.id = pol.purchase_order_id
        WHERE po.tenant_id = $1
          AND po.status IN ('SENT', 'CONFIRMED', 'PARTIAL')
          AND pol.qty_received < pol.qty_ordered
        ORDER BY pol.item_id, po.expected_date ASC NULLS LAST
      ),
      lead_time_lookup AS (
        SELECT DISTINCT ON (si.item_id)
          si.item_id,
          si.lead_time_days
        FROM supplier_items si
        WHERE si.tenant_id = $1 AND si.is_active = true
        ORDER BY si.item_id, si.is_preferred DESC, si.lead_time_days ASC NULLS LAST
      )
    `;

    // Stock has to be scoped to the work order's own warehouse, not summed
    // tenant-wide - stock sitting in a different warehouse can't actually
    // cover this shortage, and tenant-wide summing would hide that.
    const demandRows = await this.queryMany<Record<string, unknown>>(
      `WITH ${poLookupCte}
      SELECT
        wo.id as work_order_id,
        wo.work_order_no,
        wo.status as work_order_status,
        wo.warehouse_id,
        w.name as warehouse_name,
        wom.item_id,
        i.sku as item_sku,
        i.description as item_description,
        wom.qty_required,
        wom.qty_issued,
        (wom.qty_required - wom.qty_issued) as qty_outstanding,
        COALESCE(ss.qty_available, 0) as available_stock,
        GREATEST((wom.qty_required - wom.qty_issued) - COALESCE(ss.qty_available, 0), 0) as shortage,
        po_lookup.po_no as nearest_po_no,
        po_lookup.expected_date as nearest_po_expected_date,
        lead_time_lookup.lead_time_days as supplier_lead_time_days
      FROM work_order_materials wom
      JOIN work_orders wo ON wo.id = wom.work_order_id
      JOIN warehouses w ON w.id = wo.warehouse_id
      JOIN items i ON i.id = wom.item_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(snap.qty_available), 0) as qty_available
        FROM stock_snapshot snap
        JOIN bins b ON b.id = snap.bin_id
        WHERE snap.item_id = wom.item_id AND snap.tenant_id = $1 AND b.warehouse_id = wo.warehouse_id
      ) ss ON true
      LEFT JOIN po_lookup ON po_lookup.item_id = wom.item_id
      LEFT JOIN lead_time_lookup ON lead_time_lookup.item_id = wom.item_id
      WHERE wo.tenant_id = $1
        AND wo.status IN ('DRAFT', 'RELEASED', 'IN_PROGRESS')
        AND wom.qty_required > wom.qty_issued
      ORDER BY shortage DESC, wo.work_order_no`,
      [tenantId],
    );

    // Grain is item+warehouse, not just item - the same item can be short
    // in one warehouse and fine in another, and netting those together
    // against a single shared stock figure would mask that.
    const summaryRows = await this.queryMany<Record<string, unknown>>(
      `WITH ${poLookupCte}
      SELECT
        wom.item_id,
        i.sku as item_sku,
        i.description as item_description,
        wo.warehouse_id,
        w.name as warehouse_name,
        SUM(wom.qty_required) as total_demand,
        SUM(wom.qty_required - wom.qty_issued) as total_outstanding,
        COALESCE(ss.qty_available, 0) as available_stock,
        GREATEST(SUM(wom.qty_required - wom.qty_issued) - COALESCE(ss.qty_available, 0), 0) as net_shortage,
        po_lookup.po_no as nearest_po_no,
        po_lookup.expected_date as nearest_po_expected_date,
        lead_time_lookup.lead_time_days as supplier_lead_time_days
      FROM work_order_materials wom
      JOIN work_orders wo ON wo.id = wom.work_order_id
      JOIN warehouses w ON w.id = wo.warehouse_id
      JOIN items i ON i.id = wom.item_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(snap.qty_available), 0) as qty_available
        FROM stock_snapshot snap
        JOIN bins b ON b.id = snap.bin_id
        WHERE snap.item_id = wom.item_id AND snap.tenant_id = $1 AND b.warehouse_id = wo.warehouse_id
      ) ss ON true
      LEFT JOIN po_lookup ON po_lookup.item_id = wom.item_id
      LEFT JOIN lead_time_lookup ON lead_time_lookup.item_id = wom.item_id
      WHERE wo.tenant_id = $1
        AND wo.status IN ('DRAFT', 'RELEASED', 'IN_PROGRESS')
        AND wom.qty_required > wom.qty_issued
      GROUP BY wom.item_id, i.sku, i.description, wo.warehouse_id, w.name, ss.qty_available, po_lookup.po_no, po_lookup.expected_date, lead_time_lookup.lead_time_days
      ORDER BY net_shortage DESC`,
      [tenantId],
    );

    const workOrderDemand = demandRows.map((row) => ({
      workOrderId: row.work_order_id as string,
      workOrderNo: row.work_order_no as string,
      workOrderStatus: row.work_order_status as string,
      warehouseId: row.warehouse_id as string,
      warehouseName: row.warehouse_name as string,
      itemId: row.item_id as string,
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      qtyRequired: parseFloat((row.qty_required as string) || "0"),
      qtyIssued: parseFloat((row.qty_issued as string) || "0"),
      qtyOutstanding: parseFloat((row.qty_outstanding as string) || "0"),
      availableStock: parseFloat((row.available_stock as string) || "0"),
      shortage: parseFloat((row.shortage as string) || "0"),
      nearestPoNo: (row.nearest_po_no as string) ?? null,
      nearestPoExpectedDate: row.nearest_po_expected_date
        ? String(row.nearest_po_expected_date)
        : null,
      supplierLeadTimeDays:
        row.supplier_lead_time_days != null
          ? Number(row.supplier_lead_time_days)
          : null,
    }));

    const itemSummary = summaryRows.map((row) => ({
      itemId: row.item_id as string,
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      warehouseId: row.warehouse_id as string,
      warehouseName: row.warehouse_name as string,
      totalDemand: parseFloat((row.total_demand as string) || "0"),
      totalOutstanding: parseFloat((row.total_outstanding as string) || "0"),
      availableStock: parseFloat((row.available_stock as string) || "0"),
      netShortage: parseFloat((row.net_shortage as string) || "0"),
      nearestPoNo: (row.nearest_po_no as string) ?? null,
      nearestPoExpectedDate: row.nearest_po_expected_date
        ? String(row.nearest_po_expected_date)
        : null,
      supplierLeadTimeDays:
        row.supplier_lead_time_days != null
          ? Number(row.supplier_lead_time_days)
          : null,
    }));

    return { workOrderDemand, itemSummary };
  }
}
