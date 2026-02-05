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
@Controller('inventory/putaway')
export class PutawayController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions('putaway.execute')
  @ApiOperation({ summary: 'List putaway tasks' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    return this.service.listPutawayTasks(
      tenantId,
      { status, warehouseId, assignedTo },
      parseInt(page || '1', 10),
      parseInt(limit || '25', 10),
    );
  }

  @Get(':id')
  @RequirePermissions('putaway.execute')
  @ApiOperation({ summary: 'Get putaway task' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getPutawayTask(id);
  }

  @Post(':id/assign')
  @RequirePermissions('putaway.execute')
  @ApiOperation({ summary: 'Assign putaway task' })
  async assign(
    @Param('id', UuidValidationPipe) id: string,
    @Body('userId') userId: string,
  ) {
    return this.service.assignPutawayTask(id, userId);
  }

  @Post(':id/complete')
  @RequirePermissions('putaway.execute')
  @ApiOperation({ summary: 'Complete putaway task' })
  async complete(
    @Param('id', UuidValidationPipe) id: string,
    @Body('toBinId') toBinId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.completePutawayTask(id, toBinId, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('putaway.execute')
  @ApiOperation({ summary: 'Cancel putaway task' })
  async cancel(@Param('id', UuidValidationPipe) id: string) {
    return this.service.cancelPutawayTask(id);
  }
}
