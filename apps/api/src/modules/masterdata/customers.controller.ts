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
import { CreateCustomerDto } from './dto';

@ApiTags('master-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: MasterDataService) {}

  @Get()
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'List customers' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.listCustomers(tenantId, { page, limit, search });
  }

  @Get(':id')
  @RequirePermissions('customer.read')
  @ApiOperation({ summary: 'Get customer by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getCustomer(id);
  }

  @Post()
  @RequirePermissions('customer.write')
  @ApiOperation({ summary: 'Create customer' })
  async create(
    @TenantId() tenantId: string,
    @Body() data: CreateCustomerDto,
  ) {
    return this.service.createCustomer({ tenantId, ...data });
  }
}
