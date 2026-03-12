export type TenantPlan = 'trial' | 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanDefinition {
  key: TenantPlan;
  name: string;
  description: string;
  monthlyPriceZar: number; // in cents
  annualPriceZar: number;  // in cents (per year, with discount)
  maxUsers: number;        // -1 = unlimited
  maxWarehouses: number;   // -1 = unlimited
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Record<TenantPlan, PlanDefinition> = {
  trial: {
    key: 'trial',
    name: 'Trial',
    description: '14-day free trial with full access',
    monthlyPriceZar: 0,
    annualPriceZar: 0,
    maxUsers: 3,
    maxWarehouses: 1,
    features: [
      'All modules included',
      '3 users',
      '1 warehouse',
      '14-day trial period',
      'Email support',
    ],
  },
  starter: {
    key: 'starter',
    name: 'Starter',
    description: 'For small warehouses and distributors',
    monthlyPriceZar: 250000,   // R2,500
    annualPriceZar: 2500000,   // R25,000 (2 months free)
    maxUsers: 5,
    maxWarehouses: 1,
    features: [
      'Inventory & stock ledger',
      'Sales orders & allocation',
      'Pick, pack & ship',
      'Returns & credit notes',
      'Up to 5 users',
      '1 warehouse',
      'Email support',
    ],
  },
  growth: {
    key: 'growth',
    name: 'Growth',
    description: 'For growing distribution operations',
    monthlyPriceZar: 750000,   // R7,500
    annualPriceZar: 7500000,   // R75,000 (2 months free)
    maxUsers: 15,
    maxWarehouses: 3,
    features: [
      'Everything in Starter',
      'Dispatch & trip planning',
      'Proof of delivery',
      'Customer portal',
      'Finance integrations',
      'Up to 15 users',
      '3 warehouses',
      'Priority support',
    ],
    highlighted: true,
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    description: 'For multi-site manufacturing & distribution',
    monthlyPriceZar: 2000000,  // R20,000
    annualPriceZar: 20000000,  // R200,000 (2 months free)
    maxUsers: -1,
    maxWarehouses: -1,
    features: [
      'Everything in Growth',
      'Manufacturing & BOM',
      'MRP & production scheduling',
      'Quality management',
      'Batch traceability',
      'Unlimited users',
      'Unlimited warehouses',
      'Dedicated support',
    ],
  },
} as const;

export function formatZar(cents: number): string {
  if (cents === 0) return 'Free';
  return `R${(cents / 100).toLocaleString('en-ZA')}`;
}

export function getPlanLimits(plan: TenantPlan) {
  return {
    maxUsers: PLANS[plan].maxUsers,
    maxWarehouses: PLANS[plan].maxWarehouses,
  };
}
