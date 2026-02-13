import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { DriverScopeGuard } from '../../common/guards/driver-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, DriverScopeGuard)
@Controller('driver')
export class DriverController {
  constructor(private readonly service: DispatchService) {}

  private getDriverId(user: CurrentUserData, req: Request): string {
    // DriverScopeGuard sets req.driverId for driver users
    // Internal users pass driverId as userId (backwards compat)
    return (req as any).driverId || user.id;
  }

  @Get('trips')
  @RequirePermissions('driver.trips.read')
  @ApiOperation({ summary: 'Get my assigned trips' })
  async getMyTrips(
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
    @Query('status') status?: string,
  ) {
    return this.service.getDriverTrips(this.getDriverId(user, req), status);
  }

  @Get('trips/:id')
  @RequirePermissions('driver.trips.read')
  @ApiOperation({ summary: 'Get trip detail with stops' })
  async getTripDetail(@Param('id', UuidValidationPipe) tripId: string) {
    const trip = await this.service.getTripWithStops(tripId);
    return trip;
  }

  @Post('trips/:id/start')
  @RequirePermissions('driver.trips.start')
  @ApiOperation({ summary: 'Start trip' })
  async startTrip(@Param('id', UuidValidationPipe) tripId: string) {
    return this.service.startTrip(tripId);
  }

  @Post('trips/:id/complete')
  @RequirePermissions('driver.trips.complete')
  @ApiOperation({ summary: 'Complete trip' })
  async completeTrip(@Param('id', UuidValidationPipe) tripId: string) {
    return this.service.completeTrip(tripId);
  }

  @Post('stops/:id/arrive')
  @RequirePermissions('driver.stops.update')
  @ApiOperation({ summary: 'Mark arrival at stop' })
  async arriveAtStop(@Param('id', UuidValidationPipe) stopId: string) {
    return this.service.updateStopStatus(stopId, 'ARRIVED');
  }

  @Post('stops/:id/deliver')
  @RequirePermissions('driver.pod.capture')
  @ApiOperation({ summary: 'Deliver at stop with POD' })
  async deliverStop(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) stopId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      recipientName?: string;
      signatureRef?: string;
      photoRefs?: string[];
      gpsLat?: number;
      gpsLng?: number;
      notes?: string;
    },
  ) {
    return this.service.capturesPod({
      tenantId,
      stopId,
      status: 'DELIVERED',
      ...data,
      capturedBy: user.id,
    });
  }

  @Post('stops/:id/fail')
  @RequirePermissions('driver.stops.update')
  @ApiOperation({ summary: 'Mark stop as failed' })
  async failStop(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) stopId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      failureReason: string;
      notes?: string;
      photoRefs?: string[];
      gpsLat?: number;
      gpsLng?: number;
    },
  ) {
    return this.service.capturesPod({
      tenantId,
      stopId,
      status: 'FAILED',
      failureReason: data.failureReason,
      notes: data.notes,
      photoRefs: data.photoRefs,
      gpsLat: data.gpsLat,
      gpsLng: data.gpsLng,
      capturedBy: user.id,
    });
  }

  @Post('stops/:id/pod')
  @RequirePermissions('driver.pod.capture')
  @ApiOperation({ summary: 'Capture POD for stop (legacy)' })
  async capturePod(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) stopId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      status: string;
      recipientName?: string;
      signatureRef?: string;
      photoRefs?: string[];
      gpsLat?: number;
      gpsLng?: number;
      notes?: string;
      failureReason?: string;
    },
  ) {
    return this.service.capturesPod({
      tenantId,
      stopId,
      ...data,
      capturedBy: user.id,
    });
  }

  @Get('stops/:id/pod')
  @RequirePermissions('driver.trips.read')
  @ApiOperation({ summary: 'Get POD for stop' })
  async getPod(@Param('id', UuidValidationPipe) stopId: string) {
    return this.service.getPod(stopId);
  }
}
