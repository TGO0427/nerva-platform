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
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('receiving/grns')
export class GrnController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'List GRNs' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listGrns(tenantId, status, page, limit);
  }

  @Get(':id')
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Get GRN by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getGrn(id);
  }

  @Post()
  @RequirePermissions('grn.create')
  @ApiOperation({ summary: 'Create GRN' })
  async create(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      warehouseId: string;
      purchaseOrderId?: string;
      supplierId?: string;
      notes?: string;
    },
  ) {
    return this.service.createGrn({
      tenantId,
      siteId,
      ...data,
      createdBy: user.id,
    });
  }

  @Get(':id/lines')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Get GRN lines' })
  async getLines(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getGrnLines(id);
  }

  @Post(':id/scan')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Receive/scan item into GRN' })
  async scanItem(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) grnId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      itemId: string;
      qtyReceived: number;
      batchNo?: string;
      expiryDate?: Date;
      receivingBinId: string;
    },
  ) {
    return this.service.receiveGrnLine(grnId, {
      tenantId,
      ...data,
      createdBy: user.id,
    });
  }

  @Post(':id/complete')
  @RequirePermissions('grn.receive')
  @ApiOperation({ summary: 'Complete GRN' })
  async complete(@Param('id', UuidValidationPipe) id: string) {
    return this.service.completeGrn(id);
  }
}
