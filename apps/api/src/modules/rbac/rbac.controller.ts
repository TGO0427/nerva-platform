import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('rbac')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('admin')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'List roles in tenant' })
  async listRoles(@TenantId() tenantId: string) {
    return this.rbacService.findRolesByTenant(tenantId);
  }

  @Post('roles')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Create new role' })
  async createRole(
    @TenantId() tenantId: string,
    @Body()
    data: {
      name: string;
      description?: string;
      permissionIds?: string[];
    },
  ) {
    return this.rbacService.createRole({ tenantId, ...data });
  }

  @Get('roles/:id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Get role by ID' })
  async getRole(@Param('id', UuidValidationPipe) id: string) {
    return this.rbacService.findRoleById(id);
  }

  @Patch('roles/:id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Update role' })
  async updateRole(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: { name?: string; description?: string },
  ) {
    return this.rbacService.updateRole(id, data);
  }

  @Delete('roles/:id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Delete role' })
  async deleteRole(@Param('id', UuidValidationPipe) id: string) {
    await this.rbacService.deleteRole(id);
    return { success: true };
  }

  @Get('permissions')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'List all available permissions' })
  async listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Get('roles/:id/permissions')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Get permissions for a role' })
  async getRolePermissions(@Param('id', UuidValidationPipe) roleId: string) {
    return this.rbacService.getRolePermissions(roleId);
  }

  @Post('roles/:id/permissions')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Set permissions for a role' })
  async setRolePermissions(
    @Param('id', UuidValidationPipe) roleId: string,
    @Body() data: { permissionIds: string[] },
  ) {
    await this.rbacService.setRolePermissions(roleId, data.permissionIds);
    return { success: true };
  }
}
