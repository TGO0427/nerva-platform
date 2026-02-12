'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useTenantProfile, useUpdateTenantProfile } from '@/lib/queries';

export default function CompanyProfilePage() {
  const { data: profile, isLoading } = useTenantProfile();
  const updateProfile = useUpdateTenantProfile();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: '',
    phone: '',
    email: '',
    vatNo: '',
    registrationNo: '',
    bankName: '',
    bankAccountNo: '',
    bankBranchCode: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        addressLine1: profile.addressLine1 || '',
        addressLine2: profile.addressLine2 || '',
        city: profile.city || '',
        postalCode: profile.postalCode || '',
        country: profile.country || '',
        phone: profile.phone || '',
        email: profile.email || '',
        vatNo: profile.vatNo || '',
        registrationNo: profile.registrationNo || '',
        bankName: profile.bankName || '',
        bankAccountNo: profile.bankAccountNo || '',
        bankBranchCode: profile.bankBranchCode || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          These details appear on your PDF documents (purchase orders, invoices, credit notes, etc.)
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <Input value={profile?.name || ''} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-400 mt-1">Company name is managed in tenant settings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input id="addressLine1" value={form.addressLine1} onChange={handleChange('addressLine1')} placeholder="Street address" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input id="addressLine2" value={form.addressLine2} onChange={handleChange('addressLine2')} placeholder="Suite, unit, building" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={handleChange('city')} />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" value={form.postalCode} onChange={handleChange('postalCode')} />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country} onChange={handleChange('country')} placeholder="South Africa" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={handleChange('phone')} placeholder="+27 11 000 0000" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={handleChange('email')} placeholder="info@company.co.za" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vatNo">VAT Number</Label>
                  <Input id="vatNo" value={form.vatNo} onChange={handleChange('vatNo')} placeholder="4000000000" />
                </div>
                <div>
                  <Label htmlFor="registrationNo">Registration Number</Label>
                  <Input id="registrationNo" value={form.registrationNo} onChange={handleChange('registrationNo')} placeholder="2020/000000/07" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-4">
                Bank details will appear on invoices and credit notes for payment reference.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input id="bankName" value={form.bankName} onChange={handleChange('bankName')} placeholder="First National Bank" />
                </div>
                <div>
                  <Label htmlFor="bankAccountNo">Account Number</Label>
                  <Input id="bankAccountNo" value={form.bankAccountNo} onChange={handleChange('bankAccountNo')} />
                </div>
                <div>
                  <Label htmlFor="bankBranchCode">Branch Code</Label>
                  <Input id="bankBranchCode" value={form.bankBranchCode} onChange={handleChange('bankBranchCode')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Changes saved successfully</span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
