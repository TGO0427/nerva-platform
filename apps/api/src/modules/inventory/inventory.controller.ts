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
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('stock-on-hand')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get stock on hand for item' })
  async getStockOnHand(
    @TenantId() tenantId: string,
    @Query('itemId', UuidValidationPipe) itemId: string,
  ) {
    return this.service.getStockOnHand(tenantId, itemId);
  }

  @Get('stock-in-bin')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get stock in a bin' })
  async getStockInBin(
    @TenantId() tenantId: string,
    @Query('binId', UuidValidationPipe) binId: string,
  ) {
    return this.service.getStockInBin(tenantId, binId);
  }

  @Get('ledger')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get stock ledger history for item' })
  async getLedgerHistory(
    @TenantId() tenantId: string,
    @Query('itemId', UuidValidationPipe) itemId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getLedgerHistory(tenantId, itemId, page, limit);
  }

  @Post('transfers')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Transfer stock between bins' })
  async transferStock(
    @TenantId() tenantId: string,
    @SiteId() siteId: string,
    @CurrentUser() user: CurrentUserData,
    @Body()
    data: {
      itemId: string;
      fromBinId: string;
      toBinId: string;
      qty: number;
      batchNo?: string;
    },
  ) {
    await this.service.transferStock({
      tenantId,
      siteId,
      ...data,
      createdBy: user.id,
    });
    return { success: true };
  }
}
