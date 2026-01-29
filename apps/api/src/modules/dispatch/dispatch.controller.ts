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
      warehouseId: string;
      vehicleId?: string;
      driverId?: string;
      plannedDate?: Date;
      plannedStart?: Date;
      notes?: string;
    },
  ) {
    return this.service.createTrip({
      tenantId,
      siteId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get('trips/:id')
  @RequirePermissions('dispatch.plan')
  @ApiOperation({ summary: 'Get trip with stops' })
  async getTrip(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getTripWithStops(id);
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

  @Post('trips/:id/assign-driver')
  @RequirePermissions('dispatch.assign')
  @ApiOperation({ summary: 'Assign driver to trip' })
  async assignDriver(
    @Param('id', UuidValidationPipe) tripId: string,
    @Body() data: { driverId: string; vehicleId?: string },
  ) {
    return this.service.assignDriver(tripId, data.driverId, data.vehicleId);
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
}
