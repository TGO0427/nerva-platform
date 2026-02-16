import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface SalesOrder {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  customerId: string;
  customerName: string | null;
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

  async findOrderById(id: string): Promise<SalesOrder | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT so.*, c.name as customer_name
       FROM sales_orders so
       LEFT JOIN customers c ON c.id = so.customer_id AND c.tenant_id = so.tenant_id
       WHERE so.id = $1`,
      [id],
    );
    return row ? this.mapOrder(row) : null;
  }

  async findOrdersByTenant(
    tenantId: string,
    filters: { status?: string; customerId?: string },
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
    }
    if (filters.customerId) {
      sql += ` AND so.customer_id = $${idx++}`;
      params.push(filters.customerId);
    }

    sql += ` ORDER BY so.priority ASC, so.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapOrder);
  }

  async countOrdersByTenant(
    tenantId: string,
    filters: { status?: string; customerId?: string },
  ): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM sales_orders WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.customerId) {
      sql += ` AND customer_id = $${idx++}`;
      params.push(filters.customerId);
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async updateOrderStatus(id: string, status: string): Promise<SalesOrder | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'UPDATE sales_orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
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
      'SELECT * FROM sales_order_lines WHERE sales_order_id = $1 ORDER BY line_no',
      [salesOrderId],
    );
    return rows.map(this.mapOrderLine);
  }

  async updateOrderLineQty(
    lineId: string,
    field: 'qty_allocated' | 'qty_picked' | 'qty_packed' | 'qty_shipped',
    qty: number,
  ): Promise<void> {
    await this.execute(
      `UPDATE sales_order_lines SET ${field} = $1 WHERE id = $2`,
      [qty, lineId],
    );
  }

  async generateOrderNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM sales_orders WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `SO-${count.toString().padStart(6, '0')}`;
  }

  private mapOrder(row: Record<string, unknown>): SalesOrder {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      customerId: row.customer_id as string,
      customerName: (row.customer_name as string) || null,
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
