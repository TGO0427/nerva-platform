'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { CsvImportDialog } from '@/components/ui/csv-import-dialog';
import { ListPageTemplate } from '@/components/templates';
import { useToast } from '@/components/ui/toast';
import { useAdjustments, useCreateAdjustment, useImportAdjustments } from '@/lib/queries/inventory';
import { useWarehouses } from '@/lib/queries/warehouses';
import { useQueryParams } from '@/lib/queries';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import { adjustmentImportConfig } from '@/lib/config/csv-import';
import type { Adjustment } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'POSTED', label: 'Posted' },
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
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const importMutation = useImportAdjustments();
  const [importOpen, setImportOpen] = useState(false);

  const handleImport = useCallback(async (rows: Record<string, unknown>[]) => {
    return importMutation.mutateAsync(rows);
  }, [importMutation]);

  const { data, isLoading } = useAdjustments({
    ...params,
    status: statusFilter || undefined,
    search: search || undefined,
  });
  const { data: warehouses } = useWarehouses();
  const createAdjustment = useCreateAdjustment();

  const tableData = data?.data || [];

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggle,
    togglePage,
    clearSelection,
  } = useTableSelection(tableData);

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

  const allColumns: Column<Adjustment>[] = useMemo(() => [
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
      width: '120px',
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
  ], [warehouseMap]);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'adjustments', alwaysVisible: ['adjustmentNo'] });

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'adjustmentNo', header: 'Adjustment No' },
      { key: 'warehouseId', header: 'Warehouse', getValue: (r: Adjustment) => warehouseMap.get(r.warehouseId) || r.warehouseId },
      { key: 'reason', header: 'Reason' },
      { key: 'status', header: 'Status' },
      { key: 'createdAt', header: 'Created', getValue: (r: Adjustment) => formatDateForExport(r.createdAt) },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('adjustments'));
  };

  const totalAdjustments = data?.meta?.total || 0;
  const draftCount = tableData.filter(a => a.status === 'DRAFT').length;
  const submittedCount = tableData.filter(a => a.status === 'SUBMITTED').length;
  const postedCount = tableData.filter(a => a.status === 'POSTED').length;

  return (
    <ListPageTemplate
      title="Stock Adjustments"
      subtitle="Create and manage inventory adjustments"
      headerActions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <ImportIcon />
            Import
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : 'New Adjustment'}
          </Button>
        </div>
      }
      stats={[
        {
          title: 'Total',
          value: totalAdjustments,
          icon: <ClipboardIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Draft',
          value: draftCount,
          icon: <PencilIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Submitted',
          value: submittedCount,
          icon: <ClockIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Posted',
          value: postedCount,
          icon: <CheckIcon />,
          iconColor: 'green',
        },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search adjustment no. or reason..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
      }
      filterActions={
        <div className="flex gap-2 print:hidden">
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['adjustmentNo']}
          />
          <ExportActions onExport={handleExport} selectedCount={selectedCount} />
        </div>
      }
    >
      {showCreateForm && (
        <div className="mb-4 p-4 rounded-xl border border-primary-200 bg-primary-50">
          <h3 className="font-semibold text-slate-900 mb-3">Create Adjustment</h3>
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
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button type="submit" disabled={createAdjustment.isPending}>
                {createAdjustment.isPending ? 'Creating...' : 'Create & Open'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => { setShowCreateForm(false); setNewWarehouseId(''); setNewReason(''); setNewNotes(''); }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
        >
          <ExportActions onExport={handleExport} />
        </BulkActionBar>
      )}

      <DataTable
        data={tableData}
        columns={visibleColumns}
        keyField="id"
        isLoading={isLoading}
        variant="embedded"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={toggle}
        onSelectAll={() => togglePage(tableData)}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        onRowClick={(adj) => router.push(`/inventory/adjustments/${adj.id}`)}
        emptyState={{
          icon: <AdjustmentIcon />,
          title: 'No adjustments found',
          description: statusFilter || search
            ? 'No adjustments match the selected filters'
            : 'Create a new adjustment to get started',
        }}
      />

      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {}}
        config={adjustmentImportConfig}
        importFn={handleImport}
      />
    </ListPageTemplate>
  );
}

function ImportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
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

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AdjustmentIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}
