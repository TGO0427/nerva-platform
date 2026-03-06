'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useCreateWarehouse } from '@/lib/queries/warehouses';
import { useSites } from '@/lib/queries';

export default function NewWarehousePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const createWarehouse = useCreateWarehouse();
  const { data: sites, isLoading: sitesLoading } = useSites();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [siteId, setSiteId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) {
      addToast('Please select a site', 'warning');
      return;
    }
    try {
      const warehouse = await createWarehouse.mutateAsync({
        siteId,
        name,
        code: code || undefined,
      });
      addToast('Warehouse created', 'success');
      router.push(`/master-data/warehouses/${warehouse.id}`);
    } catch (error) {
      addToast('Failed to create warehouse', 'error');
    }
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <Link href="/master-data/warehouses" className="text-sm text-slate-500 hover:text-primary-600 mb-1 inline-block">
          &larr; Back to warehouses
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Warehouse</h1>
        <p className="text-slate-500 mt-1">Create a new warehouse location</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Site *</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                disabled={sitesLoading}
              >
                <option value="">Select a site...</option>
                {sites?.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Warehouse"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., WH-MAIN"
                maxLength={50}
              />
              <p className="text-xs text-slate-400 mt-1">Optional short code for the warehouse</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" isLoading={createWarehouse.isPending}>
                Create Warehouse
              </Button>
              <Link href="/master-data/warehouses">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
