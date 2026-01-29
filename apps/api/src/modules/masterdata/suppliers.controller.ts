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
import { MasterDataService } from './masterdata.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { CreateSupplierDto } from './dto';

@ApiTags('master-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: MasterDataService) {}

  @Get()
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'List suppliers' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.listSuppliers(tenantId, { page, limit, search });
  }

  @Get(':id')
  @RequirePermissions('supplier.read')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getSupplier(id);
  }

  @Post()
  @RequirePermissions('supplier.write')
  @ApiOperation({ summary: 'Create supplier' })
  async create(
    @TenantId() tenantId: string,
    @Body() data: CreateSupplierDto,
  ) {
    return this.service.createSupplier({ tenantId, ...data });
  }
}
