'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { ItemForm, ItemFormData } from '../_components/item-form';
import { useCreateItem } from '@/lib/queries';

export default function NewItemPage() {
  const createItem = useCreateItem();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ItemFormData) => {
    setError(null);
    try {
      await createItem.mutateAsync({
        sku: data.sku,
        description: data.description,
        uom: data.uom,
        weightKg: data.weightKg,
        lengthCm: data.lengthCm,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      setError(message);
      throw err;
    }
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Item</h1>
        <p className="text-slate-500 mt-1">Add a new item to your catalog</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <ItemForm onSubmit={handleSubmit} isSubmitting={createItem.isPending} />
    </div>
  );
}
