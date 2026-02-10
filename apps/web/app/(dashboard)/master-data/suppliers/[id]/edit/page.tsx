'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { SupplierForm, SupplierFormData } from '../../_components/supplier-form';
import { useSupplier, useUpdateSupplier } from '@/lib/queries';

export default function EditSupplierPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: supplier, isLoading } = useSupplier(id);
  const updateSupplier = useUpdateSupplier();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: SupplierFormData) => {
    setError(null);
    try {
      await updateSupplier.mutateAsync({ id, data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update supplier');
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Supplier not found</h2>
        <p className="text-slate-500 mt-1">The supplier you are looking for does not exist.</p>
        <Link href="/master-data/suppliers" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to suppliers
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Supplier</h1>
        <p className="text-slate-500 mt-1">Update supplier information</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <SupplierForm
        supplier={supplier}
        onSubmit={handleSubmit}
        isSubmitting={updateSupplier.isPending}
      />
    </div>
  );
}
