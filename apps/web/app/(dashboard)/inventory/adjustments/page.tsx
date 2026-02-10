'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useToast } from '@/components/ui/toast';
import { useAdjustments, useCreateAdjustment } from '@/lib/queries/inventory';
import { useWarehouses } from '@/lib/queries/warehouses';
import { useQueryParams } from '@/lib/queries';
import type { Adjustment } from '@nerva/shared';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Posted', value: 'POSTED' },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'info',
  SUBMITTED: 'warning',
  APPROVED: 'default',
  POSTED: 'success',
  REJECTED: 'danger',
};

export default function AdjustmentsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { params, setPage } = useQueryParams({ page: 1, limit: 25 });
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const { data, isLoading } = useAdjustments({ ...params, status: statusFilter || undefined });
  const { data: warehouses } = useWarehouses();
  const createAdjustment = useCreateAdjustment();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouseId || !newReason) return;
    try {
      const adj = await createAdjustment.mutateAsync({
        warehouseId: newWarehouseId,
        reason: newReason,
        notes: newNotes || undefined,
      });
      setShowCreateForm(false);
      setNewWarehouseId('');
      setNewReason('');
      setNewNotes('');
      addToast('Adjustment created', 'success');
      router.push(`/inventory/adjustments/${adj.id}`);
    } catch (error) {
      console.error('Failed to create adjustment:', error);
      addToast('Failed to create adjustment', 'error');
    }
  };

  const warehouseMap = new Map(warehouses?.map(w => [w.id, w.name]) || []);

  const columns: Column<Adjustment>[] = [
    {
      key: 'adjustmentNo',
      header: 'Adjustment No',
      sortable: true,
      render: (adj) => (
        <span className="font-medium text-primary-600">{adj.adjustmentNo}</span>
      ),
    },
    {
      key: 'warehouseId',
      header: 'Warehouse',
      render: (adj) => warehouseMap.get(adj.warehouseId) || adj.warehouseId,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (adj) => <span className="truncate max-w-[200px] block">{adj.reason}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (adj) => (
        <Badge variant={statusVariant[adj.status] || 'info'}>
          {adj.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (adj) => new Date(adj.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Adjustments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage inventory adjustments
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New Adjustment'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Adjustment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Warehouse"
                value={newWarehouseId}
                onChange={(e) => setNewWarehouseId(e.target.value)}
                options={warehouses?.map(w => ({ value: w.id, label: w.name })) || []}
                placeholder="Select warehouse"
                required
              />
              <Input
                label="Reason"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g. Cycle count variance"
                required
              />
              <Input
                label="Notes (optional)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Additional notes"
              />
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" disabled={createAdjustment.isPending}>
                  {createAdjustment.isPending ? 'Creating...' : 'Create & Open'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary-100 text-primary-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            data={data?.data || []}
            columns={columns}
            keyField="id"
            isLoading={isLoading}
            onRowClick={(adj) => router.push(`/inventory/adjustments/${adj.id}`)}
            emptyState={{
              title: 'No adjustments found',
              description: 'Create a new adjustment to get started.',
            }}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.data.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {params.page}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={params.page <= 1}
              onClick={() => setPage(params.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={data.data.length < params.limit}
              onClick={() => setPage(params.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
