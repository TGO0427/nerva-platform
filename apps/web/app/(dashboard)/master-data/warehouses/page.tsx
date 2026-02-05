'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse } from '@/lib/queries/warehouses';
import { useSites } from '@/lib/queries';

export default function WarehousesPage() {
  const router = useRouter();
  const { data: warehouses, isLoading } = useWarehouses();
  const { data: sites } = useSites();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newSiteId, setNewSiteId] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWarehouse.mutateAsync({
        siteId: newSiteId,
        name: newName,
        code: newCode || undefined,
      });
      setShowCreateForm(false);
      setNewName('');
      setNewCode('');
      setNewSiteId('');
    } catch (error) {
      console.error('Failed to create warehouse:', error);
    }
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean, name: string) => {
    const action = currentlyActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} "${name}"?`)) {
      try {
        await updateWarehouse.mutateAsync({
          id,
          data: { isActive: !currentlyActive },
        });
      } catch (error) {
        console.error('Failed to toggle warehouse status:', error);
      }
    }
  };

  const getSiteName = (siteId: string) => {
    const site = sites?.find(s => s.id === siteId);
    return site?.name || 'Unknown';
  };

  const activeCount = warehouses?.filter(w => w.isActive).length || 0;
  const inactiveCount = warehouses?.filter(w => !w.isActive).length || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-500 mt-1">Manage warehouse locations and storage bins</p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <PlusIcon />
            Add Warehouse
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{warehouses?.length || 0}</div>
            <p className="text-sm text-gray-500">Total Warehouses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-sm text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
            <p className="text-sm text-gray-500">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-6 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Create New Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site *
                  </label>
                  <select
                    value={newSiteId}
                    onChange={(e) => setNewSiteId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select a site...</option>
                    {sites?.filter(s => s.isActive).map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse Name *
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Main Distribution Center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g., WH-001"
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" isLoading={createWarehouse.isPending}>
                  Create Warehouse
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewName('');
                    setNewCode('');
                    setNewSiteId('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Warehouse List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : warehouses && warehouses.length > 0 ? (
        <div className="space-y-4">
          {warehouses.map((warehouse) => (
            <Card
              key={warehouse.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-4 flex-1"
                    onClick={() => router.push(`/master-data/warehouses/${warehouse.id}`)}
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <WarehouseIcon />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{warehouse.name}</h3>
                        <Badge variant={warehouse.isActive ? 'success' : 'danger'}>
                          {warehouse.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {warehouse.code ? `${warehouse.code} | ` : ''}
                        Site: {getSiteName(warehouse.siteId)} | Created {new Date(warehouse.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={warehouse.isActive ? 'danger' : 'primary'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(warehouse.id, warehouse.isActive, warehouse.name);
                      }}
                    >
                      {warehouse.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <WarehouseIconLarge />
            <h3 className="mt-4 font-medium text-gray-900">No warehouses found</h3>
            <p className="text-sm text-gray-500 mt-1">Create a warehouse to manage storage locations</p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              Add Warehouse
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function WarehouseIcon() {
  return (
    <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}

function WarehouseIconLarge() {
  return (
    <svg className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}
