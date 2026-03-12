import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { TenantId } from "../../common/decorators/tenant.decorator";
import type { TenantPlan, BillingCycle } from "@nerva/shared";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("plans")
  @ApiOperation({ summary: "List available plans and pricing" })
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get("current")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("tenant.manage")
  @ApiOperation({ summary: "Get current tenant plan and usage" })
  async getCurrentPlan(@TenantId() tenantId: string) {
    return this.billingService.getCurrentPlan(tenantId);
  }

  @Patch("plan")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("tenant.manage")
  @ApiOperation({ summary: "Change tenant plan" })
  async changePlan(
    @TenantId() tenantId: string,
    @Body() body: { plan: TenantPlan; billingCycle: BillingCycle },
  ) {
    return this.billingService.changePlan(
      tenantId,
      body.plan,
      body.billingCycle,
    );
  }
}
