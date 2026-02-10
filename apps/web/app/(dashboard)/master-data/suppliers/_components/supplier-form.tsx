'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Supplier } from '@nerva/shared';

interface SupplierFormProps {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface SupplierFormData {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  vatNo: string;
  registrationNo: string;
  // Postal Address
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  // Trading Address
  tradingAddressLine1: string;
  tradingAddressLine2: string;
  tradingCity: string;
  tradingPostalCode: string;
  tradingCountry: string;
  isActive?: boolean;
}

export function SupplierForm({ supplier, onSubmit, isSubmitting }: SupplierFormProps) {
  const router = useRouter();
  const isEdit = !!supplier;

  const [formData, setFormData] = useState<SupplierFormData>({
    code: supplier?.code || '',
    name: supplier?.name || '',
    contactPerson: supplier?.contactPerson || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    vatNo: supplier?.vatNo || '',
    registrationNo: supplier?.registrationNo || '',
    addressLine1: supplier?.addressLine1 || '',
    addressLine2: supplier?.addressLine2 || '',
    city: supplier?.city || '',
    postalCode: supplier?.postalCode || '',
    country: supplier?.country || '',
    tradingAddressLine1: supplier?.tradingAddressLine1 || '',
    tradingAddressLine2: supplier?.tradingAddressLine2 || '',
    tradingCity: supplier?.tradingCity || '',
    tradingPostalCode: supplier?.tradingPostalCode || '',
    tradingCountry: supplier?.tradingCountry || '',
    isActive: supplier?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormData, string>>>({});
  const [copyPostalToTrading, setCopyPostalToTrading] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
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
    if (copyPostalToTrading) {
      submitData.tradingAddressLine1 = formData.addressLine1;
      submitData.tradingAddressLine2 = formData.addressLine2;
      submitData.tradingCity = formData.city;
      submitData.tradingPostalCode = formData.postalCode;
      submitData.tradingCountry = formData.country;
    }

    try {
      await onSubmit(submitData);
      router.push('/master-data/suppliers');
    } catch {
      // Error handling is done in the parent component
    }
  };

  const handleChange = (field: keyof SupplierFormData, value: string | boolean) => {
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
              label="Supplier Code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g., SUP-001"
            />
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => handleChange('contactPerson', e.target.value)}
              placeholder="Primary contact name"
            />
          </div>
          <Input
            label="Supplier Name *"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter supplier name"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              placeholder="supplier@example.com"
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+27 21 123 4567"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="VAT Number"
              value={formData.vatNo}
              onChange={(e) => handleChange('vatNo', e.target.value)}
              placeholder="e.g., 4870205988"
            />
            <Input
              label="Company Registration Number"
              value={formData.registrationNo}
              onChange={(e) => handleChange('registrationNo', e.target.value)}
              placeholder="e.g., 1999/026703/07"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Postal Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Address Line 1"
            value={formData.addressLine1}
            onChange={(e) => handleChange('addressLine1', e.target.value)}
            placeholder="Street address"
          />
          <Input
            label="Address Line 2"
            value={formData.addressLine2}
            onChange={(e) => handleChange('addressLine2', e.target.value)}
            placeholder="Building, suite, etc."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className="md:col-span-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trading Address</CardTitle>
          <label className="flex items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              checked={copyPostalToTrading}
              onChange={(e) => setCopyPostalToTrading(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Same as postal
          </label>
        </CardHeader>
        {!copyPostalToTrading && (
          <CardContent className="space-y-4">
            <Input
              label="Address Line 1"
              value={formData.tradingAddressLine1}
              onChange={(e) => handleChange('tradingAddressLine1', e.target.value)}
              placeholder="Street address"
            />
            <Input
              label="Address Line 2"
              value={formData.tradingAddressLine2}
              onChange={(e) => handleChange('tradingAddressLine2', e.target.value)}
              placeholder="Building, suite, etc."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="City"
                value={formData.tradingCity}
                onChange={(e) => handleChange('tradingCity', e.target.value)}
              />
              <Input
                label="Postal Code"
                value={formData.tradingPostalCode}
                onChange={(e) => handleChange('tradingPostalCode', e.target.value)}
              />
              <Input
                label="Country"
                value={formData.tradingCountry}
                onChange={(e) => handleChange('tradingCountry', e.target.value)}
                className="md:col-span-2"
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
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">Supplier is active</span>
            </label>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/master-data/suppliers')}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Supplier'}
        </Button>
      </div>
    </form>
  );
}
