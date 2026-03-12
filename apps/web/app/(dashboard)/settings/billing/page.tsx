'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentPlan, useBillingPlans, useChangePlan } from '@/lib/queries/billing';
import { PLANS, formatZar } from '@nerva/shared';
import type { TenantPlan, BillingCycle } from '@nerva/shared';

const planOrder: TenantPlan[] = ['starter', 'growth', 'enterprise'];

export default function BillingPage() {
  const { data: current, isLoading } = useCurrentPlan();
  const changePlan = useChangePlan();
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!current) return null;

  const handleUpgrade = (plan: TenantPlan) => {
    setSelectedPlan(plan);
    setSelectedCycle(current.billingCycle);
    setShowConfirm(true);
  };

  const confirmChange = async () => {
    if (!selectedPlan) return;
    await changePlan.mutateAsync({ plan: selectedPlan, billingCycle: selectedCycle });
    setShowConfirm(false);
    setSelectedPlan(null);
  };

  const usersPercent = current.maxUsers > 0
    ? Math.min(100, Math.round((current.usage.userCount / current.maxUsers) * 100))
    : 0;
  const warehousesPercent = current.maxWarehouses > 0
    ? Math.min(100, Math.round((current.usage.warehouseCount / current.maxWarehouses) * 100))
    : 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Plan & Billing</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Trial Warning */}
      {current.plan === 'trial' && (
        <div className={`rounded-lg p-4 mb-6 ${
          current.isTrialExpired
            ? 'bg-red-50 border border-red-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`text-sm font-medium ${current.isTrialExpired ? 'text-red-800' : 'text-yellow-800'}`}>
              {current.isTrialExpired
                ? 'Your trial has expired. Choose a plan to continue using Nerva.'
                : `${current.trialDaysRemaining} days remaining on your free trial.`}
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={current.plan === 'trial' ? 'warning' : 'success'}>
              {current.planName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Monthly Price</div>
              <div className="text-2xl font-bold mt-1">
                {formatZar(current.billingCycle === 'monthly'
                  ? current.monthlyPriceZar
                  : Math.round(current.annualPriceZar / 12)
                )}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </div>
              {current.billingCycle === 'annual' && (
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatZar(current.annualPriceZar)} billed annually
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Billing Cycle</div>
              <div className="text-lg font-semibold mt-1 capitalize">{current.billingCycle}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Plan Started</div>
              <div className="text-lg font-semibold mt-1">
                {new Date(current.planStartedAt).toLocaleDateString('en-ZA')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">Users</span>
                <span className="font-medium">
                  {current.usage.userCount} / {current.maxUsers >= 9999 ? 'Unlimited' : current.maxUsers}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usersPercent > 80 ? 'bg-orange-500' : 'bg-blue-600'}`}
                  style={{ width: `${current.maxUsers >= 9999 ? 5 : usersPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600 dark:text-slate-400">Warehouses</span>
                <span className="font-medium">
                  {current.usage.warehouseCount} / {current.maxWarehouses >= 9999 ? 'Unlimited' : current.maxWarehouses}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${warehousesPercent > 80 ? 'bg-orange-500' : 'bg-blue-600'}`}
                  style={{ width: `${current.maxWarehouses >= 9999 ? 5 : warehousesPercent}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Available Plans</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {planOrder.map((planKey) => {
          const plan = PLANS[planKey];
          const isCurrent = current.plan === planKey;
          const price = current.billingCycle === 'monthly'
            ? plan.monthlyPriceZar
            : Math.round(plan.annualPriceZar / 12);

          return (
            <Card
              key={planKey}
              className={`${plan.highlighted ? 'border-blue-600 ring-1 ring-blue-600' : ''} ${isCurrent ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrent && <Badge variant="info">Current</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatZar(price)}</span>
                  <span className="text-sm text-slate-500">/mo</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    onClick={() => handleUpgrade(planKey)}
                  >
                    {planOrder.indexOf(planKey) > planOrder.indexOf(current.plan as TenantPlan)
                      ? 'Upgrade'
                      : 'Switch'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirm Modal */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Confirm Plan Change
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Switch to <strong>{PLANS[selectedPlan].name}</strong> plan?
            </p>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span>New monthly price</span>
                <span className="font-semibold">
                  {formatZar(selectedCycle === 'monthly'
                    ? PLANS[selectedPlan].monthlyPriceZar
                    : Math.round(PLANS[selectedPlan].annualPriceZar / 12)
                  )}/mo
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Billing Cycle</label>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setSelectedCycle('monthly')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    selectedCycle === 'monthly'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedCycle('annual')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    selectedCycle === 'annual'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Annual (save 2 months)
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={confirmChange}
                disabled={changePlan.isPending}
                isLoading={changePlan.isPending}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
