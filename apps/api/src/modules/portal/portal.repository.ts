import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

@Injectable()
export class PortalRepository extends BaseRepository {
  // Dashboard stats
  async getDashboardStats(tenantId: string, customerId: string) {
    const stats = await this.queryOne<{
      total_orders: string;
      pending_deliveries: string;
      open_returns: string;
      outstanding_invoices: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM sales_orders WHERE tenant_id = $1 AND customer_id = $2) as total_orders,
        (SELECT COUNT(*) FROM dispatch_stops WHERE tenant_id = $1 AND customer_id = $2 AND status IN ('PENDING','EN_ROUTE','ARRIVED')) as pending_deliveries,
        (SELECT COUNT(*) FROM rmas WHERE tenant_id = $1 AND customer_id = $2 AND status NOT IN ('CLOSED','CANCELLED')) as open_returns,
        (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND customer_id = $2 AND status IN ('SENT','OVERDUE')) as outstanding_invoices`,
      [tenantId, customerId],
    );
    return {
      totalOrders: parseInt(stats?.total_orders || '0', 10),
      pendingDeliveries: parseInt(stats?.pending_deliveries || '0', 10),
      openReturns: parseInt(stats?.open_returns || '0', 10),
      outstandingInvoices: parseInt(stats?.outstanding_invoices || '0', 10),
    };
  }

  // Orders
  async findOrders(tenantId: string, customerId: string, page: number, limit: number, status?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [tenantId, customerId, limit, offset];
    let whereExtra = '';
    if (status) {
      params.push(status);
      whereExtra = ` AND so.status = $${params.length}`;
    }

    const rows = await this.queryMany<any>(
      `SELECT so.id, so.order_no, so.status, so.priority, so.requested_ship_date,
              so.created_at, so.updated_at,
              c.name as customer_name
       FROM sales_orders so
       JOIN customers c ON c.id = so.customer_id
       WHERE so.tenant_id = $1 AND so.customer_id = $2${whereExtra}
       ORDER BY so.created_at DESC
       LIMIT $3 OFFSET $4`,
      params,
    );

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM sales_orders WHERE tenant_id = $1 AND customer_id = $2${status ? ` AND status = $3` : ''}`,
      status ? [tenantId, customerId, status] : [tenantId, customerId],
    );
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOrderById(tenantId: string, customerId: string, orderId: string) {
    return this.queryOne<any>(
      `SELECT so.*, c.name as customer_name
       FROM sales_orders so
       JOIN customers c ON c.id = so.customer_id
       WHERE so.id = $1 AND so.tenant_id = $2 AND so.customer_id = $3`,
      [orderId, tenantId, customerId],
    );
  }

  async findOrderLines(orderId: string) {
    return this.queryMany<any>(
      `SELECT sol.*, i.sku as item_sku, i.description as item_description
       FROM sales_order_lines sol
       JOIN items i ON i.id = sol.item_id
       WHERE sol.sales_order_id = $1
       ORDER BY sol.line_no`,
      [orderId],
    );
  }

  // Invoices
  async findInvoices(tenantId: string, customerId: string, page: number, limit: number, status?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [tenantId, customerId, limit, offset];
    let whereExtra = '';
    if (status) {
      params.push(status);
      whereExtra = ` AND inv.status = $${params.length}`;
    }

    const rows = await this.queryMany<any>(
      `SELECT inv.id, inv.invoice_no, inv.status, inv.invoice_date, inv.due_date,
              inv.total_amount, inv.currency, inv.notes,
              so.order_no
       FROM invoices inv
       LEFT JOIN sales_orders so ON so.id = inv.sales_order_id
       WHERE inv.tenant_id = $1 AND inv.customer_id = $2${whereExtra}
       ORDER BY inv.invoice_date DESC
       LIMIT $3 OFFSET $4`,
      params,
    );

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM invoices WHERE tenant_id = $1 AND customer_id = $2${status ? ` AND status = $3` : ''}`,
      status ? [tenantId, customerId, status] : [tenantId, customerId],
    );
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findInvoiceById(tenantId: string, customerId: string, invoiceId: string) {
    return this.queryOne<any>(
      `SELECT inv.*, so.order_no, c.name as customer_name
       FROM invoices inv
       LEFT JOIN sales_orders so ON so.id = inv.sales_order_id
       JOIN customers c ON c.id = inv.customer_id
       WHERE inv.id = $1 AND inv.tenant_id = $2 AND inv.customer_id = $3`,
      [invoiceId, tenantId, customerId],
    );
  }

  // Deliveries
  async findDeliveries(tenantId: string, customerId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const rows = await this.queryMany<any>(
      `SELECT ds.id, ds.sequence, ds.address_line1, ds.city, ds.status,
              ds.arrived_at, ds.completed_at,
              dt.trip_no, dt.status as trip_status, dt.planned_date
       FROM dispatch_stops ds
       JOIN dispatch_trips dt ON dt.id = ds.trip_id
       WHERE ds.tenant_id = $1 AND ds.customer_id = $2
       ORDER BY dt.planned_date DESC, ds.sequence
       LIMIT $3 OFFSET $4`,
      [tenantId, customerId, limit, offset],
    );

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM dispatch_stops WHERE tenant_id = $1 AND customer_id = $2`,
      [tenantId, customerId],
    );
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findDeliveryById(tenantId: string, customerId: string, stopId: string) {
    return this.queryOne<any>(
      `SELECT ds.*, dt.trip_no, dt.status as trip_status, dt.planned_date,
              c.name as customer_name
       FROM dispatch_stops ds
       JOIN dispatch_trips dt ON dt.id = ds.trip_id
       JOIN customers c ON c.id = ds.customer_id
       WHERE ds.id = $1 AND ds.tenant_id = $2 AND ds.customer_id = $3`,
      [stopId, tenantId, customerId],
    );
  }

  async findPodForStop(tenantId: string, stopId: string) {
    return this.queryOne<any>(
      `SELECT * FROM pods WHERE tenant_id = $1 AND stop_id = $2`,
      [tenantId, stopId],
    );
  }

  // Returns
  async findReturns(tenantId: string, customerId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const rows = await this.queryMany<any>(
      `SELECT r.id, r.rma_no, r.status, r.return_type, r.reason, r.created_at,
              so.order_no
       FROM rmas r
       LEFT JOIN sales_orders so ON so.id = r.sales_order_id
       WHERE r.tenant_id = $1 AND r.customer_id = $2
       ORDER BY r.created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, customerId, limit, offset],
    );

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM rmas WHERE tenant_id = $1 AND customer_id = $2`,
      [tenantId, customerId],
    );
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findReturnById(tenantId: string, customerId: string, rmaId: string) {
    return this.queryOne<any>(
      `SELECT r.*, so.order_no, c.name as customer_name
       FROM rmas r
       LEFT JOIN sales_orders so ON so.id = r.sales_order_id
       JOIN customers c ON c.id = r.customer_id
       WHERE r.id = $1 AND r.tenant_id = $2 AND r.customer_id = $3`,
      [rmaId, tenantId, customerId],
    );
  }

  async findReturnLines(rmaId: string) {
    return this.queryMany<any>(
      `SELECT rl.*, i.sku as item_sku, i.description as item_description
       FROM rma_lines rl
       JOIN items i ON i.id = rl.item_id
       WHERE rl.rma_id = $1
       ORDER BY rl.id`,
      [rmaId],
    );
  }

  // Create RMA from portal
  async createRma(data: {
    tenantId: string;
    customerId: string;
    salesOrderId?: string;
    returnType: string;
    reason: string;
    notes?: string;
    createdBy: string;
  }) {
    // Generate RMA number
    const seqResult = await this.queryOne<{ next_no: string }>(
      `SELECT 'RMA-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(rma_no FROM 5) AS INTEGER)), 0) + 1)::text, 6, '0') as next_no
       FROM rmas WHERE tenant_id = $1`,
      [data.tenantId],
    );
    const rmaNo = seqResult?.next_no || 'RMA-000001';

    return this.queryOne<any>(
      `INSERT INTO rmas (tenant_id, customer_id, rma_no, sales_order_id, status, return_type, reason, notes, created_by)
       VALUES ($1, $2, $3, $4, 'OPEN', $5, $6, $7, $8)
       RETURNING *`,
      [data.tenantId, data.customerId, rmaNo, data.salesOrderId || null, data.returnType, data.reason, data.notes || null, data.createdBy],
    );
  }

  async createRmaLine(data: {
    rmaId: string;
    tenantId: string;
    itemId: string;
    qtyRequested: number;
  }) {
    return this.queryOne<any>(
      `INSERT INTO rma_lines (rma_id, tenant_id, item_id, qty_requested, qty_received, qty_inspected, disposition)
       VALUES ($1, $2, $3, $4, 0, 0, 'PENDING')
       RETURNING *`,
      [data.rmaId, data.tenantId, data.itemId, data.qtyRequested],
    );
  }

  // Documents for POD
  async findDocuments(tenantId: string, entityType: string, entityId: string) {
    return this.queryMany<any>(
      `SELECT * FROM documents WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
       ORDER BY created_at DESC`,
      [tenantId, entityType, entityId],
    );
  }
}
