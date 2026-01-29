'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { CustomerForm, CustomerFormData } from '../_components/customer-form';
import { useCustomer, useUpdateCustomer } from '@/lib/queries';

export default function EditCustomerPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: customer, isLoading } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CustomerFormData) => {
    setError(null);
    try {
      await updateCustomer.mutateAsync({
        id,
        data: {
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
          isActive: data.isActive,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update customer';
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

  if (!customer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Customer not found</h2>
        <p className="text-gray-500 mt-1">The customer you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
        <p className="text-gray-500 mt-1">
          {customer.code ? `${customer.code} - ` : ''}{customer.name}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <CustomerForm
        customer={customer}
        onSubmit={handleSubmit}
        isSubmitting={updateCustomer.isPending}
      />
    </div>
  );
}
