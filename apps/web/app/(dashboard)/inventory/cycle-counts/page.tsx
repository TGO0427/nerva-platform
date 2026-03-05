'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { ListPageTemplate } from '@/components/templates';
import { useToast } from '@/components/ui/toast';
import {
  useCycleCounts,
  useCreateCycleCount,
  type CycleCountSummary,
} from '@/lib/queries/inventory';
import { useWarehouses } from '@/lib/queries/warehouses';
import { useQueryParams } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'CLOSED', label: 'Closed' },
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
  const { addToast } = useToast();
  const { params, setPage } = useQueryParams({ page: 1, limit: 25 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newIsBlind, setNewIsBlind] = useState(false);

  const { data, isLoading } = useCycleCounts({ ...params, status: statusFilter || undefined, search: search || undefined });
  const { data: warehouses } = useWarehouses();
  const createCycleCount = useCreateCycleCount();

  const tableData = data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouseId) return;
    try {
      const cc = await createCycleCount.mutateAsync({ warehouseId: newWarehouseId, isBlind: newIsBlind });
      setShowCreateForm(false);
      setNewWarehouseId('');
      setNewIsBlind(false);
      addToast('Cycle count created', 'success');
      router.push(`/inventory/cycle-counts/${cc.id}`);
    } catch (error) {
      console.error('Failed to create cycle count:', error);
      addToast('Failed to create cycle count', 'error');
    }
  };

  const handleExport = () => {
    const exportColumns = [
      { key: 'countNo', header: 'Count No' },
      { key: 'warehouseName', header: 'Warehouse', getValue: (cc: CycleCountSummary) => cc.warehouseName || '' },
      { key: 'status', header: 'Status', getValue: (cc: CycleCountSummary) => cc.status.replace(/_/g, ' ') },
      { key: 'lineCount', header: 'Lines', getValue: (cc: CycleCountSummary) => cc.lineCount ?? 0 },
      { key: 'varianceCount', header: 'Variances', getValue: (cc: CycleCountSummary) => cc.varianceCount ?? 0 },
      { key: 'createdAt', header: 'Created', getValue: (cc: CycleCountSummary) => formatDateForExport(cc.createdAt) },
    ];
    exportToCSV(tableData, exportColumns, generateExportFilename('cycle-counts'));
  };

  const allColumns: Column<CycleCountSummary>[] = useMemo(() => [
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
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'cycle-counts', alwaysVisible: ['countNo'] });

  const totalCounts = data?.meta?.total || 0;
  const openCount = tableData.filter(cc => cc.status === 'OPEN').length;
  const inProgressCount = tableData.filter(cc => cc.status === 'IN_PROGRESS').length;

  return (
    <ListPageTemplate
      title="Cycle Counts"
      subtitle="Physical inventory counting and variance management"
      headerActions={
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'New Cycle Count'}
        </Button>
      }
      stats={[
        {
          title: 'Total',
          value: totalCounts,
          icon: <ClipboardIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Open',
          value: openCount,
          icon: <FolderOpenIcon />,
          iconColor: 'blue',
        },
        {
          title: 'In Progress',
          value: inProgressCount,
          icon: <PlayIcon />,
          iconColor: 'yellow',
        },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search count no. or warehouse..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
      }
      filterActions={
        <div className="flex gap-2 print:hidden">
          <ExportActions onExport={handleExport} />
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['countNo']}
          />
        </div>
      }
    >
      {showCreateForm && (
        <Card className="mb-4 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Create Cycle Count</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Select
                label="Warehouse"
                value={newWarehouseId}
                onChange={(e) => setNewWarehouseId(e.target.value)}
                options={warehouses?.map(w => ({ value: w.id, label: w.name })) || []}
                placeholder="Select warehouse"
                required
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newIsBlind}
                  onChange={(e) => setNewIsBlind(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                Blind count (hide system quantities during counting)
              </label>
              <div className="flex justify-end">
                <Button type="submit" disabled={createCycleCount.isPending}>
                  {createCycleCount.isPending ? 'Creating...' : 'Create & Open'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <DataTable
        data={tableData}
        columns={visibleColumns}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        onRowClick={(cc) => router.push(`/inventory/cycle-counts/${cc.id}`)}
        emptyState={{
          icon: <CycleCountIcon />,
          title: 'No cycle counts found',
          description: statusFilter ? 'No cycle counts match the selected filter' : 'Create a new cycle count to start counting inventory.',
          action: !statusFilter && (
            <Button onClick={() => setShowCreateForm(true)}>New Cycle Count</Button>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function CycleCountIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}
