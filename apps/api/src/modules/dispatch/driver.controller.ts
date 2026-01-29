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
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('driver')
export class DriverController {
  constructor(private readonly service: DispatchService) {}

  @Get('trips')
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Get my assigned trips' })
  async getMyTrips(
    @CurrentUser() user: CurrentUserData,
    @Query('status') status?: string,
  ) {
    // In real app, you'd look up the driver record for this user
    return this.service.getDriverTrips(user.id, status);
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

  @Post('stops/:id/pod')
  @RequirePermissions('pod.capture')
  @ApiOperation({ summary: 'Capture POD for stop' })
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
  @RequirePermissions('dispatch.execute')
  @ApiOperation({ summary: 'Get POD for stop' })
  async getPod(@Param('id', UuidValidationPipe) stopId: string) {
    return this.service.getPod(stopId);
  }
}
