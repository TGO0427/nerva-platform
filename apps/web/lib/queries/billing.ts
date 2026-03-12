import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { TenantPlan, BillingCycle, PlanDefinition } from '@nerva/shared';

interface TenantBillingResponse {
  id: string;
  name: string;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  planStartedAt: string;
  planExpiresAt: string | null;
  maxUsers: number;
  maxWarehouses: number;
  planName: string;
  monthlyPriceZar: number;
  annualPriceZar: number;
  features: string[];
  usage: {
    userCount: number;
    warehouseCount: number;
  };
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
}

export function useBillingPlans() {
  return useQuery<PlanDefinition[]>({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const { data } = await api.get('/billing/plans');
      return data;
    },
  });
}

export function useCurrentPlan() {
  return useQuery<TenantBillingResponse>({
    queryKey: ['billing', 'current'],
    queryFn: async () => {
      const { data } = await api.get('/billing/current');
      return data;
    },
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { plan: TenantPlan; billingCycle: BillingCycle }) => {
      const { data } = await api.patch('/billing/plan', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}
