'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ItemForm, ItemFormData } from '../_components/item-form';
import { useItem, useUpdateItem, useDeleteItem } from '@/lib/queries';

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: item, isLoading } = useItem(id);
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ItemFormData) => {
    setError(null);
    try {
      await updateItem.mutateAsync({
        id,
        data: {
          description: data.description,
          uom: data.uom,
          weightKg: data.weightKg,
          lengthCm: data.lengthCm,
          widthCm: data.widthCm,
          heightCm: data.heightCm,
          isActive: data.isActive,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      setError(message);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Item not found</h2>
        <p className="text-slate-500 mt-1">The item you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Item</h1>
          <p className="text-slate-500 mt-1">
            {item.sku} - {item.description}
          </p>
        </div>
        <Button
          variant="danger"
          disabled={deleteItem.isPending}
          onClick={async () => {
            if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;
            try {
              await deleteItem.mutateAsync(id);
              router.push('/master-data/items');
            } catch (e: any) {
              alert(e?.response?.data?.message || 'Failed to delete item');
            }
          }}
        >
          {deleteItem.isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <ItemForm
        item={item}
        onSubmit={handleSubmit}
        isSubmitting={updateItem.isPending}
      />
    </div>
  );
}
