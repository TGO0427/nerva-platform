import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CreateItemDto, UpdateItemDto } from './dto';

@ApiTags('master-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly service: MasterDataService) {}

  @Get()
  @RequirePermissions('item.read')
  @ApiOperation({ summary: 'List items' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.listItems(tenantId, { page, limit, search });
  }

  @Get(':id')
  @RequirePermissions('item.read')
  @ApiOperation({ summary: 'Get item by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.service.getItem(id);
  }

  @Post()
  @RequirePermissions('item.write')
  @ApiOperation({ summary: 'Create item' })
  async create(
    @TenantId() tenantId: string,
    @Body() data: CreateItemDto,
  ) {
    return this.service.createItem({ tenantId, ...data });
  }

  @Patch(':id')
  @RequirePermissions('item.write')
  @ApiOperation({ summary: 'Update item' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: UpdateItemDto,
  ) {
    return this.service.updateItem(id, data);
  }
}
