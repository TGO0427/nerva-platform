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
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { CreateAdjustmentDto, AddAdjustmentLineDto } from './dto/adjustments.dto';
import { ImportAdjustmentsDto } from './dto/adjustment-import.dto';

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
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listAdjustments(tenantId, { status, search }, page, limit);
  }

  @Post('import')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Bulk import stock adjustments' })
  async importAdjustments(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() data: ImportAdjustmentsDto,
  ) {
    return this.service.importAdjustments(tenantId, siteId, user.id, data.rows);
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
    @Body() data: CreateAdjustmentDto,
  ) {
    return this.service.createAdjustment({
      tenantId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get(':id/lines')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Get adjustment lines' })
  async getLines(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getAdjustmentLines(id);
  }

  @Post(':id/lines')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Add adjustment line' })
  async addLine(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: AddAdjustmentLineDto,
  ) {
    return this.service.addAdjustmentLine(id, { tenantId, ...data });
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Remove adjustment line' })
  async removeLine(
    @Param('id', UuidValidationPipe) id: string,
    @Param('lineId', UuidValidationPipe) lineId: string,
  ) {
    await this.service.removeAdjustmentLine(id, lineId);
    return { success: true };
  }

  @Post(':id/submit')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Submit adjustment for approval' })
  async submit(@Param('id', UuidValidationPipe) id: string) {
    return this.service.submitAdjustment(id);
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

  @Post(':id/post')
  @RequirePermissions('inventory.adjust.approve')
  @ApiOperation({ summary: 'Post adjustment to stock' })
  async post(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.postAdjustment(id, user.id);
  }

  @Delete(':id')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Delete adjustment (draft only)' })
  async deleteAdjustment(@Param('id', UuidValidationPipe) id: string) {
    await this.service.deleteAdjustment(id);
    return { success: true };
  }
}
