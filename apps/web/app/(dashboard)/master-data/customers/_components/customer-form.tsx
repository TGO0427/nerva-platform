'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer } from '@nerva/shared';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface CustomerFormData {
  code: string;
  name: string;
  email: string;
  phone: string;
  vatNo: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  isActive?: boolean;
}

export function CustomerForm({ customer, onSubmit, isSubmitting }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = !!customer;

  const [formData, setFormData] = useState<CustomerFormData>({
    code: customer?.code || '',
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    vatNo: customer?.vatNo || '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: '',
    shippingAddressLine1: '',
    shippingAddressLine2: '',
    shippingCity: '',
    shippingState: '',
    shippingPostalCode: '',
    shippingCountry: '',
    isActive: customer?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});
  const [copyBillingToShipping, setCopyBillingToShipping] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = { ...formData };
    if (copyBillingToShipping) {
      submitData.shippingAddressLine1 = formData.billingAddressLine1;
      submitData.shippingAddressLine2 = formData.billingAddressLine2;
      submitData.shippingCity = formData.billingCity;
      submitData.shippingState = formData.billingState;
      submitData.shippingPostalCode = formData.billingPostalCode;
      submitData.shippingCountry = formData.billingCountry;
    }

    try {
      await onSubmit(submitData);
      router.push('/master-data/customers');
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
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
              label="Customer Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g., CUST-001"
            />
            <Input
              label="VAT Number"
              value={formData.vatNo}
              onChange={(e) => handleChange('vatNo', e.target.value)}
              placeholder="e.g., GB123456789"
            />
          </div>
          <Input
            label="Customer Name *"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter customer name"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              placeholder="customer@example.com"
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Address Line 1"
            value={formData.billingAddressLine1}
            onChange={(e) => handleChange('billingAddressLine1', e.target.value)}
            placeholder="Street address"
          />
          <Input
            label="Address Line 2"
            value={formData.billingAddressLine2}
            onChange={(e) => handleChange('billingAddressLine2', e.target.value)}
            placeholder="Apartment, suite, etc."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="City"
              value={formData.billingCity}
              onChange={(e) => handleChange('billingCity', e.target.value)}
            />
            <Input
              label="State/Province"
              value={formData.billingState}
              onChange={(e) => handleChange('billingState', e.target.value)}
            />
            <Input
              label="Postal Code"
              value={formData.billingPostalCode}
              onChange={(e) => handleChange('billingPostalCode', e.target.value)}
            />
            <Input
              label="Country"
              value={formData.billingCountry}
              onChange={(e) => handleChange('billingCountry', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Shipping Address</CardTitle>
          <label className="flex items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              checked={copyBillingToShipping}
              onChange={(e) => setCopyBillingToShipping(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Same as billing
          </label>
        </CardHeader>
        {!copyBillingToShipping && (
          <CardContent className="space-y-4">
            <Input
              label="Address Line 1"
              value={formData.shippingAddressLine1}
              onChange={(e) => handleChange('shippingAddressLine1', e.target.value)}
              placeholder="Street address"
            />
            <Input
              label="Address Line 2"
              value={formData.shippingAddressLine2}
              onChange={(e) => handleChange('shippingAddressLine2', e.target.value)}
              placeholder="Apartment, suite, etc."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="City"
                value={formData.shippingCity}
                onChange={(e) => handleChange('shippingCity', e.target.value)}
              />
              <Input
                label="State/Province"
                value={formData.shippingState}
                onChange={(e) => handleChange('shippingState', e.target.value)}
              />
              <Input
                label="Postal Code"
                value={formData.shippingPostalCode}
                onChange={(e) => handleChange('shippingPostalCode', e.target.value)}
              />
              <Input
                label="Country"
                value={formData.shippingCountry}
                onChange={(e) => handleChange('shippingCountry', e.target.value)}
              />
            </div>
          </CardContent>
        )}
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
              <span className="text-sm text-gray-700">Customer is active</span>
            </label>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/master-data/customers')}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Customer'}
        </Button>
      </div>
    </form>
  );
}
