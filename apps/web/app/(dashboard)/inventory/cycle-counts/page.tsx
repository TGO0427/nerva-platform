'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  useCycleCounts,
  useCreateCycleCount,
  type CycleCountSummary,
} from '@/lib/queries/inventory';
import { useWarehouses } from '@/lib/queries/warehouses';
import { useQueryParams } from '@/lib/queries';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Closed', value: 'CLOSED' },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  PENDING_APPROVAL: 'default',
  CLOSED: 'success',
  CANCELLED: 'danger',
};

export default function CycleCountsPage() {
  const router = useRouter();
  const { params, setPage } = useQueryParams({ page: 1, limit: 25 });
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWarehouseId, setNewWarehouseId] = useState('');

  const { data, isLoading } = useCycleCounts({ ...params, status: statusFilter || undefined });
  const { data: warehouses } = useWarehouses();
  const createCycleCount = useCreateCycleCount();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouseId) return;
    try {
      const cc = await createCycleCount.mutateAsync({ warehouseId: newWarehouseId });
      setShowCreateForm(false);
      setNewWarehouseId('');
      router.push(`/inventory/cycle-counts/${cc.id}`);
    } catch (error) {
      console.error('Failed to create cycle count:', error);
    }
  };

  const columns: Column<CycleCountSummary>[] = [
    {
      key: 'countNo',
      header: 'Count No',
      sortable: true,
      render: (cc) => (
        <span className="font-medium text-primary-600">{cc.countNo}</span>
      ),
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      render: (cc) => cc.warehouseName || cc.warehouseId,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (cc) => (
        <Badge variant={statusVariant[cc.status] || 'info'}>
          {cc.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'lineCount',
      header: 'Lines',
      render: (cc) => cc.lineCount ?? 0,
    },
    {
      key: 'varianceCount',
      header: 'Variances',
      render: (cc) => (
        <span className={cc.varianceCount ? 'text-red-600 font-medium' : ''}>
          {cc.varianceCount ?? 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (cc) => new Date(cc.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cycle Counts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Physical inventory counting and variance management
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New Cycle Count'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Cycle Count</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex items-end gap-4">
              <div className="flex-1">
                <Select
                  label="Warehouse"
                  value={newWarehouseId}
                  onChange={(e) => setNewWarehouseId(e.target.value)}
                  options={warehouses?.map(w => ({ value: w.id, label: w.name })) || []}
                  placeholder="Select warehouse"
                  required
                />
              </div>
              <Button type="submit" disabled={createCycleCount.isPending}>
                {createCycleCount.isPending ? 'Creating...' : 'Create & Open'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
            onRowClick={(cc) => router.push(`/inventory/cycle-counts/${cc.id}`)}
            emptyState={{
              title: 'No cycle counts found',
              description: 'Create a new cycle count to start counting inventory.',
            }}
          />
        </CardContent>
      </Card>

      {data && data.data.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {params.page}</p>
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
