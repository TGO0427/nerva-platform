'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreatePortalReturn } from '@/lib/queries';
import { Button } from '@/components/ui/button';

const RETURN_TYPES = [
  { value: 'REFUND', label: 'Refund' },
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'REPAIR', label: 'Repair' },
];

const REASON_OPTIONS = [
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'DEFECTIVE', label: 'Defective' },
  { value: 'WRONG_ITEM', label: 'Wrong Item' },
  { value: 'NOT_ORDERED', label: 'Not Ordered' },
  { value: 'CHANGE_OF_MIND', label: 'Change of Mind' },
  { value: 'OTHER', label: 'Other' },
];

export default function PortalNewReturnPage() {
  const router = useRouter();
  const createReturn = useCreatePortalReturn();
  const [form, setForm] = useState({
    returnType: 'REFUND',
    reason: 'DAMAGED',
    notes: '',
    salesOrderId: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createReturn.mutateAsync({
        returnType: form.returnType,
        reason: form.reason,
        notes: form.notes || undefined,
        salesOrderId: form.salesOrderId || undefined,
        lines: [], // Lines can be added later
      });
      router.push('/portal/returns');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create return request');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/portal/returns" className="text-sm text-primary-600 hover:underline">&larr; Back to Returns</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Request a Return</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Return Type</label>
          <select
            value={form.returnType}
            onChange={(e) => setForm({ ...form, returnType: e.target.value })}
            className="w-full rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {RETURN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <select
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {REASON_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order Reference (optional)</label>
          <input
            type="text"
            value={form.salesOrderId}
            onChange={(e) => setForm({ ...form, salesOrderId: e.target.value })}
            placeholder="Enter order ID if applicable"
            className="w-full rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={4}
            placeholder="Describe the issue..."
            className="w-full rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={createReturn.isPending}>
            {createReturn.isPending ? 'Submitting...' : 'Submit Return Request'}
          </Button>
          <Link href="/portal/returns">
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
