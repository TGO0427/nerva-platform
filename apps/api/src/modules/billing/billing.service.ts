import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PLANS, getPlanLimits, formatZar } from "@nerva/shared";
import type { TenantPlan, BillingCycle } from "@nerva/shared";
import { BillingRepository } from "./billing.repository";
import { PaymentRepository } from "./payment.repository";
import { PaystackService } from "./paystack.service";
import { EmailService } from "../../common/email/email.service";
import { randomUUID } from "crypto";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paystackService: PaystackService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

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

  /**
   * Initialize a PayStack checkout for plan change
   */
  async initializeCheckout(
    tenantId: string,
    email: string,
    plan: TenantPlan,
    billingCycle: BillingCycle,
  ) {
    if (!PLANS[plan]) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }
    if (plan === "trial") {
      throw new BadRequestException("Cannot purchase trial plan");
    }

    const current = await this.billingRepository.getTenantBilling(tenantId);
    if (!current) {
      throw new NotFoundException("Tenant not found");
    }

    // Validate downgrade limits
    const usage = await this.billingRepository.getTenantUsage(tenantId);
    const limits = getPlanLimits(plan);

    if (limits.maxUsers !== -1 && usage.userCount > limits.maxUsers) {
      throw new BadRequestException(
        `Cannot switch: you have ${usage.userCount} active users but the ${PLANS[plan].name} plan allows ${limits.maxUsers}`,
      );
    }
    if (
      limits.maxWarehouses !== -1 &&
      usage.warehouseCount > limits.maxWarehouses
    ) {
      throw new BadRequestException(
        `Cannot switch: you have ${usage.warehouseCount} active warehouses but the ${PLANS[plan].name} plan allows ${limits.maxWarehouses}`,
      );
    }

    const amount = this.paystackService.getPlanAmount(plan, billingCycle);
    const reference = `nerva_${tenantId.slice(0, 8)}_${randomUUID().slice(0, 8)}`;
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const callbackUrl = `${frontendUrl}/settings/billing?ref=${reference}`;

    const paystackData = await this.paystackService.initializeTransaction({
      email,
      amountCents: amount,
      reference,
      callbackUrl,
      metadata: {
        tenant_id: tenantId,
        plan,
        billing_cycle: billingCycle,
      },
    });

    await this.paymentRepository.createTransaction({
      tenantId,
      reference: paystackData.reference,
      accessCode: paystackData.access_code,
      amountZar: amount,
      plan,
      billingCycle,
    });

    this.logger.log(
      `Checkout initialized for tenant ${tenantId}: ${plan} (${billingCycle}) - ref: ${reference}`,
    );

    return {
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
      reference: paystackData.reference,
    };
  }

  /**
   * Verify a payment and activate the plan
   */
  async verifyAndActivate(reference: string) {
    const tx = await this.paymentRepository.findByReference(reference);
    if (!tx) {
      throw new NotFoundException("Transaction not found");
    }

    if (tx.status === "success") {
      return { status: "already_activated", plan: tx.plan };
    }

    const verification =
      await this.paystackService.verifyTransaction(reference);

    if (verification.status !== "success") {
      await this.paymentRepository.updateStatus(
        reference,
        "failed",
        verification as unknown as Record<string, unknown>,
      );
      throw new BadRequestException(
        `Payment not successful: ${verification.status}`,
      );
    }

    // Payment succeeded — activate the plan
    await this.paymentRepository.updateStatus(
      reference,
      "success",
      verification as unknown as Record<string, unknown>,
    );

    // Store PayStack customer code
    if (verification.customer?.customer_code) {
      await this.paymentRepository.updateTenantPaystackCodes(
        tx.tenantId,
        verification.customer.customer_code,
      );
    }

    // Activate the plan
    const limits = getPlanLimits(tx.plan);
    await this.billingRepository.updatePlan(
      tx.tenantId,
      tx.plan,
      tx.billingCycle,
      limits.maxUsers === -1 ? 9999 : limits.maxUsers,
      limits.maxWarehouses === -1 ? 9999 : limits.maxWarehouses,
    );

    this.logger.log(
      `Payment verified and plan activated for tenant ${tx.tenantId}: ${tx.plan} (${tx.billingCycle})`,
    );

    // Send payment receipt email
    this.sendReceiptEmail(
      tx.paystackReference,
      tx.plan,
      tx.billingCycle,
      tx.amountZar,
    );

    return {
      status: "activated",
      plan: tx.plan,
      billingCycle: tx.billingCycle,
    };
  }

  /**
   * Send payment receipt email (fire-and-forget)
   */
  private async sendReceiptEmail(
    reference: string,
    plan: TenantPlan,
    billingCycle: BillingCycle,
    amountZar: number,
  ): Promise<void> {
    try {
      const email = await this.paymentRepository.getTransactionEmail(reference);
      if (!email) return;

      await this.emailService.sendPaymentReceiptEmail(email, {
        planName: PLANS[plan].name,
        billingCycle,
        amountFormatted: formatZar(amountZar),
        reference,
        date: new Date().toLocaleDateString("en-ZA"),
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send receipt email for ${reference}: ${err.message}`,
      );
    }
  }

  /**
   * Send payment failed email (fire-and-forget)
   */
  private async sendFailedEmail(
    reference: string,
    plan: TenantPlan,
  ): Promise<void> {
    try {
      const email = await this.paymentRepository.getTransactionEmail(reference);
      if (!email) return;

      await this.emailService.sendPaymentFailedEmail(email, {
        planName: PLANS[plan].name,
        reference,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send failure email for ${reference}: ${err.message}`,
      );
    }
  }

  /**
   * Handle PayStack webhook event
   */
  async handleWebhook(event: string, data: Record<string, unknown>) {
    this.logger.log(`PayStack webhook: ${event}`);

    switch (event) {
      case "charge.success": {
        const reference = data.reference as string;
        if (!reference) return;

        const tx = await this.paymentRepository.findByReference(reference);
        if (!tx || tx.status === "success") return; // idempotency

        await this.verifyAndActivate(reference);
        break;
      }

      case "charge.failed": {
        const reference = data.reference as string;
        if (!reference) return;

        const tx = await this.paymentRepository.findByReference(reference);
        if (!tx || tx.status !== "pending") return; // idempotency

        await this.paymentRepository.updateStatus(reference, "failed", data);
        this.logger.warn(`Payment failed for ref ${reference}`);
        this.sendFailedEmail(reference, tx.plan);
        break;
      }

      case "charge.dispute.create":
      case "charge.dispute.remind":
      case "charge.dispute.resolve": {
        this.logger.warn(`Payment dispute (${event}): ${JSON.stringify(data)}`);
        break;
      }

      case "subscription.disable": {
        this.logger.warn(
          `Subscription cancelled via PayStack: ${JSON.stringify(data)}`,
        );
        break;
      }

      case "subscription.not_renew": {
        this.logger.warn(`Subscription not renewed: ${JSON.stringify(data)}`);
        break;
      }

      default:
        this.logger.log(`Unhandled PayStack event: ${event}`);
    }
  }

  /**
   * Retry a failed payment — creates a new checkout for the same plan
   */
  async retryPayment(tenantId: string, email: string, reference: string) {
    const tx = await this.paymentRepository.findByReference(reference);
    if (!tx) {
      throw new NotFoundException("Transaction not found");
    }
    if (tx.tenantId !== tenantId) {
      throw new BadRequestException(
        "Transaction does not belong to this tenant",
      );
    }
    if (tx.status === "success") {
      throw new BadRequestException("Payment already succeeded");
    }

    return this.initializeCheckout(tenantId, email, tx.plan, tx.billingCycle);
  }

  /**
   * Get all transactions across tenants (admin)
   */
  async getAllTransactions(limit = 50, offset = 0) {
    return this.paymentRepository.findAll(limit, offset);
  }

  /**
   * Get payment history for a tenant
   */
  async getPaymentHistory(tenantId: string) {
    return this.paymentRepository.findByTenant(tenantId);
  }

  /**
   * Direct plan change (admin/manual, no payment required)
   */
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
