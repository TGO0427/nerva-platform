import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'List users in tenant' })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findByTenant(tenantId, page, limit);
  }

  @Get(':id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Get user by ID' })
  async get(@Param('id', UuidValidationPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Create new user' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', UuidValidationPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/roles/:roleId')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(
    @Param('id', UuidValidationPipe) userId: string,
    @Param('roleId', UuidValidationPipe) roleId: string,
  ) {
    await this.usersService.assignRole(userId, roleId);
    return { success: true };
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Remove role from user' })
  async removeRole(
    @Param('id', UuidValidationPipe) userId: string,
    @Param('roleId', UuidValidationPipe) roleId: string,
  ) {
    await this.usersService.removeRole(userId, roleId);
    return { success: true };
  }

  @Get(':id/roles')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Get user roles' })
  async getRoles(@Param('id', UuidValidationPipe) userId: string) {
    return this.usersService.getUserRoles(userId);
  }

  @Get(':id/sites')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Get sites assigned to user' })
  async getSites(@Param('id', UuidValidationPipe) userId: string) {
    return this.usersService.getUserSites(userId);
  }

  @Post(':id/sites/:siteId')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Assign site to user' })
  async assignSite(
    @Param('id', UuidValidationPipe) userId: string,
    @Param('siteId', UuidValidationPipe) siteId: string,
  ) {
    await this.usersService.assignSite(userId, siteId);
    return { success: true };
  }

  @Delete(':id/sites/:siteId')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Remove site from user' })
  async removeSite(
    @Param('id', UuidValidationPipe) userId: string,
    @Param('siteId', UuidValidationPipe) siteId: string,
  ) {
    await this.usersService.removeSite(userId, siteId);
    return { success: true };
  }

  @Get(':id/warehouses')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Get warehouses assigned to user' })
  async getWarehouses(@Param('id', UuidValidationPipe) userId: string) {
    return this.usersService.getUserWarehouses(userId);
  }

  @Post(':id/warehouses/:warehouseId')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Assign warehouse to user' })
  async assignWarehouse(
    @Param('id', UuidValidationPipe) userId: string,
    @Param('warehouseId', UuidValidationPipe) warehouseId: string,
  ) {
    await this.usersService.assignWarehouse(userId, warehouseId);
    return { success: true };
  }

  @Delete(':id/warehouses/:warehouseId')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Remove warehouse from user' })
  async removeWarehouse(
    @Param('id', UuidValidationPipe) userId: string,
    @Param('warehouseId', UuidValidationPipe) warehouseId: string,
  ) {
    await this.usersService.removeWarehouse(userId, warehouseId);
    return { success: true };
  }
}
