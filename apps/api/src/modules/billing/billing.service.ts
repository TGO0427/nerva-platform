import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PLANS, getPlanLimits } from "@nerva/shared";
import type { TenantPlan, BillingCycle } from "@nerva/shared";
import { BillingRepository } from "./billing.repository";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly billingRepository: BillingRepository) {}

  async getPlans() {
    return Object.values(PLANS);
  }

  async getCurrentPlan(tenantId: string) {
    const billing = await this.billingRepository.getTenantBilling(tenantId);
    if (!billing) {
      throw new NotFoundException("Tenant not found");
    }

    const usage = await this.billingRepository.getTenantUsage(tenantId);
    const planDef = PLANS[billing.plan];

    return {
      ...billing,
      planName: planDef.name,
      monthlyPriceZar: planDef.monthlyPriceZar,
      annualPriceZar: planDef.annualPriceZar,
      features: planDef.features,
      usage,
      isTrialExpired:
        billing.plan === "trial" &&
        billing.planExpiresAt &&
        new Date(billing.planExpiresAt) < new Date(),
      trialDaysRemaining:
        billing.plan === "trial" && billing.planExpiresAt
          ? Math.max(
              0,
              Math.ceil(
                (new Date(billing.planExpiresAt).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : null,
    };
  }

  async changePlan(
    tenantId: string,
    plan: TenantPlan,
    billingCycle: BillingCycle,
  ) {
    if (!PLANS[plan]) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    if (plan === "trial") {
      throw new BadRequestException("Cannot switch to trial plan");
    }

    const current = await this.billingRepository.getTenantBilling(tenantId);
    if (!current) {
      throw new NotFoundException("Tenant not found");
    }

    // Check usage doesn't exceed new plan limits
    const usage = await this.billingRepository.getTenantUsage(tenantId);
    const limits = getPlanLimits(plan);

    if (limits.maxUsers !== -1 && usage.userCount > limits.maxUsers) {
      throw new BadRequestException(
        `Cannot downgrade: you have ${usage.userCount} active users but the ${PLANS[plan].name} plan allows ${limits.maxUsers}`,
      );
    }

    if (
      limits.maxWarehouses !== -1 &&
      usage.warehouseCount > limits.maxWarehouses
    ) {
      throw new BadRequestException(
        `Cannot downgrade: you have ${usage.warehouseCount} active warehouses but the ${PLANS[plan].name} plan allows ${limits.maxWarehouses}`,
      );
    }

    const updated = await this.billingRepository.updatePlan(
      tenantId,
      plan,
      billingCycle,
      limits.maxUsers === -1 ? 9999 : limits.maxUsers,
      limits.maxWarehouses === -1 ? 9999 : limits.maxWarehouses,
    );

    this.logger.log(
      `Tenant ${tenantId} changed plan from ${current.plan} to ${plan} (${billingCycle})`,
    );

    return updated;
  }
}
