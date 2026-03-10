import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { TenantsService } from "./tenants.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { TenantId } from "../../common/decorators/tenant.decorator";
import { UuidValidationPipe } from "../../common/pipes/uuid-validation.pipe";
import { RegisterTenantDto } from "./dto/register-tenant.dto";

@ApiTags("tenants")
@Controller()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ─── Public registration endpoint ────────────────────────────────
  @Post("tenants/register")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { ttl: 3600000, limit: 3 } })
  @ApiOperation({ summary: "Self-serve tenant registration (public)" })
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.tenantsService.registerTenant(dto);
  }

  // ─── Admin-only endpoints ────────────────────────────────────────
  @Get("admin/tenants")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("system.admin")
  @ApiOperation({ summary: "List all tenants (system admin only)" })
  async listTenants() {
    return this.tenantsService.listTenants();
  }

  @Get("admin/tenants/stats")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("system.admin")
  @ApiOperation({ summary: "List all tenants with stats (system admin only)" })
  async listTenantsWithStats() {
    return this.tenantsService.getTenantsWithStats();
  }

  @Post("admin/tenants")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("system.admin")
  @ApiOperation({ summary: "Create new tenant" })
  async createTenant(@Body() data: { name: string; code?: string }) {
    return this.tenantsService.createTenant(data);
  }

  @Get("admin/tenants/:id/stats")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("system.admin")
  @ApiOperation({ summary: "Get detailed stats for a tenant" })
  async getTenantStats(@Param("id", UuidValidationPipe) id: string) {
    return this.tenantsService.getTenantStats(id);
  }

  @Get("admin/tenants/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("system.admin")
  @ApiOperation({ summary: "Get tenant by ID" })
  async getTenant(@Param("id", UuidValidationPipe) id: string) {
    return this.tenantsService.findTenantById(id);
  }

  @Patch("admin/tenants/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("system.admin")
  @ApiOperation({ summary: "Update tenant" })
  async updateTenant(
    @Param("id", UuidValidationPipe) id: string,
    @Body() data: { name?: string; code?: string; isActive?: boolean },
  ) {
    return this.tenantsService.updateTenant(id, data);
  }

  @Get("admin/sites")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("site.manage")
  @ApiOperation({ summary: "List sites in tenant" })
  async listSites(@TenantId() tenantId: string) {
    return this.tenantsService.findSitesByTenant(tenantId);
  }

  @Post("admin/sites")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("site.manage")
  @ApiOperation({ summary: "Create new site" })
  async createSite(
    @TenantId() tenantId: string,
    @Body() data: { name: string; code?: string },
  ) {
    return this.tenantsService.createSite({ tenantId, ...data });
  }

  @Get("admin/sites/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("site.manage")
  @ApiOperation({ summary: "Get site by ID" })
  async getSite(@Param("id", UuidValidationPipe) id: string) {
    return this.tenantsService.findSiteById(id);
  }

  @Patch("admin/sites/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("site.manage")
  @ApiOperation({ summary: "Update site" })
  async updateSite(
    @Param("id", UuidValidationPipe) id: string,
    @Body() data: { name?: string; code?: string; isActive?: boolean },
  ) {
    return this.tenantsService.updateSite(id, data);
  }
}
