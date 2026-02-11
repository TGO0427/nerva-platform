import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DispatchRepository, DispatchTrip, DispatchStop, Pod } from './dispatch.repository';

interface ShipmentInfo {
  id: string;
  warehouseId: string;
  customerId: string | null;
  customerName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
}

@Injectable()
export class DispatchService {
  constructor(private readonly repository: DispatchRepository) {}

  // Trip management
  async createTrip(data: {
    tenantId: string;
    siteId: string;
    warehouseId: string;
    vehicleId?: string;
    driverId?: string;
    plannedDate?: Date;
    plannedStart?: Date;
    notes?: string;
    createdBy?: string;
  }): Promise<DispatchTrip> {
    const tripNo = await this.repository.generateTripNo(data.tenantId);
    return this.repository.createTrip({ ...data, tripNo });
  }

  async createTripFromShipments(data: {
    tenantId: string;
    siteId: string;
    warehouseId?: string;
    vehicleId?: string;
    driverId?: string;
    plannedDate?: Date;
    plannedStart?: Date;
    notes?: string;
    shipmentIds: string[];
    createdBy?: string;
  }): Promise<DispatchTrip> {
    // Validate shipmentIds
    if (!data.shipmentIds || data.shipmentIds.length === 0) {
      throw new BadRequestException('At least one shipment ID is required to create a trip');
    }

    // If shipmentIds provided, get warehouse and customer info from shipments
    let warehouseId = data.warehouseId;
    let shipments: ShipmentInfo[] = [];

    try {
      shipments = await this.repository.getShipmentInfoForTrip(data.shipmentIds);
    } catch (error) {
      console.error('Failed to fetch shipment info:', error);
      throw new BadRequestException(
        `Failed to fetch shipment information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (shipments.length === 0) {
      throw new BadRequestException(
        `No valid shipments found for IDs: ${data.shipmentIds.slice(0, 3).join(', ')}${data.shipmentIds.length > 3 ? '...' : ''}`
      );
    }

    if (shipments.length !== data.shipmentIds.length) {
      console.warn(
        `Shipment count mismatch: requested ${data.shipmentIds.length}, found ${shipments.length}`
      );
    }

    // Use warehouse from first shipment if not provided
    if (!warehouseId) {
      warehouseId = shipments[0].warehouseId;
    }

    if (!warehouseId) {
      throw new BadRequestException(
        'Unable to determine warehouse. Please ensure shipments have a valid warehouse assigned.'
      );
    }

    // Create the trip
    let tripNo: string;
    let trip: DispatchTrip;

    try {
      tripNo = await this.repository.generateTripNo(data.tenantId);
    } catch (error) {
      console.error('Failed to generate trip number:', error);
      throw new BadRequestException('Failed to generate trip number. Please try again.');
    }

    try {
      trip = await this.repository.createTrip({
        tenantId: data.tenantId,
        siteId: data.siteId,
        warehouseId,
        tripNo,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        plannedDate: data.plannedDate,
        plannedStart: data.plannedStart,
        notes: data.notes,
        createdBy: data.createdBy,
      });
    } catch (error) {
      console.error('Failed to create trip:', error);
      throw new BadRequestException(
        `Failed to create trip: ${error instanceof Error ? error.message : 'Database error'}`
      );
    }

    // Create stops from shipments
    let stopsCreated = 0;
    for (let i = 0; i < shipments.length; i++) {
      const shipment = shipments[i];
      try {
        await this.repository.addStopFromShipment({
          tenantId: data.tenantId,
          tripId: trip.id,
          sequence: i + 1,
          shipmentId: shipment.id,
          customerId: shipment.customerId || undefined,
          addressLine1: shipment.addressLine1 || 'Address not provided',
          city: shipment.city || undefined,
        });
        stopsCreated++;
      } catch (error) {
        console.error(`Failed to create stop for shipment ${shipment.id}:`, error);
        // Continue creating other stops even if one fails
      }
    }

    if (stopsCreated === 0) {
      console.error(`Trip ${tripNo} created but no stops were added`);
      throw new BadRequestException(
        'Trip was created but failed to add delivery stops. Please check shipment data.'
      );
    }

    // Update trip total stops
    try {
      await this.repository.updateTripStopCount(trip.id, stopsCreated);
    } catch (error) {
      console.error('Failed to update trip stop count:', error);
      // Non-critical error, continue
    }

    console.log(`Trip ${tripNo} created successfully with ${stopsCreated} stops`);
    return this.getTrip(trip.id);
  }

  async getTrip(id: string): Promise<DispatchTrip> {
    const trip = await this.repository.findTripById(id);
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async getTripWithStops(id: string): Promise<{ trip: DispatchTrip; stops: DispatchStop[] }> {
    const trip = await this.getTrip(id);
    const stops = await this.repository.findStopsByTrip(id);
    return { trip, stops };
  }

  async listTrips(
    tenantId: string,
    filters: { status?: string; driverId?: string; date?: Date },
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;
    const trips = await this.repository.findTripsByTenant(tenantId, filters, limit, offset);
    return { data: trips, meta: { page, limit } };
  }

  async assignDriver(tripId: string, driverId: string, vehicleId?: string): Promise<DispatchTrip> {
    const trip = await this.repository.assignDriver(tripId, driverId, vehicleId);
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async assignTrip(tripId: string, data: {
    vehicleId?: string;
    driverId?: string;
    vehiclePlate?: string;
    driverName?: string;
  }): Promise<DispatchTrip> {
    const trip = await this.repository.assignTripManual(tripId, data);
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async addStop(data: {
    tenantId: string;
    tripId: string;
    customerId?: string;
    addressLine1: string;
    city?: string;
    gpsLat?: number;
    gpsLng?: number;
    notes?: string;
  }): Promise<DispatchStop> {
    const stops = await this.repository.findStopsByTrip(data.tripId);
    const sequence = stops.length + 1;
    return this.repository.addStop({ ...data, sequence });
  }

  async resequenceStops(tripId: string, stopIds: string[]): Promise<DispatchStop[]> {
    // Update sequence for each stop
    for (let i = 0; i < stopIds.length; i++) {
      await this.repository.updateStopStatus(stopIds[i], 'PENDING');
      // In a real impl, you'd update the sequence column
    }
    return this.repository.findStopsByTrip(tripId);
  }

  // Driver operations
  async getDriverTrips(driverId: string, status?: string): Promise<DispatchTrip[]> {
    return this.repository.findDriverTrips(driverId, status);
  }

  async startTrip(tripId: string): Promise<DispatchTrip> {
    const trip = await this.getTrip(tripId);
    if (trip.status !== 'ASSIGNED') {
      throw new BadRequestException('Trip must be assigned before starting');
    }
    const updated = await this.repository.updateTripStatus(tripId, 'IN_PROGRESS');
    return updated!;
  }

  async completeTrip(tripId: string, forceComplete = false): Promise<DispatchTrip> {
    const trip = await this.getTrip(tripId);
    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Trip must be in progress to complete');
    }

    // Check for pending stops
    const stops = await this.repository.findStopsByTrip(tripId);
    const pendingStops = stops.filter(s => ['PENDING', 'EN_ROUTE', 'ARRIVED'].includes(s.status));

    if (pendingStops.length > 0 && !forceComplete) {
      throw new BadRequestException(
        `Cannot complete trip with ${pendingStops.length} undelivered stop(s). ` +
        `Mark all stops as delivered/failed/skipped first, or use force complete.`
      );
    }

    // If force completing, mark all pending stops as SKIPPED
    if (pendingStops.length > 0 && forceComplete) {
      for (const stop of pendingStops) {
        await this.repository.updateStopStatus(stop.id, 'SKIPPED');
      }
      console.log(`Force completed trip ${trip.tripNo}: ${pendingStops.length} stops auto-skipped`);
    }

    const updated = await this.repository.updateTripStatus(tripId, 'COMPLETE');
    return updated!;
  }

  async cancelTrip(tripId: string, reason: string): Promise<DispatchTrip> {
    const trip = await this.getTrip(tripId);
    if (['COMPLETE', 'CANCELLED'].includes(trip.status)) {
      throw new BadRequestException('Cannot cancel a completed or already cancelled trip');
    }
    const updated = await this.repository.cancelTrip(tripId, reason);
    return updated!;
  }

  async listVehicles(tenantId: string) {
    return this.repository.findVehicles(tenantId);
  }

  async listDrivers(tenantId: string) {
    return this.repository.findDrivers(tenantId);
  }

  // POD capture
  async capturesPod(data: {
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
    const stop = await this.repository.findStopById(data.stopId);
    if (!stop) throw new NotFoundException('Stop not found');

    // Create POD record
    const pod = await this.repository.createPod(data);

    // Update stop status
    await this.repository.updateStopStatus(data.stopId, data.status);

    return pod;
  }

  async getPod(stopId: string): Promise<Pod | null> {
    return this.repository.findPodByStop(stopId);
  }
}
