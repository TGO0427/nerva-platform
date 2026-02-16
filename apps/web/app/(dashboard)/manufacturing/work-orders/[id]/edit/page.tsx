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
import { useWorkOrder, useUpdateWorkOrder, useBoms, useRoutings } from '@/lib/queries/manufacturing';

export default function EditWorkOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: workOrder, isLoading, error } = useWorkOrder(id);
  const updateWorkOrder = useUpdateWorkOrder();

  const [formData, setFormData] = useState({
    bomHeaderId: '',
    routingId: '',
    qtyOrdered: '',
    priority: '3',
    plannedStart: '',
    plannedEnd: '',
    notes: '',
  });

  const [initialized, setInitialized] = useState(false);

  // Populate form when work order data loads
  useEffect(() => {
    if (workOrder && !initialized) {
      setFormData({
        bomHeaderId: workOrder.bomHeaderId || '',
        routingId: workOrder.routingId || '',
        qtyOrdered: String(workOrder.qtyOrdered),
        priority: String(workOrder.priority),
        plannedStart: workOrder.plannedStart
          ? new Date(workOrder.plannedStart).toISOString().split('T')[0]
          : '',
        plannedEnd: workOrder.plannedEnd
          ? new Date(workOrder.plannedEnd).toISOString().split('T')[0]
          : '',
        notes: workOrder.notes || '',
      });
      setInitialized(true);
    }
  }, [workOrder, initialized]);

  // Redirect away if work order is not in DRAFT status
  useEffect(() => {
    if (workOrder && workOrder.status !== 'DRAFT') {
      router.replace(`/manufacturing/work-orders/${id}`);
    }
  }, [workOrder, id, router]);

  // Fetch BOMs and Routings filtered by the work order's item
  const { data: bomsData } = useBoms({
    page: 1,
    limit: 100,
    itemId: workOrder?.itemId,
    status: 'APPROVED',
  });
  const { data: routingsData } = useRoutings({
    page: 1,
    limit: 100,
    itemId: workOrder?.itemId,
    status: 'APPROVED',
  });

  const boms = bomsData?.data || [];
  const routings = routingsData?.data || [];

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateWorkOrder.mutateAsync({
      id,
      bomHeaderId: formData.bomHeaderId || undefined,
      routingId: formData.routingId || undefined,
      qtyOrdered: parseFloat(formData.qtyOrdered),
      priority: parseInt(formData.priority),
      plannedStart: formData.plannedStart || undefined,
      plannedEnd: formData.plannedEnd || undefined,
      notes: formData.notes || undefined,
    });

    router.push(`/manufacturing/work-orders/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Work order not found</h2>
          <p className="mt-2 text-slate-500">
            The work order you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button className="mt-4" onClick={() => router.push('/manufacturing/work-orders')}>
            Back to Work Orders
          </Button>
        </div>
      </PageShell>
    );
  }

  // Don't render form if not DRAFT (redirect will happen via useEffect)
  if (workOrder.status !== 'DRAFT') {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const isValid = formData.qtyOrdered && parseFloat(formData.qtyOrdered) > 0;

  return (
    <PageShell>
      <PageHeader
        title={`Edit ${workOrder.workOrderNo}`}
        subtitle="Modify work order details"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6">
          {/* Read-only info */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md bg-slate-50 p-4">
            <div>
              <div className="text-sm text-slate-500">Product</div>
              <div className="mt-1 font-medium">
                {(workOrder as any).itemSku || workOrder.itemId.slice(0, 8)}
                {(workOrder as any).itemDescription && (
                  <span className="text-slate-500"> - {(workOrder as any).itemDescription}</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Warehouse</div>
              <div className="mt-1 font-medium">
                {(workOrder as any).warehouseName || workOrder.warehouseId.slice(0, 8)}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0.0001"
                step="any"
                value={formData.qtyOrdered}
                onChange={(e) => handleChange('qtyOrdered', e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <Select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                options={[
                  { value: '1', label: 'Low' },
                  { value: '3', label: 'Normal' },
                  { value: '5', label: 'High' },
                  { value: '8', label: 'Urgent' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bill of Materials
              </label>
              <Select
                value={formData.bomHeaderId}
                onChange={(e) => handleChange('bomHeaderId', e.target.value)}
                options={[
                  { value: '', label: 'Select BOM (optional)...' },
                  ...boms.map((bom) => ({
                    value: bom.id,
                    label: `Version ${bom.version} Rev ${bom.revision}`,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Routing
              </label>
              <Select
                value={formData.routingId}
                onChange={(e) => handleChange('routingId', e.target.value)}
                options={[
                  { value: '', label: 'Select routing (optional)...' },
                  ...routings.map((routing) => ({
                    value: routing.id,
                    label: `Version ${routing.version}`,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Planned Start
              </label>
              <Input
                type="date"
                value={formData.plannedStart}
                onChange={(e) => handleChange('plannedStart', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Planned End
              </label>
              <Input
                type="date"
                value={formData.plannedEnd}
                onChange={(e) => handleChange('plannedEnd', e.target.value)}
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

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/manufacturing/work-orders/${id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || updateWorkOrder.isPending}
            >
              {updateWorkOrder.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
