import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
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
  constructor(private readonly service: DispatchService) {}

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
    return this.service.createTripFromShipments({
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
  }

  @Get('trips/:id')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Get trip by ID' })
  async getTrip(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getTrip(id);
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
    @Body() data: { vehicleId: string; driverId: string },
  ) {
    return this.service.assignDriver(tripId, data.driverId, data.vehicleId);
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
  async completeTrip(@Param('id', UuidValidationPipe) tripId: string) {
    return this.service.completeTrip(tripId);
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
