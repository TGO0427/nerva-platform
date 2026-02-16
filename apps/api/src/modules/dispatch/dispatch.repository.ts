import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/db/base.repository';

export interface DispatchTrip {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  tripNo: string;
  status: string;
  vehicleId: string | null;
  driverId: string | null;
  driverName: string | null;
  vehiclePlate: string | null;
  plannedDate: Date | null;
  plannedStart: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  totalWeightKg: number;
  totalCbm: number;
  totalStops: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DispatchStop {
  id: string;
  tenantId: string;
  tripId: string;
  sequence: number;
  customerId: string | null;
  customerName: string | null;
  shipmentId: string | null;
  shipmentNo: string | null;
  addressLine1: string;
  city: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  status: string;
  notes: string | null;
  failureReason: string | null;
  eta: Date | null;
  arrivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface Pod {
  id: string;
  tenantId: string;
  stopId: string;
  status: string;
  recipientName: string | null;
  signatureRef: string | null;
  photoRefs: string[];
  gpsLat: number | null;
  gpsLng: number | null;
  notes: string | null;
  failureReason: string | null;
  capturedBy: string | null;
  capturedAt: Date;
  syncedAt: Date | null;
}

@Injectable()
export class DispatchRepository extends BaseRepository {
  // Trips
  async createTrip(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    tripNo: string;
    vehicleId?: string;
    driverId?: string;
    plannedDate?: Date;
    plannedStart?: Date;
    notes?: string;
    createdBy?: string;
  }): Promise<DispatchTrip> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO dispatch_trips (
        tenant_id, site_id, warehouse_id, trip_no, vehicle_id, driver_id,
        planned_date, planned_start, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        data.tenantId,
        data.siteId,
        data.warehouseId,
        data.tripNo,
        data.vehicleId || null,
        data.driverId || null,
        data.plannedDate || null,
        data.plannedStart || null,
        data.notes || null,
        data.createdBy || null,
      ],
    );
    return this.mapTrip(row!);
  }

  async findTripById(id: string): Promise<DispatchTrip | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM dispatch_trips WHERE id = $1',
      [id],
    );
    return row ? this.mapTrip(row) : null;
  }

  async findTripsByTenant(
    tenantId: string,
    filters: { status?: string; driverId?: string; date?: Date },
    limit = 50,
    offset = 0,
  ): Promise<DispatchTrip[]> {
    let sql = 'SELECT * FROM dispatch_trips WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.driverId) {
      sql += ` AND driver_id = $${idx++}`;
      params.push(filters.driverId);
    }
    if (filters.date) {
      sql += ` AND planned_date = $${idx++}`;
      params.push(filters.date);
    }

    sql += ` ORDER BY planned_date DESC, created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(limit, offset);

    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapTrip);
  }

  async countTripsByTenant(
    tenantId: string,
    filters: { status?: string; driverId?: string; date?: Date },
  ): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM dispatch_trips WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.status) {
      sql += ` AND status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.driverId) {
      sql += ` AND driver_id = $${idx++}`;
      params.push(filters.driverId);
    }
    if (filters.date) {
      sql += ` AND planned_date = $${idx++}`;
      params.push(filters.date);
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  async findDriverByUserId(userId: string): Promise<{ id: string; name: string; tenantId: string } | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT id, name, tenant_id FROM drivers WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId],
    );
    return row ? { id: row.id as string, name: row.name as string, tenantId: row.tenant_id as string } : null;
  }

  async findDriverTrips(driverId: string, status?: string): Promise<DispatchTrip[]> {
    let sql = 'SELECT * FROM dispatch_trips WHERE driver_id = $1';
    const params: unknown[] = [driverId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY planned_date, planned_start';
    const rows = await this.queryMany<Record<string, unknown>>(sql, params);
    return rows.map(this.mapTrip);
  }

  async updateTripStatus(id: string, status: string): Promise<DispatchTrip | null> {
    let sql = 'UPDATE dispatch_trips SET status = $1';
    const params: unknown[] = [status];

    if (status === 'IN_PROGRESS') {
      sql += ', actual_start = NOW()';
    } else if (status === 'COMPLETE') {
      sql += ', actual_end = NOW()';
    }

    sql += ' WHERE id = $2 RETURNING *';
    params.push(id);

    const row = await this.queryOne<Record<string, unknown>>(sql, params);
    return row ? this.mapTrip(row) : null;
  }

  async assignDriver(tripId: string, driverId: string, vehicleId?: string): Promise<DispatchTrip | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE dispatch_trips SET driver_id = $1, vehicle_id = $2, status = 'ASSIGNED'
       WHERE id = $3 RETURNING *`,
      [driverId, vehicleId || null, tripId],
    );
    return row ? this.mapTrip(row) : null;
  }

  async assignTripManual(tripId: string, data: {
    vehicleId?: string;
    driverId?: string;
    vehiclePlate?: string;
    driverName?: string;
  }): Promise<DispatchTrip | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE dispatch_trips
       SET driver_id = $1, vehicle_id = $2, driver_name = $3, vehicle_plate = $4, status = 'ASSIGNED'
       WHERE id = $5 RETURNING *`,
      [
        data.driverId || null,
        data.vehicleId || null,
        data.driverName || null,
        data.vehiclePlate || null,
        tripId,
      ],
    );
    return row ? this.mapTrip(row) : null;
  }

  async cancelTrip(tripId: string, reason: string): Promise<DispatchTrip | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE dispatch_trips SET status = 'CANCELLED', notes = COALESCE(notes || ' | ', '') || $1
       WHERE id = $2 RETURNING *`,
      [`Cancelled: ${reason}`, tripId],
    );
    return row ? this.mapTrip(row) : null;
  }

  async findVehicles(tenantId: string) {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT * FROM vehicles WHERE tenant_id = $1 AND is_active = true ORDER BY plate_no`,
      [tenantId],
    );
    return rows.map((r) => ({
      id: r.id as string,
      tenantId: r.tenant_id as string,
      plateNo: r.plate_no as string,
      type: r.type as string,
      capacityKg: parseFloat(r.capacity_kg as string) || 0,
      capacityCbm: parseFloat(r.capacity_cbm as string) || 0,
      isActive: r.is_active as boolean,
    }));
  }

  async findDrivers(tenantId: string) {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT d.*, u.display_name as name
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.tenant_id = $1 AND d.is_active = true
       ORDER BY u.display_name`,
      [tenantId],
    );
    return rows.map((r) => ({
      id: r.id as string,
      tenantId: r.tenant_id as string,
      userId: r.user_id as string,
      name: r.name as string,
      licenseNo: r.license_no as string,
      phone: r.phone as string | null,
      isActive: r.is_active as boolean,
    }));
  }

  // Stops
  async addStop(data: {
    tenantId: string;
    tripId: string;
    sequence: number;
    customerId?: string;
    addressLine1: string;
    city?: string;
    gpsLat?: number;
    gpsLng?: number;
    notes?: string;
  }): Promise<DispatchStop> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO dispatch_stops (
        tenant_id, trip_id, sequence, customer_id, address_line1, city, gps_lat, gps_lng, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.tenantId,
        data.tripId,
        data.sequence,
        data.customerId || null,
        data.addressLine1,
        data.city || null,
        data.gpsLat || null,
        data.gpsLng || null,
        data.notes || null,
      ],
    );
    return this.mapStop(row!);
  }

  async findStopById(id: string): Promise<DispatchStop | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM dispatch_stops WHERE id = $1',
      [id],
    );
    return row ? this.mapStop(row) : null;
  }

  async findStopsByTrip(tripId: string): Promise<DispatchStop[]> {
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT ds.*, c.name as customer_name,
              s.shipment_no, ml.shipment_id
       FROM dispatch_stops ds
       LEFT JOIN customers c ON ds.customer_id = c.id
       LEFT JOIN manifest_lines ml ON ml.stop_id = ds.id
       LEFT JOIN shipments s ON ml.shipment_id = s.id
       WHERE ds.trip_id = $1
       ORDER BY ds.sequence`,
      [tripId],
    );
    return rows.map(this.mapStop);
  }

  async updateStopStatus(id: string, status: string): Promise<DispatchStop | null> {
    let sql = 'UPDATE dispatch_stops SET status = $1';
    const params: unknown[] = [status];

    if (status === 'ARRIVED') {
      sql += ', arrived_at = NOW()';
    } else if (['DELIVERED', 'FAILED', 'PARTIAL', 'SKIPPED'].includes(status)) {
      sql += ', completed_at = NOW()';
    }

    sql += ' WHERE id = $2 RETURNING *';
    params.push(id);

    const row = await this.queryOne<Record<string, unknown>>(sql, params);
    return row ? this.mapStop(row) : null;
  }

  // POD
  async createPod(data: {
    tenantId: string;
    stopId: string;
    status: string;
    recipientName?: string;
    signatureRef?: string;
    photoRefs?: string[];
    gpsLat?: number;
    gpsLng?: number;
    notes?: string;
    failureReason?: string;
    capturedBy?: string;
  }): Promise<Pod> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO pods (
        tenant_id, stop_id, status, recipient_name, signature_ref, photo_refs,
        gps_lat, gps_lng, notes, failure_reason, captured_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.tenantId,
        data.stopId,
        data.status,
        data.recipientName || null,
        data.signatureRef || null,
        JSON.stringify(data.photoRefs || []),
        data.gpsLat || null,
        data.gpsLng || null,
        data.notes || null,
        data.failureReason || null,
        data.capturedBy || null,
      ],
    );
    return this.mapPod(row!);
  }

  async findPodByStop(stopId: string): Promise<Pod | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      'SELECT * FROM pods WHERE stop_id = $1 ORDER BY captured_at DESC LIMIT 1',
      [stopId],
    );
    return row ? this.mapPod(row) : null;
  }

  async generateTripNo(tenantId: string): Promise<string> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM dispatch_trips WHERE tenant_id = $1',
      [tenantId],
    );
    const count = parseInt(result?.count || '0', 10) + 1;
    return `TRIP-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;
  }

  async getShipmentInfoForTrip(shipmentIds: string[]): Promise<{
    id: string;
    warehouseId: string;
    customerId: string | null;
    customerName?: string;
    addressLine1?: string;
    city?: string;
  }[]> {
    if (shipmentIds.length === 0) return [];

    const placeholders = shipmentIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await this.queryMany<Record<string, unknown>>(
      `SELECT s.id, s.warehouse_id, so.customer_id, c.name as customer_name,
              c.shipping_address_line1 as address_line1, c.shipping_city as city
       FROM shipments s
       JOIN sales_orders so ON s.sales_order_id = so.id
       LEFT JOIN customers c ON so.customer_id = c.id
       WHERE s.id IN (${placeholders})`,
      shipmentIds,
    );

    return rows.map((r) => ({
      id: r.id as string,
      warehouseId: r.warehouse_id as string,
      customerId: r.customer_id as string | null,
      customerName: r.customer_name as string | undefined,
      addressLine1: r.address_line1 as string | undefined,
      city: r.city as string | undefined,
    }));
  }

  async addStopFromShipment(data: {
    tenantId: string;
    tripId: string;
    sequence: number;
    shipmentId: string;
    customerId?: string;
    addressLine1: string;
    city?: string;
  }): Promise<DispatchStop> {
    // Create the stop
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO dispatch_stops (
        tenant_id, trip_id, sequence, customer_id, address_line1, city
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.tenantId,
        data.tripId,
        data.sequence,
        data.customerId || null,
        data.addressLine1,
        data.city || null,
      ],
    );
    const stop = this.mapStop(row!);

    // Link shipment to stop via manifest_lines
    await this.query(
      `INSERT INTO manifest_lines (tenant_id, stop_id, shipment_id)
       VALUES ($1, $2, $3)`,
      [data.tenantId, stop.id, data.shipmentId],
    );

    return stop;
  }

  async updateTripStopCount(tripId: string, count: number): Promise<void> {
    await this.query(
      'UPDATE dispatch_trips SET total_stops = $1 WHERE id = $2',
      [count, tripId],
    );
  }

  async updateTripCompletedStops(tripId: string, count: number): Promise<void> {
    await this.query(
      'UPDATE dispatch_trips SET completed_stops = $1 WHERE id = $2',
      [count, tripId],
    );
  }

  async updateStopWithFailure(
    stopId: string,
    reason: string,
    status = 'FAILED',
  ): Promise<DispatchStop | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE dispatch_stops
       SET status = $1, failure_reason = $2, completed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, reason, stopId],
    );
    return row ? this.mapStop(row) : null;
  }

  private mapTrip(row: Record<string, unknown>): DispatchTrip {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      siteId: row.site_id as string,
      warehouseId: row.warehouse_id as string,
      tripNo: row.trip_no as string,
      status: row.status as string,
      vehicleId: row.vehicle_id as string | null,
      driverId: row.driver_id as string | null,
      driverName: row.driver_name as string | null,
      vehiclePlate: row.vehicle_plate as string | null,
      plannedDate: row.planned_date as Date | null,
      plannedStart: row.planned_start as Date | null,
      actualStart: row.actual_start as Date | null,
      actualEnd: row.actual_end as Date | null,
      totalWeightKg: parseFloat(row.total_weight_kg as string) || 0,
      totalCbm: parseFloat(row.total_cbm as string) || 0,
      totalStops: (row.total_stops as number) || 0,
      notes: row.notes as string | null,
      createdBy: row.created_by as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private mapStop(row: Record<string, unknown>): DispatchStop {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      tripId: row.trip_id as string,
      sequence: row.sequence as number,
      customerId: row.customer_id as string | null,
      customerName: row.customer_name as string | null,
      shipmentId: row.shipment_id as string | null,
      shipmentNo: row.shipment_no as string | null,
      addressLine1: row.address_line1 as string,
      city: row.city as string | null,
      gpsLat: row.gps_lat ? parseFloat(row.gps_lat as string) : null,
      gpsLng: row.gps_lng ? parseFloat(row.gps_lng as string) : null,
      status: row.status as string,
      notes: row.notes as string | null,
      failureReason: row.failure_reason as string | null,
      eta: row.eta as Date | null,
      arrivedAt: row.arrived_at as Date | null,
      completedAt: row.completed_at as Date | null,
      createdAt: row.created_at as Date,
    };
  }

  private mapPod(row: Record<string, unknown>): Pod {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      stopId: row.stop_id as string,
      status: row.status as string,
      recipientName: row.recipient_name as string | null,
      signatureRef: row.signature_ref as string | null,
      photoRefs: (row.photo_refs as string[]) || [],
      gpsLat: row.gps_lat ? parseFloat(row.gps_lat as string) : null,
      gpsLng: row.gps_lng ? parseFloat(row.gps_lng as string) : null,
      notes: row.notes as string | null,
      failureReason: row.failure_reason as string | null,
      capturedBy: row.captured_by as string | null,
      capturedAt: row.captured_at as Date,
      syncedAt: row.synced_at as Date | null,
    };
  }
}
