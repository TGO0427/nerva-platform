import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Req,
  RawBodyRequest,
  UseGuards,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { BillingService } from "./billing.service";
import { PaystackService } from "./paystack.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { TenantId } from "../../common/decorators/tenant.decorator";
import type { TenantPlan, BillingCycle } from "@nerva/shared";
import type { Request } from "express";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly paystackService: PaystackService,
  ) {}

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

  @Post("checkout")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("tenant.manage")
  @ApiOperation({ summary: "Initialize PayStack checkout for plan change" })
  async initializeCheckout(
    @TenantId() tenantId: string,
    @Req() req: Request,
    @Body() body: { plan: TenantPlan; billingCycle: BillingCycle },
  ) {
    const user = req.user as { email: string };
    return this.billingService.initializeCheckout(
      tenantId,
      user.email,
      body.plan,
      body.billingCycle,
    );
  }

  @Get("verify")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("tenant.manage")
  @ApiOperation({ summary: "Verify payment and activate plan" })
  async verifyPayment(@Query("reference") reference: string) {
    if (!reference) {
      throw new BadRequestException("reference query parameter is required");
    }
    return this.billingService.verifyAndActivate(reference);
  }

  @Get("history")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("tenant.manage")
  @ApiOperation({ summary: "Get payment history" })
  async getPaymentHistory(@TenantId() tenantId: string) {
    return this.billingService.getPaymentHistory(tenantId);
  }

  @Patch("plan")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions("tenant.manage")
  @ApiOperation({ summary: "Change tenant plan (admin/manual)" })
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

  /**
   * PayStack webhook — no auth guard, uses signature verification
   */
  @Post("webhook/paystack")
  @HttpCode(200)
  @ApiOperation({ summary: "PayStack webhook handler" })
  async handlePaystackWebhook(
    @Headers("x-paystack-signature") signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(req.body);

    if (!signature || !this.paystackService.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn("Invalid PayStack webhook signature");
      throw new BadRequestException("Invalid signature");
    }

    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const event = payload.event as string;
    const data = payload.data as Record<string, unknown>;

    await this.billingService.handleWebhook(event, data);

    return { received: true };
  }
}
