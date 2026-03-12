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

interface CheckoutResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

interface VerifyResponse {
  status: 'activated' | 'already_activated';
  plan: TenantPlan;
  billingCycle?: BillingCycle;
}

interface PaymentTransaction {
  id: string;
  tenantId: string;
  paystackReference: string;
  amountZar: number;
  plan: TenantPlan;
  billingCycle: BillingCycle;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  createdAt: string;
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

export function usePaymentHistory() {
  return useQuery<PaymentTransaction[]>({
    queryKey: ['billing', 'history'],
    queryFn: async () => {
      const { data } = await api.get('/billing/history');
      return data;
    },
  });
}

export function useInitiateCheckout() {
  return useMutation<CheckoutResponse, Error, { plan: TenantPlan; billingCycle: BillingCycle }>({
    mutationFn: async (body) => {
      const { data } = await api.post('/billing/checkout', body);
      return data;
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation<VerifyResponse, Error, string>({
    mutationFn: async (reference) => {
      const { data } = await api.get(`/billing/verify?reference=${reference}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
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
