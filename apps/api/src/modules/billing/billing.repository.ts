import { Injectable } from "@nestjs/common";
import { BaseRepository } from "../../common/db/base.repository";
import type { TenantPlan, BillingCycle } from "@nerva/shared";

export interface TenantBilling {
  id: string;
  name: string;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  planStartedAt: Date;
  planExpiresAt: Date | null;
  maxUsers: number;
  maxWarehouses: number;
}

export interface TenantUsage {
  userCount: number;
  warehouseCount: number;
}

@Injectable()
export class BillingRepository extends BaseRepository {
  async getTenantBilling(tenantId: string): Promise<TenantBilling | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT id, name, plan, billing_cycle, plan_started_at, plan_expires_at, max_users, max_warehouses
       FROM tenants WHERE id = $1`,
      [tenantId],
    );
    return row ? this.mapBilling(row) : null;
  }

  async getTenantUsage(tenantId: string): Promise<TenantUsage> {
    const row = await this.queryOne<Record<string, unknown>>(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE tenant_id = $1 AND is_active = true) AS user_count,
         (SELECT COUNT(*)::int FROM warehouses WHERE tenant_id = $1 AND is_active = true) AS warehouse_count`,
      [tenantId],
    );
    return {
      userCount: (row?.user_count as number) ?? 0,
      warehouseCount: (row?.warehouse_count as number) ?? 0,
    };
  }

  async updatePlan(
    tenantId: string,
    plan: TenantPlan,
    billingCycle: BillingCycle,
    maxUsers: number,
    maxWarehouses: number,
  ): Promise<TenantBilling | null> {
    const row = await this.queryOne<Record<string, unknown>>(
      `UPDATE tenants
       SET plan = $2,
           billing_cycle = $3,
           max_users = $4,
           max_warehouses = $5,
           plan_started_at = NOW(),
           plan_expires_at = CASE WHEN $2 = 'trial' THEN NOW() + INTERVAL '14 days' ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, plan, billing_cycle, plan_started_at, plan_expires_at, max_users, max_warehouses`,
      [tenantId, plan, billingCycle, maxUsers, maxWarehouses],
    );
    return row ? this.mapBilling(row) : null;
  }

  private mapBilling(row: Record<string, unknown>): TenantBilling {
    return {
      id: row.id as string,
      name: row.name as string,
      plan: row.plan as TenantPlan,
      billingCycle: row.billing_cycle as BillingCycle,
      planStartedAt: row.plan_started_at as Date,
      planExpiresAt: (row.plan_expires_at as Date) ?? null,
      maxUsers: row.max_users as number,
      maxWarehouses: row.max_warehouses as number,
    };
  }
}
