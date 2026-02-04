'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Alert } from '@/components/ui/alert';
import { SupplierForm, SupplierFormData } from '../_components/supplier-form';
import { useCreateSupplier } from '@/lib/queries';

export default function NewSupplierPage() {
  const createSupplier = useCreateSupplier();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: SupplierFormData) => {
    setError(null);
    try {
      await createSupplier.mutateAsync(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create supplier');
      throw err;
    }
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Supplier</h1>
        <p className="text-gray-500 mt-1">Create a new supplier in your database</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <SupplierForm onSubmit={handleSubmit} isSubmitting={createSupplier.isPending} />
    </div>
  );
}
