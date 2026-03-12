import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as https from "https";
import type { TenantPlan, BillingCycle } from "@nerva/shared";
import { PLANS } from "@nerva/shared";

interface PaystackResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackVerifyData {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer: {
    id: number;
    customer_code: string;
    email: string;
  };
  metadata: Record<string, unknown>;
}

interface PaystackCustomerData {
  customer_code: string;
  email: string;
  id: number;
}

interface PaystackPlanData {
  plan_code: string;
  name: string;
  amount: number;
  interval: string;
}

interface PaystackSubscriptionData {
  subscription_code: string;
  status: string;
  email_token: string;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl = "api.paystack.co";

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>("PAYSTACK_SECRET_KEY") || "";
  }

  /**
   * Initialize a one-time payment transaction
   */
  async initializeTransaction(params: {
    email: string;
    amountCents: number;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<PaystackInitData> {
    const res = await this.request<PaystackInitData>(
      "POST",
      "/transaction/initialize",
      {
        email: params.email,
        amount: params.amountCents, // PayStack expects kobo/cents
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
        currency: "ZAR",
      },
    );
    return res.data;
  }

  /**
   * Verify a transaction by reference
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyData> {
    const res = await this.request<PaystackVerifyData>(
      "GET",
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    return res.data;
  }

  /**
   * Create or fetch a PayStack customer
   */
  async createCustomer(params: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<PaystackCustomerData> {
    const res = await this.request<PaystackCustomerData>(
      "POST",
      "/customer",
      {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
      },
    );
    return res.data;
  }

  /**
   * Create a subscription plan on PayStack
   */
  async createPlan(params: {
    name: string;
    amount: number;
    interval: "monthly" | "annually";
  }): Promise<PaystackPlanData> {
    const res = await this.request<PaystackPlanData>("POST", "/plan", {
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      currency: "ZAR",
    });
    return res.data;
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(params: {
    customerEmail: string;
    planCode: string;
    authorization?: string;
  }): Promise<PaystackSubscriptionData> {
    const res = await this.request<PaystackSubscriptionData>(
      "POST",
      "/subscription",
      {
        customer: params.customerEmail,
        plan: params.planCode,
        authorization: params.authorization,
      },
    );
    return res.data;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(params: {
    subscriptionCode: string;
    emailToken: string;
  }): Promise<void> {
    await this.request("POST", "/subscription/disable", {
      code: params.subscriptionCode,
      token: params.emailToken,
    });
  }

  /**
   * Verify webhook signature from PayStack
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(body)
      .digest("hex");
    return hash === signature;
  }

  /**
   * Get the amount in cents for a plan + cycle
   */
  getPlanAmount(plan: TenantPlan, cycle: BillingCycle): number {
    const planDef = PLANS[plan];
    if (!planDef) return 0;
    return cycle === "monthly"
      ? planDef.monthlyPriceZar
      : planDef.annualPriceZar;
  }

  /**
   * Generic PayStack API request
   */
  private request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<PaystackResponse<T>> {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : undefined;

      const options: https.RequestOptions = {
        hostname: this.baseUrl,
        path,
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      };

      const req = https.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody) as PaystackResponse<T>;
            if (!parsed.status) {
              this.logger.error(
                `PayStack API error: ${parsed.message}`,
                path,
              );
              reject(new Error(`PayStack: ${parsed.message}`));
              return;
            }
            resolve(parsed);
          } catch (err) {
            this.logger.error(`PayStack parse error`, responseBody);
            reject(err);
          }
        });
      });

      req.on("error", (err) => {
        this.logger.error(`PayStack request error: ${err.message}`, path);
        reject(err);
      });

      if (data) req.write(data);
      req.end();
    });
  }
}
