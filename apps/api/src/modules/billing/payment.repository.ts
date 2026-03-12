import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/db/base.repository";
import type { TenantPlan, BillingCycle } from "@nerva/shared";

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  paystackReference: string;
  paystackAccessCode: string | null;
  amountZar: number;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  status: "pending" | "success" | "failed" | "refunded";
  paystackResponse: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PaymentRepository extends BaseRepository {
  async createTransaction(params: {
    tenantId: string;
    reference: string;
    accessCode: string;
    amountZar: number;
    plan: TenantPlan;
    billingCycle: BillingCycle;
  }): Promise<PaymentTransaction> {
    const row = await this.queryOne<Record<string, unknown>>(
      `INSERT INTO payment_transactions (tenant_id, paystack_reference, paystack_access_code, amount_zar, plan, billing_cycle)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.tenantId,
        params.reference,
        params.accessCode,
        params.amountZar,
        params.plan,
        params.billingCycle,
      ],
    );
    return this.mapTransaction(row!);
  }

  async findByReference(
    reference: string,
  ): Promise<PaymentTransaction | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT * FROM payment_transactions WHERE paystack_reference = $1`,
      [reference],
    );
    return row ? this.mapTransaction(row) : null;
  }

  async findByTenant(tenantId: string): Promise<PaymentTransaction[]> {
    return this.queryMany<Record<string, unknown>>(
      `SELECT * FROM payment_transactions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [tenantId],
    ).then((rows) => rows.map(this.mapTransaction));
  }

  async updateStatus(
    reference: string,
    status: "success" | "failed" | "refunded",
    paystackResponse?: Record<string, unknown>,
  ): Promise<PaymentTransaction | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE payment_transactions
       SET status = $2, paystack_response = $3, updated_at = NOW()
       WHERE paystack_reference = $1
       RETURNING *`,
      [reference, status, paystackResponse ? JSON.stringify(paystackResponse) : null],
    );
    return row ? this.mapTransaction(row) : null;
  }

  async updateTenantPaystackCodes(
    tenantId: string,
    customerCode: string,
    subscriptionCode?: string,
  ): Promise<void> {
    await this.execute(
      `UPDATE tenants
       SET paystack_customer_code = $2,
           paystack_subscription_code = COALESCE($3, paystack_subscription_code),
           updated_at = NOW()
       WHERE id = $1`,
      [tenantId, customerCode, subscriptionCode || null],
    );
  }

  private mapTransaction(row: Record<string, unknown>): PaymentTransaction {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      paystackReference: row.paystack_reference as string,
      paystackAccessCode: (row.paystack_access_code as string) || null,
      amountZar: row.amount_zar as number,
      plan: row.plan as TenantPlan,
      billingCycle: row.billing_cycle as BillingCycle,
      status: row.status as PaymentTransaction["status"],
      paystackResponse:
        (row.paystack_response as Record<string, unknown>) || null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }
}
