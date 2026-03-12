'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS, formatZar } from '@nerva/shared';
import type { TenantPlan, BillingCycle } from '@nerva/shared';

const plans = Object.values(PLANS).filter((p) => p.key !== 'trial');

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-700 grid place-items-center text-white font-bold text-sm">
              N
            </div>
            <span className="font-semibold text-lg">Nerva</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Start with a 14-day free trial. No credit card required.
          All prices in South African Rand (ZAR), excl. VAT.
        </p>

        {/* Cycle Toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm font-medium ${cycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setCycle(cycle === 'monthly' ? 'annual' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              cycle === 'annual' ? 'bg-blue-700' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                cycle === 'annual' ? 'translate-x-6' : ''
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${cycle === 'annual' ? 'text-gray-900' : 'text-gray-500'}`}>
            Annual
          </span>
          {cycle === 'annual' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
              Save 2 months
            </span>
          )}
        </div>
      </section>

      {/* Plan Cards */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const price = cycle === 'monthly' ? plan.monthlyPriceZar : plan.annualPriceZar;
            const monthlyEquivalent = cycle === 'annual'
              ? Math.round(plan.annualPriceZar / 12)
              : plan.monthlyPriceZar;

            return (
              <div
                key={plan.key}
                className={`rounded-2xl border p-8 flex flex-col ${
                  plan.highlighted
                    ? 'border-blue-700 ring-2 ring-blue-700 relative'
                    : 'border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-700 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {formatZar(monthlyEquivalent)}
                    </span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                  {cycle === 'annual' && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatZar(price)} billed annually
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-8 block text-center py-3 px-6 rounded-lg font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-blue-700 text-white hover:bg-blue-800'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Setup Fee Note */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold">Onboarding & Setup</h2>
              <p className="text-gray-600 mt-3">
                Optional one-time setup fee from <strong>R5,000</strong> covers data migration,
                user training, and system configuration tailored to your operation.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Need a custom plan?</h2>
              <p className="text-gray-600 mt-3">
                Large-scale deployments, on-premise hosting, or custom integrations?
                We offer flexible enterprise agreements.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 px-5 py-2.5 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-white transition-colors"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">Pricing FAQ</h2>
          <div className="mt-8 space-y-4 max-w-3xl">
            {[
              {
                q: 'What happens after my trial ends?',
                a: 'Your data is preserved for 30 days. Choose a plan to continue, or export your data. No automatic charges.',
              },
              {
                q: 'Can I change plans later?',
                a: 'Yes, upgrade or downgrade at any time from Settings. Upgrades take effect immediately. Downgrades apply at the next billing cycle.',
              },
              {
                q: 'Are prices inclusive of VAT?',
                a: 'No. All prices shown are exclusive of 15% VAT, which is added at invoicing.',
              },
              {
                q: 'Do you offer discounts for NGOs or startups?',
                a: 'Yes. Contact us for special pricing for non-profits, educational institutions, and early-stage startups.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'EFT (bank transfer), debit order, and credit card. Invoices are sent monthly or annually depending on your billing cycle.',
              },
            ].map((f) => (
              <div key={f.q} className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="font-semibold">{f.q}</div>
                <div className="text-sm text-gray-600 mt-2">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl border border-gray-200 bg-blue-700 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="text-white">
              <div className="text-2xl font-bold">Start your 14-day free trial</div>
              <div className="text-blue-100 mt-2">
                No credit card required. Full access to all features.
              </div>
            </div>
            <Link
              href="/register"
              className="px-6 py-3 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500 flex flex-col md:flex-row justify-between gap-3">
          <div>&copy; {new Date().getFullYear()} Nerva</div>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-gray-700 transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
