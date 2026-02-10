'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { useItems, useWarehouses } from '@/lib/queries';
import { useCreateWorkOrder, useGenerateWorkOrderNumber, useBoms, useRoutings } from '@/lib/queries/manufacturing';

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    workOrderNo: '',
    itemId: '',
    warehouseId: '',
    bomHeaderId: '',
    routingId: '',
    qtyOrdered: '',
    priority: '50',
    plannedStart: '',
    plannedEnd: '',
    notes: '',
  });

  const { data: itemsData } = useItems({ page: 1, limit: 100 });
  const { data: warehousesData } = useWarehouses();
  const { data: bomsData } = useBoms({ page: 1, limit: 100, itemId: formData.itemId, status: 'APPROVED' });
  const { data: routingsData } = useRoutings({ page: 1, limit: 100, itemId: formData.itemId, status: 'APPROVED' });

  const generateNumber = useGenerateWorkOrderNumber();
  const createWorkOrder = useCreateWorkOrder();

  useEffect(() => {
    generateNumber.mutateAsync().then((num) => {
      setFormData((prev) => ({ ...prev, workOrderNo: num }));
    });
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Clear BOM and routing when item changes
      if (field === 'itemId') {
        updated.bomHeaderId = '';
        updated.routingId = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createWorkOrder.mutateAsync({
      workOrderNo: formData.workOrderNo || undefined,
      itemId: formData.itemId,
      warehouseId: formData.warehouseId,
      bomHeaderId: formData.bomHeaderId || undefined,
      routingId: formData.routingId || undefined,
      qtyOrdered: parseFloat(formData.qtyOrdered),
      priority: parseInt(formData.priority),
      plannedStart: formData.plannedStart || undefined,
      plannedEnd: formData.plannedEnd || undefined,
      notes: formData.notes || undefined,
    });

    router.push('/manufacturing/work-orders');
  };

  const items = itemsData?.data || [];
  const warehouses = warehousesData || [];
  const boms = bomsData?.data || [];
  const routings = routingsData?.data || [];

  const isValid = formData.itemId && formData.warehouseId && formData.qtyOrdered && parseFloat(formData.qtyOrdered) > 0;

  return (
    <PageShell>
      <PageHeader
        title="New Work Order"
        subtitle="Create a new production work order"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Work Order Number
              </label>
              <Input
                value={formData.workOrderNo}
                onChange={(e) => handleChange('workOrderNo', e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.warehouseId}
                onChange={(e) => handleChange('warehouseId', e.target.value)}
                options={[
                  { value: '', label: 'Select warehouse...' },
                  ...warehouses.map((wh) => ({
                    value: wh.id,
                    label: wh.name,
                  })),
                ]}
              />
            </div>

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
                Bill of Materials
              </label>
              <Select
                value={formData.bomHeaderId}
                onChange={(e) => handleChange('bomHeaderId', e.target.value)}
                disabled={!formData.itemId}
                options={[
                  { value: '', label: formData.itemId ? 'Select BOM (optional)...' : 'Select product first' },
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
                disabled={!formData.itemId}
                options={[
                  { value: '', label: formData.itemId ? 'Select routing (optional)...' : 'Select product first' },
                  ...routings.map((routing) => ({
                    value: routing.id,
                    label: `Version ${routing.version}`,
                  })),
                ]}
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
              onClick={() => router.push('/manufacturing/work-orders')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createWorkOrder.isPending}
            >
              {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
            </Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
