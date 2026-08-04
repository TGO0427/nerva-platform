import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/db/base.repository";

export interface SalesOrder {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  customerId: string;
  customerName: string | null;
  customerCode: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
  orderNo: string;
  externalRef: string | null;
  status: string;
  priority: number;
  requestedShipDate: Date | null;
  shippingAddressLine1: string | null;
  shippingCity: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesOrderLine {
  id: string;
  tenantId: string;
  salesOrderId: string;
  lineNo: number;
  itemId: string;
  qtyOrdered: number;
  qtyAllocated: number;
  qtyPicked: number;
  qtyPacked: number;
  qtyShipped: number;
  unitPrice: number | null;
  createdAt: Date;
}

export interface StockReservation {
  id: string;
  tenantId: string;
  salesOrderLineId: string;
  binId: string;
  itemId: string;
  qty: number;
  batchNo: string | null;
  status: string;
  createdAt: Date;
}

@Injectable()
export class SalesRepository extends BaseRepository {
  async createOrder(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    customerId: string;
    orderNo: string;
    externalRef?: string;
    priority?: number;
    requestedShipDate?: Date;
    shippingAddressLine1?: string;
    shippingCity?: string;
    notes?: string;
    createdBy?: string;
  }): Promise<SalesOrder> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO sales_orders (
        tenant_id, site_id, warehouse_id, customer_id, order_no, external_ref,
        priority, requested_ship_date, shipping_address_line1, shipping_city, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.tenantId,
        data.siteId,
        data.warehouseId,
        data.customerId,
        data.orderNo,
        data.externalRef || null,
        data.priority || 5,
        data.requestedShipDate || null,
        data.shippingAddressLine1 || null,
        data.shippingCity || null,
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapOrder(row!);
  }

  async findOrderById(tenantId: string, id: string): Promise<SalesOrder | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT so.*, c.name as customer_name, c.code as customer_code,
              w.name as warehouse_name, w.code as warehouse_code
       FROM sales_orders so
       LEFT JOIN customers c ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
       LEFT JOIN warehouses w ON w.id = so.warehouse_id AND w.tenant_id = so.tenant_id
       WHERE so.id = $1 AND so.tenant_id = $2`,
      [id, tenantId],
    );
    return row ? this.mapOrder(row) : null;
  }

  async findOrdersByTenant(
    tenantId: string,
    filters: {
      status?: string;
      statusGroup?: string;
      dateRange?: string;
      customerId?: string;
      search?: string;
    },
    limit = 50,
    offset = 0,
  ): Promise<SalesOrder[]> {
    let sql = `SELECT so.*, c.name as customer_name
               FROM sales_orders so
               LEFT JOIN customers c ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
               WHERE so.tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND so.status = $${idx++}`;
      params.push(filters.status);
    } else if (filters.statusGroup === "pending") {
      sql += ` AND so.status IN ('DRAFT', 'CONFIRMED')`;
    }
    if (filters.dateRange === "last7Days") {
      sql += ` AND so.created_at >= NOW() - INTERVAL '7 days'`;
    }
    if (filters.customerId) {
      sql += ` AND so.customer_id = $${idx++}`;
      params.push(filters.customerId);
    }
    if (filters.search) {
      sql += ` AND (so.order_no ILIKE $${idx} OR c.name ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    sql += ` ORDER BY so.priority ASC, so.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapOrder);
  }

  async countOrdersByTenant(
    tenantId: string,
    filters: {
      status?: string;
      statusGroup?: string;
      dateRange?: string;
      customerId?: string;
      search?: string;
    },
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM sales_orders so
               LEFT JOIN customers c ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
               WHERE so.tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND so.status = $${idx++}`;
      params.push(filters.status);
    } else if (filters.statusGroup === "pending") {
      sql += ` AND so.status IN ('DRAFT', 'CONFIRMED')`;
    }
    if (filters.dateRange === "last7Days") {
      sql += ` AND so.created_at >= NOW() - INTERVAL '7 days'`;
    }
    if (filters.customerId) {
      sql += ` AND so.customer_id = $${idx++}`;
      params.push(filters.customerId);
    }
    if (filters.search) {
      sql += ` AND (so.order_no ILIKE $${idx} OR c.name ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || "0", 10);
  }

  async updateOrderStatus(
    tenantId: string,
    id: string,
    status: string,
  ): Promise<SalesOrder | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      "UPDATE sales_orders SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *",
      [status, id, tenantId],
    );
    return row ? this.mapOrder(row) : null;
  }

  async addOrderLine(data: {
    tenantId: string;
    salesOrderId: string;
    lineNo: number;
    itemId: string;
    qtyOrdered: number;
    unitPrice?: number;
  }): Promise<SalesOrderLine> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO sales_order_lines (tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.tenantId,
        data.salesOrderId,
        data.lineNo,
        data.itemId,
        data.qtyOrdered,
        data.unitPrice || null,
      ],
    );
    return this.mapOrderLine(row!);
  }

  async getOrderLines(salesOrderId: string): Promise<SalesOrderLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      "SELECT * FROM sales_order_lines WHERE sales_order_id = $1 ORDER BY line_no",
      [salesOrderId],
    );
    return rows.map(this.mapOrderLine);
  }

  /**
   * Tenant-wide estimated margin over the last 7 days (matches the
   * dashboard's existing weeklySalesValue window). Same cost-lookup logic
   * as getOrderLineCostEstimates, aggregated instead of per-line.
   */
  async getWeeklyMarginEstimate(
    tenantId: string,
  ): Promise<{ totalRevenue: number; totalEstimatedCost: number | null; linesWithoutCostData: number; totalLines: number }> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT
        COALESCE(SUM(sol.qty_ordered * COALESCE(sol.unit_price, 0) * (1 - COALESCE(sol.discount_pct, 0) / 100)), 0) as total_revenue,
        COALESCE(SUM(sol.qty_ordered * COALESCE(po_cost.unit_cost, si_cost.unit_cost)), 0) as total_cost,
        COUNT(*) FILTER (WHERE po_cost.unit_cost IS NULL AND si_cost.unit_cost IS NULL) as lines_without_cost,
        COUNT(*) as total_lines
      FROM sales_order_lines sol
      JOIN sales_orders so ON so.id = sol.sales_order_id
      LEFT JOIN LATERAL (
        SELECT pol.unit_cost
        FROM purchase_order_lines pol
        JOIN purchase_orders po ON po.id = pol.purchase_order_id
        WHERE pol.item_id = sol.item_id
          AND po.tenant_id = $1
          AND po.status NOT IN ('DRAFT', 'CANCELLED')
          AND pol.unit_cost IS NOT NULL
        ORDER BY po.order_date DESC
        LIMIT 1
      ) po_cost ON true
      LEFT JOIN LATERAL (
        SELECT si.unit_cost
        FROM supplier_items si
        WHERE si.item_id = sol.item_id
          AND si.tenant_id = $1
          AND si.is_active = true
          AND si.unit_cost IS NOT NULL
        ORDER BY si.is_preferred DESC
        LIMIT 1
      ) si_cost ON true
      WHERE so.tenant_id = $1 AND so.created_at >= NOW() - INTERVAL '7 days'`,
      [tenantId],
    );

    const linesWithoutCostData = parseInt((row?.lines_without_cost as string) || "0", 10);
    const totalLines = parseInt((row?.total_lines as string) || "0", 10);
    return {
      totalRevenue: parseFloat((row?.total_revenue as string) || "0"),
      totalEstimatedCost: linesWithoutCostData < totalLines ? parseFloat((row?.total_cost as string) || "0") : null,
      linesWithoutCostData,
      totalLines,
    };
  }

  /**
   * Estimated cost per line, since no cost is ever captured on the sales
   * path itself: falls back from the most recent non-cancelled PO's
   * unit_cost for that item, to the preferred active supplier's quoted
   * unit_cost. Either or both can be null if there's no purchase history --
   * callers must treat a null estimatedUnitCost as "unknown", not zero.
   */
  async getOrderLineCostEstimates(
    tenantId: string,
    salesOrderId: string,
  ): Promise<
    Array<{
      lineId: string;
      itemId: string;
      itemSku: string;
      itemDescription: string;
      qtyOrdered: number;
      unitPrice: number | null;
      discountPct: number;
      estimatedUnitCost: number | null;
      costSource: "purchase_order" | "supplier_item" | null;
    }>
  > {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT
        sol.id as line_id,
        sol.item_id,
        i.sku as item_sku,
        i.description as item_description,
        sol.qty_ordered,
        sol.unit_price,
        sol.discount_pct,
        po_cost.unit_cost as po_unit_cost,
        si_cost.unit_cost as si_unit_cost
      FROM sales_order_lines sol
      JOIN items i ON i.id = sol.item_id
      LEFT JOIN LATERAL (
        SELECT pol.unit_cost
        FROM purchase_order_lines pol
        JOIN purchase_orders po ON po.id = pol.purchase_order_id
        WHERE pol.item_id = sol.item_id
          AND po.tenant_id = $1
          AND po.status NOT IN ('DRAFT', 'CANCELLED')
          AND pol.unit_cost IS NOT NULL
        ORDER BY po.order_date DESC
        LIMIT 1
      ) po_cost ON true
      LEFT JOIN LATERAL (
        SELECT si.unit_cost
        FROM supplier_items si
        WHERE si.item_id = sol.item_id
          AND si.tenant_id = $1
          AND si.is_active = true
          AND si.unit_cost IS NOT NULL
        ORDER BY si.is_preferred DESC
        LIMIT 1
      ) si_cost ON true
      WHERE sol.sales_order_id = $2
      ORDER BY sol.line_no`,
      [tenantId, salesOrderId],
    );

    return rows.map((row) => {
      const poUnitCost = row.po_unit_cost != null ? parseFloat(row.po_unit_cost as string) : null;
      const siUnitCost = row.si_unit_cost != null ? parseFloat(row.si_unit_cost as string) : null;
      return {
        lineId: row.line_id as string,
        itemId: row.item_id as string,
        itemSku: row.item_sku as string,
        itemDescription: row.item_description as string,
        qtyOrdered: parseFloat(row.qty_ordered as string),
        unitPrice: row.unit_price != null ? parseFloat(row.unit_price as string) : null,
        discountPct: row.discount_pct != null ? parseFloat(row.discount_pct as string) : 0,
        estimatedUnitCost: poUnitCost ?? siUnitCost,
        costSource: poUnitCost != null ? "purchase_order" : siUnitCost != null ? "supplier_item" : null,
      };
    });
  }

  async updateOrderLineQty(
    lineId: string,
    field: "qty_allocated" | "qty_picked" | "qty_packed" | "qty_shipped",
    qty: number,
  ): Promise<void> {
    await this.execute(
      `UPDATE sales_order_lines SET ${field} = $1 WHERE id = $2`,
      [qty, lineId],
    );
  }

  async createReservation(data: {
    tenantId: string;
    salesOrderLineId: string;
    binId: string;
    itemId: string;
    qty: number;
    batchNo: string | null;
  }): Promise<StockReservation> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO stock_reservations (tenant_id, sales_order_line_id, bin_id, item_id, qty, batch_no)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.tenantId,
        data.salesOrderLineId,
        data.binId,
        data.itemId,
        data.qty,
        data.batchNo,
      ],
    );
    return this.mapReservation(row!);
  }

  async findReservationsBySalesOrderLine(
    lineId: string,
    status?: string,
  ): Promise<StockReservation[]> {
    let sql = "SELECT * FROM stock_reservations WHERE sales_order_line_id = $1";
    const params: unknown[] = [lineId];
    if (status) {
      sql += " AND status = $2";
      params.push(status);
    }
    sql += " ORDER BY created_at";
    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapReservation);
  }

  async updateReservationStatus(id: string, status: string): Promise<void> {
    await this.execute(
      "UPDATE stock_reservations SET status = $1 WHERE id = $2",
      [status, id],
    );
  }

  private mapReservation(row: Record<string, unknown>): StockReservation {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      salesOrderLineId: row.sales_order_line_id as string,
      binId: row.bin_id as string,
      itemId: row.item_id as string,
      qty: parseFloat(row.qty as string),
      batchNo: row.batch_no as string | null,
      status: row.status as string,
      createdAt: row.created_at as Date,
    };
  }

  async updateOrder(
    tenantId: string,
    id: string,
    data: {
      customerId?: string;
      warehouseId?: string;
      priority?: number;
      requestedShipDate?: Date | null;
      notes?: string | null;
    },
  ): Promise<SalesOrder | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.customerId !== undefined) {
      sets.push(`customer_id = $${idx++}`);
      params.push(data.customerId);
    }
    if (data.warehouseId !== undefined) {
      sets.push(`warehouse_id = $${idx++}`);
      params.push(data.warehouseId);
    }
    if (data.priority !== undefined) {
      sets.push(`priority = $${idx++}`);
      params.push(data.priority);
    }
    if (data.requestedShipDate !== undefined) {
      sets.push(`requested_ship_date = $${idx++}`);
      params.push(data.requestedShipDate);
    }
    if (data.notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    if (sets.length === 0) return this.findOrderById(tenantId, id);

    sets.push(`updated_at = NOW()`);
    params.push(id, tenantId);

    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE sales_orders SET ${sets.join(", ")} WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
      params,
    );
    return row ? this.mapOrder(row) : null;
  }

  async deleteOrderLines(salesOrderId: string): Promise<void> {
    await this.execute(
      "DELETE FROM sales_order_lines WHERE sales_order_id = $1",
      [salesOrderId],
    );
  }

  async deleteOrder(tenantId: string, id: string): Promise<boolean> {
    const count = await this.execute(
      "DELETE FROM sales_orders WHERE id = $1 AND tenant_id = $2",
      [id, tenantId],
    );
    return count > 0;
  }

  async getOrderStats(tenantId: string): Promise<{
    total: number;
    open: number;
    inFulfilment: number;
    shipped: number;
  }> {
    const result = await this.queryOne<Record<string, string>>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('DRAFT','CONFIRMED','ALLOCATED')) as open,
        COUNT(*) FILTER (WHERE status IN ('PICKING','PACKING','READY_TO_SHIP')) as in_fulfilment,
        COUNT(*) FILTER (WHERE status = 'SHIPPED') as shipped
      FROM sales_orders WHERE tenant_id = $1`,
      [tenantId],
    );
    return {
      total: parseInt(result?.total || "0", 10),
      open: parseInt(result?.open || "0", 10),
      inFulfilment: parseInt(result?.in_fulfilment || "0", 10),
      shipped: parseInt(result?.shipped || "0", 10),
    };
  }

  async findExistingExternalRefs(
    tenantId: string,
    refs: Array<{ externalRef: string; customerId: string }>,
  ): Promise<Set<string>> {
    if (refs.length === 0) return new Set();
    // Build a query that checks for existing orders with the same external_ref + customer_id
    const conditions: string[] = [];
    const params: unknown[] = [tenantId];
    let idx = 2;
    for (const ref of refs) {
      conditions.push(`(external_ref = $${idx} AND customer_id = $${idx + 1})`);
      params.push(ref.externalRef, ref.customerId);
      idx += 2;
    }
    const rows = await this.queryMany<{
      external_ref: string;
      customer_id: string;
    }>(
      `SELECT external_ref, customer_id FROM sales_orders WHERE tenant_id = $1 AND (${conditions.join(" OR ")})`,
      params,
    );
    const set = new Set<string>();
    for (const row of rows) {
      set.add(`${row.external_ref}::${row.customer_id}`);
    }
    return set;
  }

  async generateOrderNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM sales_orders WHERE tenant_id = $1",
      [tenantId],
    );
    const count = parseInt(result?.count || "0", 10) + 1;
    return `SO-${count.toString().padStart(6, "0")}`;
  }

  private mapOrder(row: Record<string, unknown>): SalesOrder {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      customerId: row.customer_id as string,
      customerName: (row.customer_name as string) || null,
      customerCode: (row.customer_code as string) || null,
      warehouseName: (row.warehouse_name as string) || null,
      warehouseCode: (row.warehouse_code as string) || null,
      orderNo: row.order_no as string,
      externalRef: row.external_ref as string | null,
      status: row.status as string,
      priority: row.priority as number,
      requestedShipDate: row.requested_ship_date as Date | null,
      shippingAddressLine1: row.shipping_address_line1 as string | null,
      shippingCity: row.shipping_city as string | null,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapOrderLine(row: Record<string, unknown>): SalesOrderLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      salesOrderId: row.sales_order_id as string,
      lineNo: row.line_no as number,
      itemId: row.item_id as string,
      qtyOrdered: parseFloat(row.qty_ordered as string),
      qtyAllocated: parseFloat(row.qty_allocated as string),
      qtyPicked: parseFloat(row.qty_picked as string),
      qtyPacked: parseFloat(row.qty_packed as string),
      qtyShipped: parseFloat(row.qty_shipped as string),
      unitPrice: row.unit_price ? parseFloat(row.unit_price as string) : null,
      createdAt: row.created_at as Date,
    };
  }
}
