import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../../common/db/base.repository";

@Injectable()
export class MrpRepository extends BaseRepository {
  // Which of these items have an active supplier link - "Create PO" only
  // makes sense on a row where the exact item code is actually purchasable,
  // not just any shortage (a manufactured-only item may have no purchasable
  // equivalent under the same code at all).
  private async getActiveSupplierItemSet(
    tenantId: string,
    itemIds: string[],
  ): Promise<Set<string>> {
    if (itemIds.length === 0) return new Set();
    const rows = await this.queryMany<{ item_id: string }>(
      `SELECT DISTINCT item_id FROM supplier_items
       WHERE tenant_id = $1 AND item_id = ANY($2::uuid[]) AND is_active = true`,
      [tenantId, itemIds],
    );
    return new Set(rows.map((r) => r.item_id));
  }

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

    const workOrderDemandBase = demandRows.map((row) => ({
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

    const workOrderHasSupplierSet = await this.getActiveSupplierItemSet(
      tenantId,
      [...new Set(workOrderDemandBase.map((r) => r.itemId))],
    );
    const workOrderDemand = workOrderDemandBase.map((row) => ({
      ...row,
      hasActiveSupplier: workOrderHasSupplierSet.has(row.itemId),
    }));

    const itemSummaryBase = summaryRows.map((row) => ({
      itemId: row.item_id as string,
      itemSku: row.item_sku as string,
      itemDescription: row.item_description as string,
      warehouseId: row.warehouse_id as string,
      warehouseName: row.warehouse_name as string,
      totalDemand: parseFloat((row.total_demand as string) || "0"),
      totalOutstanding: parseFloat((row.total_outstanding as string) || "0"),
      availableStock: parseFloat((row.available_stock as string) || "0"),
      nearestPoNo: (row.nearest_po_no as string) ?? null,
      nearestPoExpectedDate: row.nearest_po_expected_date
        ? String(row.nearest_po_expected_date)
        : null,
      supplierLeadTimeDays:
        row.supplier_lead_time_days != null
          ? Number(row.supplier_lead_time_days)
          : null,
    }));

    const salesOrderDemand = await this.calculateSalesOrderDemand(
      tenantId,
      poLookupCte,
    );

    const { itemSummary, hasActiveBomSet, hasActiveSupplierSet } =
      await this.mergeItemSummary(tenantId, itemSummaryBase, salesOrderDemand);

    return {
      workOrderDemand,
      salesOrderDemand,
      itemSummary: itemSummary.map((row) => ({
        ...row,
        hasActiveBom: hasActiveBomSet.has(row.itemId),
        hasActiveSupplier: hasActiveSupplierSet.has(row.itemId),
      })),
    };
  }

  // A sales order demands a FINISHED item, not raw materials directly - so
  // this explodes each open, uncovered sales order line through that item's
  // active BOM into raw-material demand. Sales orders that already have a
  // linked (non-cancelled) work order are excluded entirely, since that
  // work order's own materials already represent this demand - there's no
  // line-level link to net partial coverage, so it's all-or-nothing.
  private async calculateSalesOrderDemand(
    tenantId: string,
    poLookupCte: string,
  ) {
    const openLines = await this.queryMany<Record<string, unknown>>(
      `SELECT sol.id as line_id, so.id as sales_order_id, so.order_no,
              so.warehouse_id, w.name as warehouse_name, c.name as customer_name,
              sol.item_id, i.sku as item_sku, i.description as item_description,
              (sol.qty_ordered - sol.qty_allocated) as qty_outstanding
       FROM sales_order_lines sol
       JOIN sales_orders so ON so.id = sol.sales_order_id
       JOIN warehouses w ON w.id = so.warehouse_id
       LEFT JOIN customers c ON c.id = so.customer_id
       JOIN items i ON i.id = sol.item_id
       WHERE so.tenant_id = $1
         AND so.status NOT IN ('SHIPPED', 'DELIVERED', 'CANCELLED')
         AND (sol.qty_ordered - sol.qty_allocated) > 0
         AND NOT EXISTS (
           SELECT 1 FROM work_orders wo
           WHERE wo.sales_order_id = so.id AND wo.status != 'CANCELLED'
         )`,
      [tenantId],
    );

    if (openLines.length === 0) return [];

    const finishedItemIds = [
      ...new Set(openLines.map((r) => r.item_id as string)),
    ];

    const bomHeaderRows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM bom_headers
       WHERE tenant_id = $1 AND item_id = ANY($2::uuid[]) AND status = 'APPROVED'
         AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY item_id, version DESC, revision DESC`,
      [tenantId, finishedItemIds],
    );
    // First row per item_id is the active one (already ordered version/revision DESC).
    const activeBomByItem = new Map<string, Record<string, unknown>>();
    for (const row of bomHeaderRows) {
      const itemId = row.item_id as string;
      if (!activeBomByItem.has(itemId)) activeBomByItem.set(itemId, row);
    }

    const bomHeaderIds = [...activeBomByItem.values()].map(
      (h) => h.id as string,
    );
    const bomLineRows =
      bomHeaderIds.length > 0
        ? await this.queryMany<Record<string, unknown>>(
            `SELECT bl.*, i.sku as item_sku, i.description as item_description
             FROM bom_lines bl
             JOIN items i ON i.id = bl.item_id
             WHERE bl.bom_header_id = ANY($1::uuid[])
             ORDER BY bl.bom_header_id, bl.line_no`,
            [bomHeaderIds],
          )
        : [];
    const linesByHeader = new Map<string, Record<string, unknown>[]>();
    for (const line of bomLineRows) {
      const headerId = line.bom_header_id as string;
      if (!linesByHeader.has(headerId)) linesByHeader.set(headerId, []);
      linesByHeader.get(headerId)!.push(line);
    }

    // Each open line demands two things: the ordered (assembly) item itself
    // - do we have/can we build enough finished units? - and, if it has an
    // active BOM, the raw materials to build more of it. Both are surfaced
    // as rows here so a shortage of already-built finished stock ("Create
    // Work Order" on the assembly) is as visible as a shortage of the
    // materials to make it ("Create PO"/"Create Work Order" on the
    // component). An item with no active BOM still gets its assembly row -
    // it just can't be exploded into raw materials, so it contributes no
    // component rows.
    type DemandRow = {
      salesOrderId: string;
      orderNo: string;
      customerName: string | null;
      warehouseId: string;
      warehouseName: string;
      itemId: string;
      itemSku: string;
      itemDescription: string;
      demandType: "ASSEMBLY" | "COMPONENT";
      qtyRequired: number;
    };
    const assemblyRows: DemandRow[] = [];
    const componentRows: DemandRow[] = [];
    for (const line of openLines) {
      const qtyOutstanding = parseFloat((line.qty_outstanding as string) || "0");
      assemblyRows.push({
        salesOrderId: line.sales_order_id as string,
        orderNo: line.order_no as string,
        customerName: (line.customer_name as string) ?? null,
        warehouseId: line.warehouse_id as string,
        warehouseName: line.warehouse_name as string,
        itemId: line.item_id as string,
        itemSku: line.item_sku as string,
        itemDescription: line.item_description as string,
        demandType: "ASSEMBLY",
        qtyRequired: qtyOutstanding,
      });

      const bomHeader = activeBomByItem.get(line.item_id as string);
      if (!bomHeader) continue;
      const bomLines = linesByHeader.get(bomHeader.id as string) || [];
      const baseQty = parseFloat((bomHeader.base_qty as string) || "1") || 1;

      for (const bomLine of bomLines) {
        const qtyPer = parseFloat((bomLine.qty_per as string) || "0");
        const scrapPct = parseFloat((bomLine.scrap_pct as string) || "0");
        const qtyRequired = (qtyPer / baseQty) * qtyOutstanding * (1 + scrapPct / 100);
        if (qtyRequired <= 0) continue;

        componentRows.push({
          salesOrderId: line.sales_order_id as string,
          orderNo: line.order_no as string,
          customerName: (line.customer_name as string) ?? null,
          warehouseId: line.warehouse_id as string,
          warehouseName: line.warehouse_name as string,
          itemId: bomLine.item_id as string,
          itemSku: bomLine.item_sku as string,
          itemDescription: bomLine.item_description as string,
          demandType: "COMPONENT",
          qtyRequired,
        });
      }
    }

    const allRows = [...assemblyRows, ...componentRows];
    if (allRows.length === 0) return [];

    // Assembly items' BOM status is already known from activeBomByItem.
    // Component items (raw materials) need their own check - a raw
    // material can itself be a manufactured intermediate with its own BOM
    // (e.g. a sub-assembly), which is what makes "Create Work Order" a
    // sensible action on a component row too.
    const componentItemIds = [...new Set(componentRows.map((r) => r.itemId))];
    const componentBomRows =
      componentItemIds.length > 0
        ? await this.queryMany<{ item_id: string }>(
            `SELECT DISTINCT item_id FROM bom_headers
             WHERE tenant_id = $1 AND item_id = ANY($2::uuid[]) AND status = 'APPROVED'
               AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
            [tenantId, componentItemIds],
          )
        : [];
    const hasActiveBomForItem = new Set<string>(activeBomByItem.keys());
    for (const row of componentBomRows) hasActiveBomForItem.add(row.item_id);

    const hasActiveSupplierForItem = await this.getActiveSupplierItemSet(
      tenantId,
      [...new Set(allRows.map((r) => r.itemId))],
    );

    // One stock/PO/lead-time lookup per distinct (item, warehouse) pair -
    // same per-warehouse scoping as the work-order query above.
    const pairKey = (itemId: string, warehouseId: string) => `${itemId}::${warehouseId}`;
    const distinctPairs = new Map<string, { itemId: string; warehouseId: string }>();
    for (const row of allRows) {
      distinctPairs.set(pairKey(row.itemId, row.warehouseId), {
        itemId: row.itemId,
        warehouseId: row.warehouseId,
      });
    }
    const pairsArr = [...distinctPairs.values()];

    const stockRows = await this.queryMany<Record<string, unknown>>(
      `WITH ${poLookupCte},
       pairs AS (
         SELECT * FROM UNNEST($2::uuid[], $3::uuid[]) AS t(item_id, warehouse_id)
       )
       SELECT p.item_id, p.warehouse_id,
         COALESCE(ss.qty_available, 0) as available_stock,
         po_lookup.po_no as nearest_po_no,
         po_lookup.expected_date as nearest_po_expected_date,
         lead_time_lookup.lead_time_days as supplier_lead_time_days
       FROM pairs p
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(snap.qty_available), 0) as qty_available
         FROM stock_snapshot snap
         JOIN bins b ON b.id = snap.bin_id
         WHERE snap.item_id = p.item_id AND snap.tenant_id = $1 AND b.warehouse_id = p.warehouse_id
       ) ss ON true
       LEFT JOIN po_lookup ON po_lookup.item_id = p.item_id
       LEFT JOIN lead_time_lookup ON lead_time_lookup.item_id = p.item_id`,
      [
        tenantId,
        pairsArr.map((p) => p.itemId),
        pairsArr.map((p) => p.warehouseId),
      ],
    );
    const stockByPair = new Map<string, Record<string, unknown>>();
    for (const row of stockRows) {
      stockByPair.set(
        pairKey(row.item_id as string, row.warehouse_id as string),
        row,
      );
    }

    return allRows.map((row) => {
      const stock = stockByPair.get(pairKey(row.itemId, row.warehouseId));
      const availableStock = parseFloat((stock?.available_stock as string) || "0");
      return {
        salesOrderId: row.salesOrderId,
        orderNo: row.orderNo,
        customerName: row.customerName,
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName,
        itemId: row.itemId,
        itemSku: row.itemSku,
        itemDescription: row.itemDescription,
        demandType: row.demandType,
        hasActiveBom: hasActiveBomForItem.has(row.itemId),
        hasActiveSupplier: hasActiveSupplierForItem.has(row.itemId),
        qtyRequired: row.qtyRequired,
        availableStock,
        shortage: Math.max(row.qtyRequired - availableStock, 0),
        nearestPoNo: (stock?.nearest_po_no as string) ?? null,
        nearestPoExpectedDate: stock?.nearest_po_expected_date
          ? String(stock.nearest_po_expected_date)
          : null,
        supplierLeadTimeDays:
          stock?.supplier_lead_time_days != null
            ? Number(stock.supplier_lead_time_days)
            : null,
      };
    });
  }

  // Combines work-order-derived and sales-order-derived demand at the
  // item+warehouse grain (summing both before computing net shortage), and
  // flags which items are themselves manufactured (have their own active
  // BOM) - the frontend needs that to decide whether "Create Work Order"
  // is a sensible suggested action for a given shortage.
  private async mergeItemSummary(
    tenantId: string,
    base: Array<{
      itemId: string;
      itemSku: string;
      itemDescription: string;
      warehouseId: string;
      warehouseName: string;
      totalDemand: number;
      totalOutstanding: number;
      availableStock: number;
      nearestPoNo: string | null;
      nearestPoExpectedDate: string | null;
      supplierLeadTimeDays: number | null;
    }>,
    salesOrderDemand: Array<{
      itemId: string;
      itemSku: string;
      itemDescription: string;
      warehouseId: string;
      warehouseName: string;
      qtyRequired: number;
      availableStock: number;
      nearestPoNo: string | null;
      nearestPoExpectedDate: string | null;
      supplierLeadTimeDays: number | null;
    }>,
  ) {
    const key = (itemId: string, warehouseId: string) => `${itemId}::${warehouseId}`;
    const merged = new Map<string, (typeof base)[number]>();
    for (const row of base) {
      merged.set(key(row.itemId, row.warehouseId), { ...row });
    }

    for (const row of salesOrderDemand) {
      const k = key(row.itemId, row.warehouseId);
      const existing = merged.get(k);
      if (existing) {
        existing.totalDemand += row.qtyRequired;
        existing.totalOutstanding += row.qtyRequired;
      } else {
        merged.set(k, {
          itemId: row.itemId,
          itemSku: row.itemSku,
          itemDescription: row.itemDescription,
          warehouseId: row.warehouseId,
          warehouseName: row.warehouseName,
          totalDemand: row.qtyRequired,
          totalOutstanding: row.qtyRequired,
          availableStock: row.availableStock,
          nearestPoNo: row.nearestPoNo,
          nearestPoExpectedDate: row.nearestPoExpectedDate,
          supplierLeadTimeDays: row.supplierLeadTimeDays,
        });
      }
    }

    const itemSummary = [...merged.values()]
      .map((row) => ({
        ...row,
        netShortage: Math.max(row.totalOutstanding - row.availableStock, 0),
      }))
      .sort((a, b) => b.netShortage - a.netShortage);

    const itemIds = [...new Set(itemSummary.map((r) => r.itemId))];
    const hasActiveBomSet = new Set<string>();
    if (itemIds.length > 0) {
      const bomRows = await this.queryMany<{ item_id: string }>(
        `SELECT DISTINCT item_id FROM bom_headers
         WHERE tenant_id = $1 AND item_id = ANY($2::uuid[]) AND status = 'APPROVED'
           AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
           AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
        [tenantId, itemIds],
      );
      for (const row of bomRows) hasActiveBomSet.add(row.item_id);
    }
    const hasActiveSupplierSet = await this.getActiveSupplierItemSet(
      tenantId,
      itemIds,
    );

    return { itemSummary, hasActiveBomSet, hasActiveSupplierSet };
  }
}
