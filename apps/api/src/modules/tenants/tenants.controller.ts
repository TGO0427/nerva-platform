import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('tenants')
  @RequirePermissions('system.admin')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'List all tenants (system admin only)' })
  async listTenants() {
    return this.tenantsService.listTenants();
  }

  @Post('tenants')
  @RequirePermissions('system.admin')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Create new tenant' })
  async createTenant(@Body() data: { name: string; code?: string }) {
    return this.tenantsService.createTenant(data);
  }

  @Get('tenants/:id')
  @RequirePermissions('system.admin')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Get tenant by ID' })
  async getTenant(@Param('id', UuidValidationPipe) id: string) {
    return this.tenantsService.findTenantById(id);
  }

  @Patch('tenants/:id')
  @RequirePermissions('system.admin')
  @UseGuards(PermissionsGuard)
  @ApiOperation({ summary: 'Update tenant' })
  async updateTenant(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: { name?: string; code?: string; isActive?: boolean },
  ) {
    return this.tenantsService.updateTenant(id, data);
  }

  @Get('sites')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'List sites in tenant' })
  async listSites(@TenantId() tenantId: string) {
    return this.tenantsService.findSitesByTenant(tenantId);
  }

  @Post('sites')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'Create new site' })
  async createSite(
    @TenantId() tenantId: string,
    @Body() data: { name: string; code?: string },
  ) {
    return this.tenantsService.createSite({ tenantId, ...data });
  }

  @Get('sites/:id')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'Get site by ID' })
  async getSite(@Param('id', UuidValidationPipe) id: string) {
    return this.tenantsService.findSiteById(id);
  }

  @Patch('sites/:id')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('site.manage')
  @ApiOperation({ summary: 'Update site' })
  async updateSite(
    @Param('id', UuidValidationPipe) id: string,
    @Body() data: { name?: string; code?: string; isActive?: boolean },
  ) {
    return this.tenantsService.updateSite(id, data);
  }
}
