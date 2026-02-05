import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IbtService } from './ibt.service';
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
@Controller('inventory/ibts')
export class IbtController {
  constructor(private readonly ibtService: IbtService) {}

  @Get()
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'List IBTs' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('fromWarehouseId') fromWarehouseId?: string,
    @Query('toWarehouseId') toWarehouseId?: string,
  ) {
    return this.ibtService.listIbts(
      tenantId,
      { status, fromWarehouseId, toWarehouseId },
      parseInt(page || '1', 10),
      parseInt(limit || '25', 10),
    );
  }

  @Post()
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Create IBT' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      fromWarehouseId: string;
      toWarehouseId: string;
      notes?: string;
    },
  ) {
    return this.ibtService.createIbt({
      tenantId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get(':id')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Get IBT by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.ibtService.getIbt(id);
  }

  @Get(':id/lines')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Get IBT lines' })
  async getLines(@Param('id', UuidValidationPipe) id: string) {
    return this.ibtService.getLines(id);
  }

  @Post(':id/lines')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Add line to IBT' })
  async addLine(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body()
    data: {
      itemId: string;
      qtyRequested: number;
      fromBinId?: string;
      batchNo?: string;
    },
  ) {
    return this.ibtService.addLine(id, { tenantId, ...data });
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Remove line from IBT' })
  async removeLine(
    @Param('id', UuidValidationPipe) id: string,
    @Param('lineId', UuidValidationPipe) lineId: string,
  ) {
    await this.ibtService.removeLine(id, lineId);
    return { success: true };
  }

  @Post(':id/submit')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Submit IBT for approval' })
  async submit(@Param('id', UuidValidationPipe) id: string) {
    return this.ibtService.submitForApproval(id);
  }

  @Post(':id/approve')
  @RequirePermissions('ibt.approve')
  @ApiOperation({ summary: 'Approve IBT' })
  async approve(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ibtService.approve(id, user.id);
  }

  @Post(':id/start-picking')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Start picking for IBT' })
  async startPicking(@Param('id', UuidValidationPipe) id: string) {
    return this.ibtService.startPicking(id);
  }

  @Post(':id/ship')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Ship IBT lines' })
  async ship(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      lines: Array<{ lineId: string; qtyShipped: number }>;
    },
  ) {
    return this.ibtService.shipLines(id, data.lines, user.id);
  }

  @Post(':id/receive')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Receive IBT lines' })
  async receive(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      lines: Array<{ lineId: string; qtyReceived: number; toBinId: string }>;
    },
  ) {
    return this.ibtService.receiveLines(id, data.lines, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('ibt.create')
  @ApiOperation({ summary: 'Cancel IBT' })
  async cancel(@Param('id', UuidValidationPipe) id: string) {
    return this.ibtService.cancel(id);
  }
}
