import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { DispatchPdfService } from './dispatch-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly service: DispatchService,
    private readonly pdfService: DispatchPdfService,
  ) {}

  @Get('trips')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'List dispatch trips' })
  async listTrips(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('date') date?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listTrips(
      tenantId,
      { status, driverId, date: date ? new Date(date) : undefined },
      page,
      limit,
    );
  }

  @Post('trips')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Create dispatch trip' })
  async createTrip(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      warehouseId?: string;
      vehicleId?: string;
      driverId?: string;
      plannedDate?: string;
      plannedStart?: string;
      notes?: string;
      shipmentIds?: string[];
    },
  ) {
    // Log incoming request for debugging
    console.log(`Creating trip for tenant ${tenantId} with ${data.shipmentIds?.length || 0} shipments`);

    const result = await this.service.createTripFromShipments({
      tenantId,
      siteId,
      warehouseId: data.warehouseId,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      plannedDate: data.plannedDate ? new Date(data.plannedDate) : undefined,
      plannedStart: data.plannedStart ? new Date(data.plannedStart) : undefined,
      notes: data.notes,
      shipmentIds: data.shipmentIds || [],
      createdBy: user.id,
    });

    console.log(`Trip ${result.tripNo} created successfully with ID ${result.id}`);
    return result;
  }

  @Get('trips/:id')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Get trip by ID' })
  async getTrip(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getTrip(id);
  }

  @Get('trips/:id/pdf')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Download dispatch manifest PDF' })
  @ApiProduces('application/pdf')
  async downloadManifestPdf(
    @Param('id', UuidValidationPipe) id: string,
    @TenantId() tenantId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfService.generate(id, tenantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="dispatch-manifest-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    return new StreamableFile(pdfBuffer);
  }

  @Get('trips/:id/stops')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Get trip stops' })
  async getTripStops(@Param('id', UuidValidationPipe) id: string) {
    const { stops } = await this.service.getTripWithStops(id);
    return stops;
  }

  @Post('trips/:id/add-shipment')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Add stop to trip' })
  async addStop(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) tripId: string,
    @Body()
    data: {
      customerId?: string;
      addressLine1: string;
      city?: string;
      gpsLat?: number;
      gpsLng?: number;
      notes?: string;
    },
  ) {
    return this.service.addStop({ tenantId, tripId, ...data });
  }

  @Post('trips/:id/assign')
  @RequirePermissions('dispatch.assign')
  @ApiOperation({ summary: 'Assign vehicle and driver to trip' })
  async assignTrip(
    @Param('id', UuidValidationPipe) tripId: string,
    @Body() data: {
      vehicleId?: string;
      driverId?: string;
      vehiclePlate?: string;
      driverName?: string;
    },
  ) {
    return this.service.assignTrip(tripId, {
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      vehiclePlate: data.vehiclePlate,
      driverName: data.driverName,
    });
  }

  @Post('trips/:id/start')
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Start trip' })
  async startTrip(@Param('id', UuidValidationPipe) tripId: string) {
    return this.service.startTrip(tripId);
  }

  @Post('trips/:id/complete')
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Complete trip' })
  async completeTrip(
    @Param('id', UuidValidationPipe) tripId: string,
    @Body() data?: { forceComplete?: boolean },
  ) {
    return this.service.completeTrip(tripId, data?.forceComplete);
  }

  @Post('trips/:id/cancel')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Cancel trip' })
  async cancelTrip(
    @Param('id', UuidValidationPipe) tripId: string,
    @Body() data: { reason: string },
  ) {
    return this.service.cancelTrip(tripId, data.reason);
  }

  @Post('trips/:id/resequence-stops')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Resequence stops' })
  async resequenceStops(
    @Param('id', UuidValidationPipe) tripId: string,
    @Body() data: { stopIds: string[] },
  ) {
    return this.service.resequenceStops(tripId, data.stopIds);
  }

  // Stop action endpoints
  @Post('trips/:tripId/stops/:stopId/arrive')
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Mark stop as arrived' })
  async arriveAtStop(
    @Param('tripId', UuidValidationPipe) tripId: string,
    @Param('stopId', UuidValidationPipe) stopId: string,
  ) {
    return this.service.arriveAtStop(tripId, stopId);
  }

  @Post('trips/:tripId/stops/:stopId/complete')
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Complete stop with POD' })
  async completeStop(
    @TenantId() tenantId: string,
    @Param('tripId', UuidValidationPipe) tripId: string,
    @Param('stopId', UuidValidationPipe) stopId: string,
    @Body() data: {
      podSignature?: string;
      podPhoto?: string;
      podNotes?: string;
    },
  ) {
    return this.service.completeStopWithPod(tripId, stopId, tenantId, data);
  }

  @Post('trips/:tripId/stops/:stopId/fail')
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Mark stop as failed' })
  async failStop(
    @Param('tripId', UuidValidationPipe) tripId: string,
    @Param('stopId', UuidValidationPipe) stopId: string,
    @Body() data: { reason: string },
  ) {
    return this.service.failStop(tripId, stopId, data.reason);
  }

  @Post('trips/:tripId/stops/:stopId/skip')
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Skip stop' })
  async skipStop(
    @Param('tripId', UuidValidationPipe) tripId: string,
    @Param('stopId', UuidValidationPipe) stopId: string,
    @Body() data: { reason: string },
  ) {
    return this.service.skipStop(tripId, stopId, data.reason);
  }

  @Get('vehicles')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'List vehicles' })
  async listVehicles(@TenantId() tenantId: string) {
    return this.service.listVehicles(tenantId);
  }

  @Get('drivers')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'List drivers' })
  async listDrivers(@TenantId() tenantId: string) {
    return this.service.listDrivers(tenantId);
  }
}
