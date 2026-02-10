'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { useCreateWorkstation } from '@/lib/queries/manufacturing';

const TYPE_OPTIONS = [
  { value: '', label: 'Select type...' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'ASSEMBLY', label: 'Assembly' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'QC', label: 'Quality Control' },
];

export default function NewWorkstationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    workstationType: '',
    capacityPerHour: '',
    costPerHour: '',
  });

  const createWorkstation = useCreateWorkstation();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createWorkstation.mutateAsync({
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      workstationType: formData.workstationType,
      capacityPerHour: formData.capacityPerHour ? parseFloat(formData.capacityPerHour) : undefined,
      costPerHour: formData.costPerHour ? parseFloat(formData.costPerHour) : undefined,
    });

    router.push('/manufacturing/workstations');
  };

  const isValid = formData.code && formData.name && formData.workstationType;

  return (
    <PageShell>
      <PageHeader
        title="New Workstation"
        subtitle="Create a new workstation or work center"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="WS-001"
              />
              <p className="text-xs text-slate-500 mt-1">Unique identifier for this workstation</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="CNC Machine 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.workstationType}
                onChange={(e) => handleChange('workstationType', e.target.value)}
                options={TYPE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Capacity Per Hour
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.capacityPerHour}
                onChange={(e) => handleChange('capacityPerHour', e.target.value)}
                placeholder="100"
              />
              <p className="text-xs text-slate-500 mt-1">Units produced per hour</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cost Per Hour
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.costPerHour}
                onChange={(e) => handleChange('costPerHour', e.target.value)}
                placeholder="25.00"
              />
              <p className="text-xs text-slate-500 mt-1">Operating cost per hour</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Description of the workstation..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/manufacturing/workstations')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createWorkstation.isPending}
            >
              {createWorkstation.isPending ? 'Creating...' : 'Create Workstation'}
            </Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
