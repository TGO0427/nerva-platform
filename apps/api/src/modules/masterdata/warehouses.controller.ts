import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './masterdata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId, SiteId } from '../../common/decorators/tenant.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateBinDto, UpdateBinDto } from './dto';

@ApiTags('master-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('masterdata/warehouses')
export class WarehousesController {
  constructor(private readonly service: MasterDataService) {}

  @Get()
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'List warehouses' })
  async list(
    @TenantId() tenantId: string,
    @SiteId() siteId?: string,
    @Query('allSites') allSites?: string,
  ) {
    return this.service.listWarehouses(tenantId, allSites === 'true' ? undefined : siteId);
  }

  @Get(':id')
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  async get(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.service.getWarehouse(tenantId, id);
  }

  @Post()
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'Create warehouse' })
  async create(
    @TenantId() tenantId: string,
    @Body() data: CreateWarehouseDto,
  ) {
    return this.service.createWarehouse({ tenantId, ...data });
  }

  @Patch(':id')
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'Update warehouse' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateWarehouseDto,
  ) {
    return this.service.updateWarehouse(tenantId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'Delete warehouse (no references)' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    await this.service.deleteWarehouse(tenantId, id);
    return { success: true };
  }

  @Get(':id/bins')
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'List bins in warehouse' })
  async listBins(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) warehouseId: string,
  ) {
    return this.service.listBins(tenantId, warehouseId);
  }

  @Post(':id/bins')
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'Create bin in warehouse' })
  async createBin(
    @TenantId() tenantId: string,
    @Param('id', UuidValidationPipe) warehouseId: string,
    @Body() data: CreateBinDto,
  ) {
    return this.service.createBin({
      tenantId,
      warehouseId,
      code: data.code,
      binType: data.binType,
    });
  }

  @Patch('bins/:binId')
  @RequirePermissions('warehouse.manage')
  @ApiOperation({ summary: 'Update bin' })
  async updateBin(
    @TenantId() tenantId: string,
    @Param('binId', UuidValidationPipe) binId: string,
    @Body() data: UpdateBinDto,
  ) {
    return this.service.updateBin(tenantId, binId, data);
  }
}
