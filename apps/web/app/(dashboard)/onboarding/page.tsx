'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCreateWarehouse } from '@/lib/queries/warehouses';
import { useCreateItem } from '@/lib/queries/items';
import { useOnboarding } from '@/lib/hooks/use-onboarding';

const STEPS = ['Welcome', 'Warehouse', 'First Item', 'All Set'];

const UOM_OPTIONS = [
  { value: 'EA', label: 'Each (EA)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'L', label: 'Litre (L)' },
  { value: 'M', label: 'Metre (M)' },
  { value: 'BOX', label: 'Box (BOX)' },
  { value: 'PKT', label: 'Packet (PKT)' },
  { value: 'PAL', label: 'Pallet (PAL)' },
];

function generateCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w.substring(0, 4))
    .join('-');
}

function generateSku(name: string): string {
  const code = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.substring(0, 4))
    .join('-');
  const num = String(Math.floor(Math.random() * 900) + 100);
  return code ? `${code}-${num}` : '';
}

export default function OnboardingPage() {
  const router = useRouter();
  const { markComplete } = useOnboarding();
  const createWarehouse = useCreateWarehouse();
  const createItem = useCreateItem();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  // Warehouse fields
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');

  // Item fields
  const [itemName, setItemName] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemUom, setItemUom] = useState('EA');

  // Auto-generate codes
  useEffect(() => {
    setWhCode(generateCode(whName));
  }, [whName]);

  useEffect(() => {
    if (itemName) {
      setItemSku(generateSku(itemName));
    } else {
      setItemSku('');
    }
  }, [itemName]);

  const next = () => {
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleCreateWarehouse = async () => {
    if (!whName.trim()) {
      setError('Warehouse name is required');
      return;
    }
    setError('');
    try {
      const siteId = localStorage.getItem('siteId') || '';
      await createWarehouse.mutateAsync({
        siteId,
        name: whName.trim(),
        code: whCode.trim() || undefined,
      });
      next();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create warehouse';
      setError(msg);
    }
  };

  const handleCreateItem = async () => {
    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }
    if (!itemSku.trim()) {
      setError('SKU is required');
      return;
    }
    setError('');
    try {
      await createItem.mutateAsync({
        description: itemName.trim(),
        sku: itemSku.trim(),
        uom: itemUom,
      });
      next();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create item';
      setError(msg);
    }
  };

  const handleFinish = () => {
    markComplete();
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  i <= step
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {i < step ? (
                  <CheckIcon />
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden sm:block w-12 h-0.5 transition-colors ${
                    i < step ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-8">
          {/* Step 1: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <RocketIcon />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Welcome to Nerva!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                Nerva helps you manage warehouses, inventory, sales orders,
                procurement, and fulfilment -- all in one place.
              </p>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Let&#39;s set up a few things to get you started. This only takes a minute.
              </p>
              <Button size="lg" onClick={next}>
                Let&#39;s get started
              </Button>
            </div>
          )}

          {/* Step 2: Create Warehouse */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Create a Warehouse
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Warehouses are where you store and manage inventory. You can always add more later.
              </p>

              <div className="space-y-4">
                <Input
                  label="Warehouse Name"
                  placeholder="e.g. Main Distribution Center"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                />
                <Input
                  label="Code (auto-generated)"
                  placeholder="e.g. MAIN-DIST"
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                />
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex items-center justify-between mt-8">
                <Button variant="ghost" onClick={next}>
                  Skip for now
                </Button>
                <Button
                  onClick={handleCreateWarehouse}
                  isLoading={createWarehouse.isPending}
                >
                  Create Warehouse
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Add First Item */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Add Your First Item
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Items are the products or materials you track in inventory.
              </p>

              <div className="space-y-4">
                <Input
                  label="Item Name"
                  placeholder="e.g. Widget A - Blue"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
                <Input
                  label="SKU (auto-generated)"
                  placeholder="e.g. WIDG-A-001"
                  value={itemSku}
                  onChange={(e) => setItemSku(e.target.value)}
                />
                <Select
                  label="Unit of Measure"
                  options={UOM_OPTIONS}
                  value={itemUom}
                  onChange={(e) => setItemUom(e.target.value)}
                />
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex items-center justify-between mt-8">
                <Button variant="ghost" onClick={next}>
                  Skip for now
                </Button>
                <Button
                  onClick={handleCreateItem}
                  isLoading={createItem.isPending}
                >
                  Add Item
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: All Set */}
          {step === 3 && (
            <div className="text-center">
              <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <PartyIcon />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                You&#39;re all set!
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Your workspace is ready. Here are some things you can do next:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                <QuickLink
                  href="/dashboard"
                  label="Dashboard"
                  description="View operations overview"
                />
                <QuickLink
                  href="/master-data/items/new"
                  label="Add More Items"
                  description="Build your catalogue"
                />
                <QuickLink
                  href="/procurement/purchase-orders/new"
                  label="Purchase Order"
                  description="Order from suppliers"
                />
              </div>

              <Button size="lg" onClick={handleFinish}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>

        {/* Step label */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
    >
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </span>
      <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5">
        {description}
      </span>
    </Link>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="h-8 w-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function PartyIcon() {
  return (
    <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}
