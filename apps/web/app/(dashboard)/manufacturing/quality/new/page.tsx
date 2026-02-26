'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useCreateNonConformance } from '@/lib/queries';
import type { NcDefectType, NcSeverity } from '@nerva/shared';

const DEFECT_TYPE_OPTIONS: { value: NcDefectType; label: string }[] = [
  { value: 'DIMENSIONAL', label: 'Dimensional' },
  { value: 'VISUAL', label: 'Visual' },
  { value: 'FUNCTIONAL', label: 'Functional' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'CONTAMINATION', label: 'Contamination' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'LABELLING', label: 'Labelling' },
  { value: 'OTHER', label: 'Other' },
];

const SEVERITY_OPTIONS: { value: NcSeverity; label: string }[] = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function NewNonConformancePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const createNc = useCreateNonConformance();

  const [formData, setFormData] = useState({
    itemId: '',
    workOrderId: '',
    defectType: '' as NcDefectType | '',
    severity: '' as NcSeverity | '',
    description: '',
    qtyAffected: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.defectType) {
      newErrors.defectType = 'Defect type is required';
    }
    if (!formData.severity) {
      newErrors.severity = 'Severity is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const result = await createNc.mutateAsync({
        itemId: formData.itemId || undefined,
        workOrderId: formData.workOrderId || undefined,
        defectType: formData.defectType as NcDefectType,
        severity: formData.severity as NcSeverity,
        description: formData.description.trim(),
        qtyAffected: formData.qtyAffected ? parseFloat(formData.qtyAffected) : undefined,
      });
      addToast('Non-conformance created successfully', 'success');
      router.push(`/manufacturing/quality/${result.id}`);
    } catch {
      addToast('Failed to create non-conformance', 'error');
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Non-Conformance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Report a quality issue or defect
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>NC Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item ID */}
              <div>
                <Label htmlFor="itemId">Item / Product</Label>
                <Input
                  id="itemId"
                  placeholder="Enter item ID or SKU"
                  value={formData.itemId}
                  onChange={(e) => updateField('itemId', e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Optional - the affected product</p>
              </div>

              {/* Work Order */}
              <div>
                <Label htmlFor="workOrderId">Work Order</Label>
                <Input
                  id="workOrderId"
                  placeholder="Enter work order ID (optional)"
                  value={formData.workOrderId}
                  onChange={(e) => updateField('workOrderId', e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Optional - the related work order</p>
              </div>

              {/* Defect Type */}
              <div>
                <Label htmlFor="defectType">
                  Defect Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="defectType"
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.defectType
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                  value={formData.defectType}
                  onChange={(e) => updateField('defectType', e.target.value)}
                >
                  <option value="">Select defect type...</option>
                  {DEFECT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.defectType && (
                  <p className="mt-1 text-sm text-red-600">{errors.defectType}</p>
                )}
              </div>

              {/* Severity */}
              <div>
                <Label htmlFor="severity">
                  Severity <span className="text-red-500">*</span>
                </Label>
                <select
                  id="severity"
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.severity
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                  value={formData.severity}
                  onChange={(e) => updateField('severity', e.target.value)}
                >
                  <option value="">Select severity...</option>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.severity && (
                  <p className="mt-1 text-sm text-red-600">{errors.severity}</p>
                )}
              </div>

              {/* Qty Affected */}
              <div>
                <Label htmlFor="qtyAffected">Qty Affected</Label>
                <Input
                  id="qtyAffected"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={formData.qtyAffected}
                  onChange={(e) => updateField('qtyAffected', e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="description"
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.description
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                  rows={4}
                  placeholder="Describe the quality issue in detail..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
              <Link href="/manufacturing/quality">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createNc.isPending}>
                {createNc.isPending ? 'Creating...' : 'Create NC Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
