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
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('inventory/adjustments')
export class AdjustmentsController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'List adjustments' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listAdjustments(tenantId, status, page, limit);
  }

  @Get(':id')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Get adjustment by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getAdjustment(id);
  }

  @Post()
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Create adjustment' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      warehouseId: string;
      reason: string;
      notes?: string;
      cycleCountId?: string;
    },
  ) {
    return this.service.createAdjustment({
      tenantId,
      ...data,
      createdBy: user.id,
    });
  }

  @Post(':id/approve')
  @RequirePermissions('inventory.adjust.approve')
  @ApiOperation({ summary: 'Approve adjustment' })
  async approve(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.approveAdjustment(id, user.id);
  }
}
