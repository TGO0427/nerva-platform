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
  addressLine1: string;
  city: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  status: string;
  notes: string | null;
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
      'SELECT * FROM dispatch_stops WHERE trip_id = $1 ORDER BY sequence',
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
    return `TRIP-${count.toString().padStart(6, '0')}`;
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
      addressLine1: row.address_line1 as string,
      city: row.city as string | null,
      gpsLat: row.gps_lat ? parseFloat(row.gps_lat as string) : null,
      gpsLng: row.gps_lng ? parseFloat(row.gps_lng as string) : null,
      status: row.status as string,
      notes: row.notes as string | null,
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
