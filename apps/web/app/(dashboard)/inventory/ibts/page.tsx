'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useIbts, useCreateIbt, type IbtDetail } from '@/lib/queries/ibt';
import { useWarehouses } from '@/lib/queries/warehouses';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Received', value: 'RECEIVED' },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  PICKING: 'warning',
  IN_TRANSIT: 'info',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PICKING: 'Picking',
  IN_TRANSIT: 'In Transit',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

export default function IbtListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const limit = 25;

  const { data, isLoading } = useIbts({ page, limit, status: statusFilter || undefined });
  const { data: warehouses } = useWarehouses();
  const createIbt = useCreateIbt();

  const handleCreate = async () => {
    if (!fromWarehouseId || !toWarehouseId) return;
    try {
      const result = await createIbt.mutateAsync({
        fromWarehouseId,
        toWarehouseId,
        notes: notes || undefined,
      });
      setShowCreate(false);
      setFromWarehouseId('');
      setToWarehouseId('');
      setNotes('');
      router.push(`/inventory/ibts/${result.id}`);
    } catch (e) {
      console.error('Failed to create IBT:', e);
    }
  };

  const columns: Column<IbtDetail>[] = [
    {
      key: 'ibtNo',
      header: 'IBT No',
      render: (row) => <span className="font-medium text-primary-600">{row.ibtNo}</span>,
    },
    {
      key: 'fromWarehouseName',
      header: 'From',
      render: (row) => row.fromWarehouseName,
    },
    {
      key: 'toWarehouseName',
      header: 'To',
      render: (row) => row.toWarehouseName,
    },
    {
      key: 'lineCount',
      header: 'Lines',
      render: (row) => row.lineCount,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={statusVariant[row.status] || 'default'}>
          {statusLabel[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Internal Transfers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Transfer stock between warehouses with approval workflow
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'New Transfer'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Warehouse</label>
                <Select
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                  options={warehouses?.map((w) => ({ value: w.id, label: w.name })) || []}
                  placeholder="Select source"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Warehouse</label>
                <Select
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  options={(warehouses || [])
                    .filter((w) => w.id !== fromWarehouseId)
                    .map((w) => ({ value: w.id, label: w.name }))}
                  placeholder="Select destination"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleCreate}
                disabled={!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId || createIbt.isPending}
                isLoading={createIbt.isPending}
              >
                Create Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 border-b border-gray-200 pb-2">
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
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
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
            onRowClick={(row) => router.push(`/inventory/ibts/${row.id}`)}
            emptyState={{
              title: 'No transfers found',
              description: statusFilter
                ? 'No transfers match the current filter.'
                : 'Create a new transfer to move stock between warehouses.',
            }}
          />
        </CardContent>
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
