import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface PickWave {
  id: string;
  tenantId: string;
  warehouseId: string;
  waveNo: string;
  status: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickTask {
  id: string;
  tenantId: string;
  pickWaveId: string;
  salesOrderId: string;
  salesOrderLineId: string;
  reservationId: string | null;
  itemId: string;
  fromBinId: string;
  qtyToPick: number;
  qtyPicked: number;
  status: string;
  shortReason: string | null;
  assignedTo: string | null;
  pickedAt: Date | null;
  batchNo: string | null;
  createdAt: Date;
}

export interface Shipment {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  salesOrderId: string;
  shipmentNo: string;
  status: string;
  totalWeightKg: number;
  totalCbm: number;
  carrier: string | null;
  trackingNo: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentLine {
  id: string;
  tenantId: string;
  shipmentId: string;
  salesOrderLineId: string;
  itemId: string;
  itemSku: string;
  itemDescription: string;
  qty: number;
  batchNo: string | null;
  createdAt: Date;
}

export interface ShippableOrder {
  id: string;
  orderNo: string;
  customerName: string;
  siteId: string;
  warehouseId: string;
  status: string;
}

@Injectable()
export class FulfilmentRepository extends BaseRepository {
  // Pick Wave
  async createPickWave(data: {
    tenantId: string;
    warehouseId: string;
    waveNo: string;
    createdBy?: string;
  }): Promise<PickWave> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO pick_waves (tenant_id, warehouse_id, wave_no, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.tenantId, data.warehouseId, data.waveNo, data.createdBy || null],
    );
    return this.mapPickWave(row!);
  }

  async findPickWaveById(id: string): Promise<PickWave | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM pick_waves WHERE id = $1',
      [id],
    );
    return row ? this.mapPickWave(row) : null;
  }

  async updatePickWaveStatus(id: string, status: string): Promise<PickWave | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'UPDATE pick_waves SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );
    return row ? this.mapPickWave(row) : null;
  }

  // Pick Tasks
  async createPickTask(data: {
    tenantId: string;
    pickWaveId: string;
    salesOrderId: string;
    salesOrderLineId: string;
    reservationId?: string;
    itemId: string;
    fromBinId: string;
    qtyToPick: number;
    batchNo?: string;
  }): Promise<PickTask> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO pick_tasks (
        tenant_id, pick_wave_id, sales_order_id, sales_order_line_id,
        reservation_id, item_id, from_bin_id, qty_to_pick, batch_no
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.tenantId,
        data.pickWaveId,
        data.salesOrderId,
        data.salesOrderLineId,
        data.reservationId || null,
        data.itemId,
        data.fromBinId,
        data.qtyToPick,
        data.batchNo || null,
      ],
    );
    return this.mapPickTask(row!);
  }

  async findPickTaskById(id: string): Promise<PickTask | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM pick_tasks WHERE id = $1',
      [id],
    );
    return row ? this.mapPickTask(row) : null;
  }

  async findPickTasksByWave(waveId: string): Promise<PickTask[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM pick_tasks WHERE pick_wave_id = $1 ORDER BY from_bin_id, item_id',
      [waveId],
    );
    return rows.map(this.mapPickTask);
  }

  async findPickTasksByAssignee(userId: string, status?: string): Promise<PickTask[]> {
    let sql = 'SELECT * FROM pick_tasks WHERE assigned_to = $1';
    const params: unknown[] = [userId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY created_at';
    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapPickTask);
  }

  async assignPickTask(taskId: string, userId: string): Promise<PickTask | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'UPDATE pick_tasks SET assigned_to = $1, status = \'IN_PROGRESS\' WHERE id = $2 RETURNING *',
      [userId, taskId],
    );
    return row ? this.mapPickTask(row) : null;
  }

  async confirmPickTask(taskId: string, qtyPicked: number, shortReason?: string): Promise<PickTask | null> {
    const status = shortReason ? 'SHORT' : 'PICKED';
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE pick_tasks SET qty_picked = $1, status = $2, short_reason = $3, picked_at = NOW()
       WHERE id = $4 RETURNING *`,
      [qtyPicked, status, shortReason || null, taskId],
    );
    return row ? this.mapPickTask(row) : null;
  }

  // Shipments
  async createShipment(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    salesOrderId: string;
    shipmentNo: string;
    createdBy?: string;
  }): Promise<Shipment> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO shipments (tenant_id, site_id, warehouse_id, sales_order_id, shipment_no, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6) RETURNING *`,
      [data.tenantId, data.siteId, data.warehouseId, data.salesOrderId, data.shipmentNo, data.createdBy || null],
    );
    return this.mapShipment(row!);
  }

  async findShipmentById(id: string): Promise<Shipment | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM shipments WHERE id = $1',
      [id],
    );
    return row ? this.mapShipment(row) : null;
  }

  async findShipmentsByTenant(tenantId: string, status?: string, limit = 50, offset = 0): Promise<Shipment[]> {
    let sql = 'SELECT * FROM shipments WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapShipment);
  }

  async updateShipmentStatus(id: string, status: string): Promise<Shipment | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'UPDATE shipments SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );
    return row ? this.mapShipment(row) : null;
  }

  async generateWaveNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM pick_waves WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `WAVE-${count.toString().padStart(6, '0')}`;
  }

  async generateShipmentNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM shipments WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `SHIP-${count.toString().padStart(6, '0')}`;
  }

  // List pick waves
  async findPickWavesByTenant(tenantId: string, status?: string, limit = 50, offset = 0): Promise<PickWave[]> {
    let sql = 'SELECT * FROM pick_waves WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map((row) => this.mapPickWave(row));
  }

  async countPickWavesByTenant(tenantId: string, status?: string): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM pick_waves WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  // Cancel pick task
  async cancelPickTask(taskId: string, reason: string): Promise<PickTask | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE pick_tasks SET status = 'CANCELLED', short_reason = $1
       WHERE id = $2 AND status NOT IN ('PICKED', 'CANCELLED') RETURNING *`,
      [reason, taskId],
    );
    return row ? this.mapPickTask(row) : null;
  }

  // Update shipment with carrier info
  async updateShipmentCarrier(
    id: string,
    carrier: string,
    trackingNo: string,
  ): Promise<Shipment | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE shipments SET carrier = $1, tracking_no = $2, status = 'SHIPPED'
       WHERE id = $3 RETURNING *`,
      [carrier, trackingNo, id],
    );
    return row ? this.mapShipment(row) : null;
  }

  // Check if all tasks in wave are complete
  async areAllTasksComplete(waveId: string): Promise<boolean> {
    const result = await this.queryOne<{ pending: string }>(
      `SELECT COUNT(*) as pending FROM pick_tasks
       WHERE pick_wave_id = $1 AND status NOT IN ('PICKED', 'SHORT', 'CANCELLED')`,
      [waveId],
    );
    return parseInt(result?.pending || '0', 10) === 0;
  }

  // Find shipments by order
  async findShipmentsByOrder(salesOrderId: string): Promise<Shipment[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      'SELECT * FROM shipments WHERE sales_order_id = $1 ORDER BY created_at DESC',
      [salesOrderId],
    );
    return rows.map((row) => this.mapShipment(row));
  }

  // Shipment Lines
  async createShipmentLine(data: {
    tenantId: string;
    shipmentId: string;
    salesOrderLineId: string;
    itemId: string;
    qty: number;
    batchNo?: string;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO shipment_lines (tenant_id, shipment_id, sales_order_line_id, item_id, qty, batch_no)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.tenantId, data.shipmentId, data.salesOrderLineId, data.itemId, data.qty, data.batchNo || null],
    );
  }

  async findShipmentLinesByShipment(shipmentId: string): Promise<ShipmentLine[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT sl.*, i.sku AS item_sku, i.description AS item_description
       FROM shipment_lines sl
       JOIN items i ON i.id = sl.item_id
       WHERE sl.shipment_id = $1
       ORDER BY sl.created_at`,
      [shipmentId],
    );
    return rows.map((row) => this.mapShipmentLine(row));
  }

  async findPickedBatchesByOrderLine(salesOrderLineId: string): Promise<Array<{ batchNo: string | null; qtyPicked: number }>> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT batch_no, SUM(qty_picked) AS qty_picked
       FROM pick_tasks
       WHERE sales_order_line_id = $1 AND status IN ('PICKED', 'SHORT')
       GROUP BY batch_no
       ORDER BY batch_no`,
      [salesOrderLineId],
    );
    return rows.map(row => ({
      batchNo: row.batch_no as string | null,
      qtyPicked: parseFloat(row.qty_picked as string),
    }));
  }

  async sumShipmentWeight(shipmentId: string): Promise<number> {
    const result = await this.queryOne<{ total_weight: string }>(
      `SELECT COALESCE(SUM(COALESCE(i.weight_kg, 0) * sl.qty), 0) AS total_weight
       FROM shipment_lines sl
       JOIN items i ON i.id = sl.item_id
       WHERE sl.shipment_id = $1`,
      [shipmentId],
    );
    return parseFloat(result?.total_weight || '0');
  }

  async updateShipmentWeight(id: string, totalWeightKg: number): Promise<void> {
    await this.execute(
      'UPDATE shipments SET total_weight_kg = $1 WHERE id = $2',
      [totalWeightKg, id],
    );
  }

  async findShippableOrders(tenantId: string): Promise<ShippableOrder[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT so.id, so.order_no, c.name AS customer_name, so.site_id, so.warehouse_id, so.status
       FROM sales_orders so
       JOIN customers c ON c.id = so.customer_id
       WHERE so.tenant_id = $1
         AND so.status IN ('PICKING', 'ALLOCATED')
         AND NOT EXISTS (
           SELECT 1 FROM shipments s WHERE s.sales_order_id = so.id
         )
       ORDER BY so.priority, so.created_at`,
      [tenantId],
    );
    return rows.map(row => ({
      id: row.id as string,
      orderNo: row.order_no as string,
      customerName: row.customer_name as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      status: row.status as string,
    }));
  }

  private mapShipmentLine(row: Record<string, unknown>): ShipmentLine {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      shipmentId: row.shipment_id as string,
      salesOrderLineId: row.sales_order_line_id as string,
      itemId: row.item_id as string,
      itemSku: (row.item_sku as string) || '',
      itemDescription: (row.item_description as string) || '',
      qty: parseFloat(row.qty as string),
      batchNo: row.batch_no as string | null,
      createdAt: row.created_at as Date,
    };
  }

  private mapPickWave(row: Record<string, unknown>): PickWave {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      warehouseId: row.warehouse_id as string,
      waveNo: row.wave_no as string,
      status: row.status as string,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapPickTask(row: Record<string, unknown>): PickTask {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      pickWaveId: row.pick_wave_id as string,
      salesOrderId: row.sales_order_id as string,
      salesOrderLineId: row.sales_order_line_id as string,
      reservationId: row.reservation_id as string | null,
      itemId: row.item_id as string,
      fromBinId: row.from_bin_id as string,
      qtyToPick: parseFloat(row.qty_to_pick as string),
      qtyPicked: parseFloat(row.qty_picked as string),
      status: row.status as string,
      shortReason: row.short_reason as string | null,
      assignedTo: row.assigned_to as string | null,
      pickedAt: row.picked_at as Date | null,
      batchNo: row.batch_no as string | null,
      createdAt: row.created_at as Date,
    };
  }

  private mapShipment(row: Record<string, unknown>): Shipment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      salesOrderId: row.sales_order_id as string,
      shipmentNo: row.shipment_no as string,
      status: row.status as string,
      totalWeightKg: parseFloat(row.total_weight_kg as string) || 0,
      totalCbm: parseFloat(row.total_cbm as string) || 0,
      carrier: row.carrier as string | null,
      trackingNo: row.tracking_no as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
