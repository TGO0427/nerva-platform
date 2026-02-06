'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageShell, MetricGrid } from '@/components/ui/motion';
import { StatCard } from '@/components/ui/stat-card';
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

  // Stats
  const draftCount = data?.data?.filter(i => i.status === 'DRAFT').length || 0;
  const pendingApproval = data?.data?.filter(i => i.status === 'PENDING_APPROVAL').length || 0;
  const inTransitCount = data?.data?.filter(i => i.status === 'IN_TRANSIT').length || 0;
  const totalIbts = data?.total || 0;

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Internal Transfers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Transfer stock between warehouses with approval workflow
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'New Transfer'}
        </Button>
      </div>

      <MetricGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Draft"
          value={draftCount}
          icon={<DraftIcon />}
          iconColor="gray"
        />
        <StatCard
          title="Pending Approval"
          value={pendingApproval}
          icon={<ClockIcon />}
          iconColor="yellow"
          alert={pendingApproval > 0}
        />
        <StatCard
          title="In Transit"
          value={inTransitCount}
          icon={<TruckIcon />}
          iconColor="blue"
        />
        <StatCard
          title="Total Transfers"
          value={totalIbts}
          icon={<TransferIcon />}
          iconColor="gray"
        />
      </MetricGrid>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Warehouse</label>
                <Select
                  value={fromWarehouseId}
                  onChange={(e) => setFromWarehouseId(e.target.value)}
                  options={warehouses?.map((w) => ({ value: w.id, label: w.name })) || []}
                  placeholder="Select source"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Warehouse</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
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
          <p className="text-sm text-slate-500">
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
    </PageShell>
  );
}

// Stat icons
function DraftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-5.25a2.25 2.25 0 00-2.25-2.25H15M12 9.75V6.75m-3 3v-3m3 0h3.375c.621 0 1.125.504 1.125 1.125V12m-9-5.25h9" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}
