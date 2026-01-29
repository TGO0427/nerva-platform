'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Item } from '@nerva/shared';

interface ItemFormProps {
  item?: Item;
  onSubmit: (data: ItemFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface ItemFormData {
  sku: string;
  description: string;
  uom: string;
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  isActive?: boolean;
}

const UOM_OPTIONS = [
  { value: 'EA', label: 'Each (EA)' },
  { value: 'BOX', label: 'Box (BOX)' },
  { value: 'CTN', label: 'Carton (CTN)' },
  { value: 'PAL', label: 'Pallet (PAL)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'L', label: 'Liter (L)' },
  { value: 'M', label: 'Meter (M)' },
  { value: 'M2', label: 'Square Meter (M2)' },
  { value: 'M3', label: 'Cubic Meter (M3)' },
];

export function ItemForm({ item, onSubmit, isSubmitting }: ItemFormProps) {
  const router = useRouter();
  const isEdit = !!item;

  const [formData, setFormData] = useState<ItemFormData>({
    sku: item?.sku || '',
    description: item?.description || '',
    uom: item?.uom || 'EA',
    weightKg: item?.weightKg ?? null,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    isActive: item?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else if (formData.sku.length > 50) {
      newErrors.sku = 'SKU must be 50 characters or less';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.uom) {
      newErrors.uom = 'Unit of measure is required';
    }

    if (formData.weightKg !== null && formData.weightKg < 0) {
      newErrors.weightKg = 'Weight cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      router.push('/master-data/items');
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleChange = (field: keyof ItemFormData, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const parseNumber = (value: string): number | null => {
    if (!value.trim()) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SKU *"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              error={errors.sku}
              placeholder="e.g., PROD-001"
              disabled={isEdit}
            />
            <Select
              label="Unit of Measure *"
              value={formData.uom}
              onChange={(e) => handleChange('uom', e.target.value)}
              options={UOM_OPTIONS}
              error={errors.uom}
            />
          </div>
          <Input
            label="Description *"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            error={errors.description}
            placeholder="Enter item description"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dimensions & Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.01"
              min="0"
              value={formData.weightKg ?? ''}
              onChange={(e) => handleChange('weightKg', parseNumber(e.target.value))}
              error={errors.weightKg}
              placeholder="0.00"
            />
            <Input
              label="Length (cm)"
              type="number"
              step="0.1"
              min="0"
              value={formData.lengthCm ?? ''}
              onChange={(e) => handleChange('lengthCm', parseNumber(e.target.value))}
              placeholder="0.0"
            />
            <Input
              label="Width (cm)"
              type="number"
              step="0.1"
              min="0"
              value={formData.widthCm ?? ''}
              onChange={(e) => handleChange('widthCm', parseNumber(e.target.value))}
              placeholder="0.0"
            />
            <Input
              label="Height (cm)"
              type="number"
              step="0.1"
              min="0"
              value={formData.heightCm ?? ''}
              onChange={(e) => handleChange('heightCm', parseNumber(e.target.value))}
              placeholder="0.0"
            />
          </div>
        </CardContent>
      </Card>

      {isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Item is active</span>
            </label>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/master-data/items')}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Item'}
        </Button>
      </div>
    </form>
  );
}
