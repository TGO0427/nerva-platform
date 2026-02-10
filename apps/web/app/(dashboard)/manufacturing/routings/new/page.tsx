'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { useItems } from '@/lib/queries';
import { useCreateRouting, useWorkstations } from '@/lib/queries/manufacturing';

interface OperationForm {
  name: string;
  description: string;
  workstationId: string;
  setupTimeMins: string;
  runTimeMins: string;
  queueTimeMins: string;
  overlapPct: string;
  isSubcontracted: boolean;
  instructions: string;
}

export default function NewRoutingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    itemId: '',
    effectiveFrom: '',
    effectiveTo: '',
    notes: '',
  });
  const [operations, setOperations] = useState<OperationForm[]>([]);

  const { data: itemsData } = useItems({ page: 1, limit: 100 });
  const { data: workstationsData } = useWorkstations({ page: 1, limit: 100, status: 'ACTIVE' });
  const createRouting = useCreateRouting();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addOperation = () => {
    setOperations([...operations, {
      name: '',
      description: '',
      workstationId: '',
      setupTimeMins: '0',
      runTimeMins: '',
      queueTimeMins: '0',
      overlapPct: '0',
      isSubcontracted: false,
      instructions: '',
    }]);
  };

  const updateOperation = (index: number, field: keyof OperationForm, value: string | boolean) => {
    setOperations(operations.map((op, i) => (i === index ? { ...op, [field]: value } : op)));
  };

  const removeOperation = (index: number) => {
    setOperations(operations.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createRouting.mutateAsync({
      itemId: formData.itemId,
      effectiveFrom: formData.effectiveFrom || undefined,
      effectiveTo: formData.effectiveTo || undefined,
      notes: formData.notes || undefined,
      operations: operations.map((op) => ({
        name: op.name,
        description: op.description || undefined,
        workstationId: op.workstationId || undefined,
        setupTimeMins: parseFloat(op.setupTimeMins) || 0,
        runTimeMins: parseFloat(op.runTimeMins),
        queueTimeMins: parseFloat(op.queueTimeMins) || 0,
        overlapPct: parseFloat(op.overlapPct) || 0,
        isSubcontracted: op.isSubcontracted,
        instructions: op.instructions || undefined,
      })),
    });

    router.push('/manufacturing/routings');
  };

  const items = itemsData?.data || [];
  const workstations = workstationsData?.data || [];

  const isValid = formData.itemId && operations.length > 0 &&
    operations.every((op) => op.name && op.runTimeMins && parseFloat(op.runTimeMins) > 0);

  return (
    <PageShell>
      <PageHeader
        title="New Routing"
        subtitle="Define production sequence and operations"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Product Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.itemId}
                onChange={(e) => handleChange('itemId', e.target.value)}
                options={[
                  { value: '', label: 'Select product...' },
                  ...items.map((item) => ({
                    value: item.id,
                    label: `${item.sku} - ${item.description}`,
                  })),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Effective From
                </label>
                <Input
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={(e) => handleChange('effectiveFrom', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Effective To
                </label>
                <Input
                  type="date"
                  value={formData.effectiveTo}
                  onChange={(e) => handleChange('effectiveTo', e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Operations</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addOperation}>
              <PlusIcon />
              Add Operation
            </Button>
          </div>

          {operations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No operations added yet.</p>
              <p className="text-sm">Click "Add Operation" to add steps to this routing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operations.map((op, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-slate-700">Operation {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOperation(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                      <Input
                        value={op.name}
                        onChange={(e) => updateOperation(index, 'name', e.target.value)}
                        placeholder="Operation name"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Workstation</label>
                      <Select
                        value={op.workstationId}
                        onChange={(e) => updateOperation(index, 'workstationId', e.target.value)}
                        options={[
                          { value: '', label: 'Select...' },
                          ...workstations.map((ws) => ({
                            value: ws.id,
                            label: `${ws.code} - ${ws.name}`,
                          })),
                        ]}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Setup (min)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={op.setupTimeMins}
                        onChange={(e) => updateOperation(index, 'setupTimeMins', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Run (min) *</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={op.runTimeMins}
                        onChange={(e) => updateOperation(index, 'runTimeMins', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Queue (min)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={op.queueTimeMins}
                        onChange={(e) => updateOperation(index, 'queueTimeMins', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Overlap %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={op.overlapPct}
                        onChange={(e) => updateOperation(index, 'overlapPct', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Subcontract</label>
                      <input
                        type="checkbox"
                        checked={op.isSubcontracted}
                        onChange={(e) => updateOperation(index, 'isSubcontracted', e.target.checked)}
                        className="mt-2 h-4 w-4 rounded border-slate-300"
                      />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                      <Input
                        value={op.description}
                        onChange={(e) => updateOperation(index, 'description', e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/manufacturing/routings')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createRouting.isPending}
            >
              {createRouting.isPending ? 'Creating...' : 'Create Routing'}
            </Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
