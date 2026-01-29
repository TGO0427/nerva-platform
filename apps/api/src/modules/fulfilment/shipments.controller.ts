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
import { FulfilmentService } from './fulfilment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('fulfilment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly service: FulfilmentService) {}

  @Get()
  @RequirePermissions('shipment.create')
  @ApiOperation({ summary: 'List shipments' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listShipments(tenantId, status, page, limit);
  }

  @Get(':id')
  @RequirePermissions('shipment.create')
  @ApiOperation({ summary: 'Get shipment' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getShipment(id);
  }

  @Post()
  @RequirePermissions('shipment.create')
  @ApiOperation({ summary: 'Create shipment' })
  async create(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: { warehouseId: string; salesOrderId: string },
  ) {
    return this.service.createShipment({
      tenantId,
      siteId,
      ...data,
      createdBy: user.id,
    });
  }

  @Post(':id/ready')
  @RequirePermissions('shipment.ready')
  @ApiOperation({ summary: 'Mark shipment ready for dispatch' })
  async markReady(@Param('id', UuidValidationPipe) id: string) {
    return this.service.markShipmentReady(id);
  }
}
