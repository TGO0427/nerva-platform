'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useRouting,
  useUpdateRouting,
  useWorkstations,
  useAddRoutingOperation,
  useUpdateRoutingOperation,
  useDeleteRoutingOperation,
} from '@/lib/queries/manufacturing';
import type { RoutingOperation } from '@nerva/shared';

type OperationWithMeta = RoutingOperation & { workstationCode?: string; workstationName?: string };

interface NewOperationForm {
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

const BLANK_NEW_OPERATION: NewOperationForm = {
  name: '',
  description: '',
  workstationId: '',
  setupTimeMins: '0',
  runTimeMins: '',
  queueTimeMins: '0',
  overlapPct: '0',
  isSubcontracted: false,
  instructions: '',
};

interface OperationEdits {
  name?: string;
  description?: string;
  workstationId?: string;
  setupTimeMins?: string;
  runTimeMins?: string;
  queueTimeMins?: string;
  overlapPct?: string;
  isSubcontracted?: boolean;
  instructions?: string;
}

export default function EditRoutingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: routing, isLoading, error } = useRouting(id);
  const updateRouting = useUpdateRouting();
  const { data: workstationsData } = useWorkstations({ page: 1, limit: 100, status: 'ACTIVE' });
  const addOperation = useAddRoutingOperation(id);
  const updateOperation = useUpdateRoutingOperation(id);
  const deleteOperation = useDeleteRoutingOperation(id);
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  const [formData, setFormData] = useState({
    effectiveFrom: '',
    effectiveTo: '',
    notes: '',
  });

  const [initialized, setInitialized] = useState(false);
  const [operationEdits, setOperationEdits] = useState<Record<string, OperationEdits>>({});
  const [newOperations, setNewOperations] = useState<NewOperationForm[]>([]);
  const [savingOperationId, setSavingOperationId] = useState<string | null>(null);

  // Populate form when routing data loads
  useEffect(() => {
    if (routing && !initialized) {
      setFormData({
        effectiveFrom: routing.effectiveFrom
          ? new Date(routing.effectiveFrom).toISOString().split('T')[0]
          : '',
        effectiveTo: routing.effectiveTo
          ? new Date(routing.effectiveTo).toISOString().split('T')[0]
          : '',
        notes: routing.notes || '',
      });
      setInitialized(true);
    }
  }, [routing, initialized]);

  // Redirect away if routing is not in DRAFT status
  useEffect(() => {
    if (routing && routing.status !== 'DRAFT') {
      router.replace(`/manufacturing/routings/${id}`);
    }
  }, [routing, id, router]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateRouting.mutateAsync({
      id,
      effectiveFrom: formData.effectiveFrom || undefined,
      effectiveTo: formData.effectiveTo || undefined,
      notes: formData.notes || undefined,
    });

    router.push(`/manufacturing/routings/${id}`);
  };

  const handleOperationFieldChange = (opId: string, field: keyof OperationEdits, value: string | boolean) => {
    setOperationEdits((prev) => ({ ...prev, [opId]: { ...prev[opId], [field]: value } }));
  };

  const getOperationValue = (op: OperationWithMeta, field: keyof OperationEdits) => {
    const edited = operationEdits[op.id]?.[field];
    if (edited !== undefined) return edited;
    switch (field) {
      case 'setupTimeMins': return String(op.setupTimeMins || 0);
      case 'runTimeMins': return String(op.runTimeMins);
      case 'queueTimeMins': return String(op.queueTimeMins || 0);
      case 'overlapPct': return String(op.overlapPct || 0);
      case 'isSubcontracted': return op.isSubcontracted;
      default: return (op[field as keyof RoutingOperation] as string) || '';
    }
  };

  const handleSaveOperation = async (opId: string) => {
    const edits = operationEdits[opId];
    if (!edits) return;
    setSavingOperationId(opId);
    try {
      const data: Record<string, unknown> = {};
      if (edits.name !== undefined) data.name = edits.name;
      if (edits.description !== undefined) data.description = edits.description || undefined;
      if (edits.workstationId !== undefined) data.workstationId = edits.workstationId || undefined;
      if (edits.setupTimeMins !== undefined) data.setupTimeMins = parseFloat(edits.setupTimeMins) || 0;
      if (edits.runTimeMins !== undefined) data.runTimeMins = parseFloat(edits.runTimeMins) || 0;
      if (edits.queueTimeMins !== undefined) data.queueTimeMins = parseFloat(edits.queueTimeMins) || 0;
      if (edits.overlapPct !== undefined) data.overlapPct = parseFloat(edits.overlapPct) || 0;
      if (edits.isSubcontracted !== undefined) data.isSubcontracted = edits.isSubcontracted;
      if (edits.instructions !== undefined) data.instructions = edits.instructions || undefined;

      await updateOperation.mutateAsync({ operationId: opId, data });
      setOperationEdits((prev) => {
        const next = { ...prev };
        delete next[opId];
        return next;
      });
      addToast('Operation updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update operation', 'error');
    } finally {
      setSavingOperationId(null);
    }
  };

  const handleDeleteOperation = async (opId: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Operation',
      message: `Remove "${name}" from this routing?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteOperation.mutateAsync(opId);
      addToast('Operation removed', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove operation', 'error');
    }
  };

  const addNewOperationRow = () => {
    setNewOperations((prev) => [...prev, { ...BLANK_NEW_OPERATION }]);
  };

  const updateNewOperation = (index: number, field: keyof NewOperationForm, value: string | boolean) => {
    setNewOperations((prev) => prev.map((op, i) => (i === index ? { ...op, [field]: value } : op)));
  };

  const discardNewOperation = (index: number) => {
    setNewOperations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveNewOperation = async (index: number) => {
    const op = newOperations[index];
    if (!op.name || !op.runTimeMins || parseFloat(op.runTimeMins) <= 0) {
      addToast('Name and a positive run time are required', 'error');
      return;
    }
    try {
      await addOperation.mutateAsync({
        name: op.name,
        description: op.description || undefined,
        workstationId: op.workstationId || undefined,
        setupTimeMins: parseFloat(op.setupTimeMins) || 0,
        runTimeMins: parseFloat(op.runTimeMins),
        queueTimeMins: parseFloat(op.queueTimeMins) || 0,
        overlapPct: parseFloat(op.overlapPct) || 0,
        isSubcontracted: op.isSubcontracted,
        instructions: op.instructions || undefined,
      });
      setNewOperations((prev) => prev.filter((_, i) => i !== index));
      addToast('Operation added', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add operation', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !routing) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Routing not found</h2>
          <p className="mt-2 text-slate-500">
            The routing you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button className="mt-4" onClick={() => router.push('/manufacturing/routings')}>
            Back to Routings
          </Button>
        </div>
      </PageShell>
    );
  }

  // Don't render form if not DRAFT (redirect will happen via useEffect)
  if (routing.status !== 'DRAFT') {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const workstations = workstationsData?.data || [];
  const workstationOptions = [
    { value: '', label: 'Select...' },
    ...workstations.map((ws) => ({ value: ws.id, label: `${ws.code} - ${ws.name}` })),
  ];
  const existingOperations = (routing.operations || []) as OperationWithMeta[];

  return (
    <PageShell>
      <PageHeader
        title={`Edit Routing V${routing.version}`}
        subtitle="Modify routing details"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6 mb-6">
          {/* Read-only info */}
          <div className="mb-6 rounded-md bg-slate-50 p-4">
            <div>
              <div className="text-sm text-slate-500">Product</div>
              <div className="mt-1 font-medium">
                {(routing as any).itemSku || routing.itemId.slice(0, 8)}
                {(routing as any).itemDescription && (
                  <span className="text-slate-500"> - {(routing as any).itemDescription}</span>
                )}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </Card>

        {/* Operations */}
        <Card className="mb-6">
          <div className="p-4 border-b flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Operations</h3>
              <p className="text-sm text-slate-500 mt-1">
                Changes to an operation save individually - use Save on that row.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addNewOperationRow}>
              <PlusIcon />
              Add Operation
            </Button>
          </div>
          <div className="p-4 space-y-4">
            {existingOperations.length === 0 && newOperations.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <OperationIcon className="mx-auto h-12 w-12 mb-2" />
                <p>No operations defined for this routing.</p>
                <p className="text-sm">Click &quot;Add Operation&quot; to add a step.</p>
              </div>
            )}

            {existingOperations.map((op) => {
              const isSaving = savingOperationId === op.id;
              return (
                <div key={op.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-slate-700">Operation {op.operationNo}</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveOperation(op.id)}
                        disabled={!operationEdits[op.id] || isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOperation(op.id, op.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                      <Input
                        value={getOperationValue(op, 'name') as string}
                        onChange={(e) => handleOperationFieldChange(op.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Workstation</label>
                      <Select
                        value={getOperationValue(op, 'workstationId') as string}
                        onChange={(e) => handleOperationFieldChange(op.id, 'workstationId', e.target.value)}
                        options={workstationOptions}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Setup (min)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={getOperationValue(op, 'setupTimeMins') as string}
                        onChange={(e) => handleOperationFieldChange(op.id, 'setupTimeMins', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Run (min) *</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={getOperationValue(op, 'runTimeMins') as string}
                        onChange={(e) => handleOperationFieldChange(op.id, 'runTimeMins', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Queue (min)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={getOperationValue(op, 'queueTimeMins') as string}
                        onChange={(e) => handleOperationFieldChange(op.id, 'queueTimeMins', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Overlap %</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={getOperationValue(op, 'overlapPct') as string}
                        onChange={(e) => handleOperationFieldChange(op.id, 'overlapPct', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Subcontract</label>
                      <input
                        type="checkbox"
                        checked={getOperationValue(op, 'isSubcontracted') as boolean}
                        onChange={(e) => handleOperationFieldChange(op.id, 'isSubcontracted', e.target.checked)}
                        className="mt-2 h-4 w-4 rounded border-slate-300"
                      />
                    </div>
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                      <Input
                        value={getOperationValue(op, 'description') as string}
                        onChange={(e) => handleOperationFieldChange(op.id, 'description', e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {newOperations.map((op, index) => (
              <div key={`new-${index}`} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-slate-700">New Operation</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => handleSaveNewOperation(index)} disabled={addOperation.isPending}>
                      {addOperation.isPending ? 'Adding...' : 'Add'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => discardNewOperation(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                    <Input
                      value={op.name}
                      onChange={(e) => updateNewOperation(index, 'name', e.target.value)}
                      placeholder="Operation name"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Workstation</label>
                    <Select
                      value={op.workstationId}
                      onChange={(e) => updateNewOperation(index, 'workstationId', e.target.value)}
                      options={workstationOptions}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Setup (min)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={op.setupTimeMins}
                      onChange={(e) => updateNewOperation(index, 'setupTimeMins', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Run (min) *</label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={op.runTimeMins}
                      onChange={(e) => updateNewOperation(index, 'runTimeMins', e.target.value)}
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
                      onChange={(e) => updateNewOperation(index, 'queueTimeMins', e.target.value)}
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
                      onChange={(e) => updateNewOperation(index, 'overlapPct', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Subcontract</label>
                    <input
                      type="checkbox"
                      checked={op.isSubcontracted}
                      onChange={(e) => updateNewOperation(index, 'isSubcontracted', e.target.checked)}
                      className="mt-2 h-4 w-4 rounded border-slate-300"
                    />
                  </div>
                  <div className="col-span-6">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                    <Input
                      value={op.description}
                      onChange={(e) => updateNewOperation(index, 'description', e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/manufacturing/routings/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateRouting.isPending}
          >
            {updateRouting.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

function OperationIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'h-12 w-12'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
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
