import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './masterdata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: MasterDataService) {}

  @Get('sales')
  @RequirePermissions('salesOrder.read')
  @ApiOperation({ summary: 'Get sales report' })
  async getSalesReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.service.getSalesReport(tenantId, start, end);
  }

  @Get('inventory')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get inventory report' })
  async getInventoryReport(@TenantId() tenantId: string) {
    return this.service.getInventoryReport(tenantId);
  }

  @Get('procurement')
  @RequirePermissions('purchaseOrder.read')
  @ApiOperation({ summary: 'Get procurement report' })
  async getProcurementReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Default to last 90 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

    return this.service.getProcurementReport(tenantId, start, end);
  }
}
