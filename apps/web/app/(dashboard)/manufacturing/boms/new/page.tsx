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
import { useCreateBom } from '@/lib/queries/manufacturing';

interface BomLineForm {
  itemId: string;
  qtyPer: string;
  uom: string;
  scrapPct: string;
  isCritical: boolean;
  notes: string;
}

export default function NewBomPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    itemId: '',
    baseQty: '1',
    uom: 'EA',
    effectiveFrom: '',
    effectiveTo: '',
    notes: '',
  });
  const [lines, setLines] = useState<BomLineForm[]>([]);

  const { data: itemsData } = useItems({ page: 1, limit: 100 });
  const createBom = useCreateBom();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addLine = () => {
    setLines([...lines, { itemId: '', qtyPer: '', uom: 'EA', scrapPct: '0', isCritical: false, notes: '' }]);
  };

  const updateLine = (index: number, field: keyof BomLineForm, value: string | boolean) => {
    setLines(lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createBom.mutateAsync({
      itemId: formData.itemId,
      baseQty: parseFloat(formData.baseQty),
      uom: formData.uom,
      effectiveFrom: formData.effectiveFrom || undefined,
      effectiveTo: formData.effectiveTo || undefined,
      notes: formData.notes || undefined,
      lines: lines.map((line) => ({
        itemId: line.itemId,
        qtyPer: parseFloat(line.qtyPer),
        uom: line.uom,
        scrapPct: parseFloat(line.scrapPct) || 0,
        isCritical: line.isCritical,
        notes: line.notes || undefined,
      })),
    });

    router.push('/manufacturing/boms');
  };

  const items = itemsData?.data || [];
  const componentItems = items.filter((item) => item.id !== formData.itemId);

  const isValid = formData.itemId && formData.baseQty && lines.length > 0 &&
    lines.every((line) => line.itemId && line.qtyPer && parseFloat(line.qtyPer) > 0);

  return (
    <PageShell>
      <PageHeader
        title="New Bill of Materials"
        subtitle="Define product components and quantities"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Product Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={formData.baseQty}
                  onChange={(e) => handleChange('baseQty', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UOM
                </label>
                <Input
                  value={formData.uom}
                  onChange={(e) => handleChange('uom', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective From
              </label>
              <Input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => handleChange('effectiveFrom', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective To
              </label>
              <Input
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => handleChange('effectiveTo', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <h3 className="text-lg font-medium">Components</h3>
            <Button type="button" variant="secondary" size="sm" onClick={addLine}>
              <PlusIcon />
              Add Component
            </Button>
          </div>

          {lines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No components added yet.</p>
              <p className="text-sm">Click "Add Component" to add materials to this BOM.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start p-4 bg-gray-50 rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Component</label>
                    <Select
                      value={line.itemId}
                      onChange={(e) => updateLine(index, 'itemId', e.target.value)}
                      options={[
                        { value: '', label: 'Select...' },
                        ...componentItems.map((item) => ({
                          value: item.id,
                          label: `${item.sku} - ${item.description}`,
                        })),
                      ]}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Qty Per</label>
                    <Input
                      type="number"
                      min="0.0001"
                      step="any"
                      value={line.qtyPer}
                      onChange={(e) => updateLine(index, 'qtyPer', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">UOM</label>
                    <Input
                      value={line.uom}
                      onChange={(e) => updateLine(index, 'uom', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Scrap %</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={line.scrapPct}
                      onChange={(e) => updateLine(index, 'scrapPct', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Critical</label>
                    <input
                      type="checkbox"
                      checked={line.isCritical}
                      onChange={(e) => updateLine(index, 'isCritical', e.target.checked)}
                      className="mt-2 h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                    <Input
                      value={line.notes}
                      onChange={(e) => updateLine(index, 'notes', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">&nbsp;</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/manufacturing/boms')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createBom.isPending}
            >
              {createBom.isPending ? 'Creating...' : 'Create BOM'}
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
