'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { CustomerForm, CustomerFormData } from '../_components/customer-form';
import { useToast } from '@/components/ui/toast';
import { useCreateCustomer } from '@/lib/queries';

export default function NewCustomerPage() {
  const createCustomer = useCreateCustomer();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CustomerFormData) => {
    setError(null);
    try {
      await createCustomer.mutateAsync({
        code: data.code || undefined,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        vatNo: data.vatNo || undefined,
        billingAddressLine1: data.billingAddressLine1 || undefined,
        billingAddressLine2: data.billingAddressLine2 || undefined,
        billingCity: data.billingCity || undefined,
        billingState: data.billingState || undefined,
        billingPostalCode: data.billingPostalCode || undefined,
        billingCountry: data.billingCountry || undefined,
        shippingAddressLine1: data.shippingAddressLine1 || undefined,
        shippingAddressLine2: data.shippingAddressLine2 || undefined,
        shippingCity: data.shippingCity || undefined,
        shippingState: data.shippingState || undefined,
        shippingPostalCode: data.shippingPostalCode || undefined,
        shippingCountry: data.shippingCountry || undefined,
      });
      addToast('Customer created successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create customer';
      setError(message);
      addToast('Failed to create customer', 'error');
      throw err;
    }
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Customer</h1>
        <p className="text-slate-500 mt-1">Add a new customer to your database</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <CustomerForm onSubmit={handleSubmit} isSubmitting={createCustomer.isPending} />
    </div>
  );
}
