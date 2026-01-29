import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DispatchRepository, DispatchTrip, DispatchStop, Pod } from './dispatch.repository';

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

  async completeTrip(tripId: string): Promise<DispatchTrip> {
    const trip = await this.getTrip(tripId);
    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Trip must be in progress to complete');
    }
    const updated = await this.repository.updateTripStatus(tripId, 'COMPLETE');
    return updated!;
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
