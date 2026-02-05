'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useWarehouse,
  useUpdateWarehouse,
  useBins,
  useCreateBin,
  useUpdateBin,
} from '@/lib/queries/warehouses';
import { useSites } from '@/lib/queries';
import type { Bin } from '@nerva/shared';

const BIN_TYPES = ['STORAGE', 'PICKING', 'RECEIVING', 'QUARANTINE', 'SHIPPING', 'SCRAP'] as const;

export default function WarehouseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: warehouse, isLoading } = useWarehouse(id);
  const { data: sites } = useSites();
  const { data: bins, isLoading: binsLoading } = useBins(id);
  const updateWarehouse = useUpdateWarehouse();
  const createBin = useCreateBin(id);
  const updateBin = useUpdateBin(id);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const [showBinForm, setShowBinForm] = useState(false);
  const [newBinCode, setNewBinCode] = useState('');
  const [newBinType, setNewBinType] = useState<string>('STORAGE');

  const siteName = sites?.find(s => s.id === warehouse?.siteId)?.name || 'Unknown';

  const handleStartEdit = () => {
    if (!warehouse) return;
    setEditName(warehouse.name);
    setEditCode(warehouse.code || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateWarehouse.mutateAsync({
        id,
        data: { name: editName, code: editCode || undefined },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update warehouse:', error);
    }
  };

  const handleToggleActive = async () => {
    if (!warehouse) return;
    const action = warehouse.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} "${warehouse.name}"?`)) {
      try {
        await updateWarehouse.mutateAsync({
          id,
          data: { isActive: !warehouse.isActive },
        });
      } catch (error) {
        console.error('Failed to toggle warehouse status:', error);
      }
    }
  };

  const handleCreateBin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBin.mutateAsync({
        code: newBinCode,
        binType: newBinType,
      });
      setShowBinForm(false);
      setNewBinCode('');
      setNewBinType('STORAGE');
    } catch (error) {
      console.error('Failed to create bin:', error);
    }
  };

  const handleToggleBinActive = async (bin: Bin) => {
    const action = bin.isActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} bin "${bin.code}"?`)) {
      try {
        await updateBin.mutateAsync({
          binId: bin.id,
          data: { isActive: !bin.isActive },
        });
      } catch (error) {
        console.error('Failed to toggle bin status:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Warehouse not found</h2>
        <Link href="/master-data/warehouses" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to warehouses
        </Link>
      </div>
    );
  }

  const activeBins = bins?.filter(b => b.isActive).length || 0;
  const totalBins = bins?.length || 0;

  const binTypeColor: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    STORAGE: 'default',
    PICKING: 'success',
    RECEIVING: 'warning',
    QUARANTINE: 'danger',
    SHIPPING: 'success',
    SCRAP: 'danger',
  };

  return (
    <div>
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link href="/master-data/warehouses" className="text-sm text-gray-500 hover:text-primary-600 mb-1 inline-block">
            &larr; Back to warehouses
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{warehouse.name}</h1>
            <Badge variant={warehouse.isActive ? 'success' : 'danger'}>
              {warehouse.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {warehouse.code && (
            <p className="text-gray-500 mt-1">Code: {warehouse.code}</p>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <Button variant="secondary" onClick={handleStartEdit}>
              <EditIcon />
              Edit
            </Button>
          )}
          <Button
            variant={warehouse.isActive ? 'danger' : 'primary'}
            onClick={handleToggleActive}
          >
            {warehouse.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <Card className="mb-6 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Edit Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  maxLength={50}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveEdit} isLoading={updateWarehouse.isPending}>
                Save Changes
              </Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Site</p>
            <p className="text-lg font-semibold text-gray-900">{siteName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Bins</p>
            <p className="text-lg font-semibold text-gray-900">{totalBins}</p>
            <p className="text-xs text-gray-400">{activeBins} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(warehouse.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bins Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Storage Bins</CardTitle>
            {!showBinForm && (
              <Button size="sm" onClick={() => setShowBinForm(true)}>
                <PlusIcon />
                Add Bin
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Bin Form */}
          {showBinForm && (
            <form onSubmit={handleCreateBin} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bin Code *</label>
                  <Input
                    value={newBinCode}
                    onChange={(e) => setNewBinCode(e.target.value.toUpperCase())}
                    placeholder="e.g., A-01-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bin Type</label>
                  <select
                    value={newBinType}
                    onChange={(e) => setNewBinType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {BIN_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" isLoading={createBin.isPending}>
                    Add Bin
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowBinForm(false);
                      setNewBinCode('');
                      setNewBinType('STORAGE');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Bins Table */}
          {binsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : bins && bins.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bins.map((bin) => (
                    <tr key={bin.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bin.code}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={binTypeColor[bin.binType] || 'default'}>
                          {bin.binType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {[bin.aisle, bin.rack, bin.level].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={bin.isActive ? 'success' : 'danger'}>
                          {bin.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Button
                          variant={bin.isActive ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleBinActive(bin)}
                        >
                          {bin.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BinIcon />
              <h3 className="mt-4 font-medium text-gray-900">No bins configured</h3>
              <p className="text-sm text-gray-500 mt-1">Add bins to organize storage within this warehouse</p>
              {!showBinForm && (
                <Button className="mt-4" size="sm" onClick={() => setShowBinForm(true)}>
                  Add Bin
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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

function EditIcon() {
  return (
    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function BinIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
