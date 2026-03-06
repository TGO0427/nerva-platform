'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { ListPageTemplate } from '@/components/templates';
import { useToast } from '@/components/ui/toast';
import { useIbts, useCreateIbt, useQueryParams, type IbtDetail } from '@/lib/queries';
import { useWarehouses } from '@/lib/queries/warehouses';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'RECEIVED': return 'success';
    case 'PENDING_APPROVAL': case 'IN_TRANSIT': return 'warning';
    case 'APPROVED': case 'PICKING': return 'info';
    case 'CANCELLED': return 'danger';
    case 'DRAFT': default: return 'default';
  }
}

function formatStatus(status: string): string {
  return status?.replace(/_/g, ' ') || '';
}

export default function IbtListPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');

  const { addToast } = useToast();
  const createIbt = useCreateIbt();
  const { data: warehouses } = useWarehouses();
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useIbts({ ...params, status: status || undefined });

  const tableData = useMemo(() => {
    if (!data?.data) return [];
    if (!search) return data.data;
    const q = search.toLowerCase();
    return data.data.filter(
      (row) =>
        row.ibtNo?.toLowerCase().includes(q) ||
        row.fromWarehouseName?.toLowerCase().includes(q) ||
        row.toWarehouseName?.toLowerCase().includes(q),
    );
  }, [data?.data, search]);

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggle,
    togglePage,
    clearSelection,
  } = useTableSelection(tableData);

  const allColumns: Column<IbtDetail>[] = useMemo(() => [
    {
      key: 'ibtNo',
      header: 'IBT No',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.ibtNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: 'fromWarehouseName',
      header: 'From Warehouse',
      render: (row) => row.fromWarehouseName || '-',
    },
    {
      key: 'toWarehouseName',
      header: 'To Warehouse',
      render: (row) => row.toWarehouseName || '-',
    },
    {
      key: 'lineCount',
      header: 'Lines',
      width: '80px',
      render: (row) => row.lineCount ?? 0,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'ibts', alwaysVisible: ['ibtNo'] });

  const handleRowClick = (row: IbtDetail) => {
    router.push(`/inventory/ibts/${row.id}`);
  };

  const handleExport = useCallback(() => {
    const exportData = selectedCount > 0
      ? tableData.filter((row) => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'ibtNo', header: 'IBT No' },
      { key: 'status', header: 'Status' },
      { key: 'fromWarehouseName', header: 'From Warehouse' },
      { key: 'toWarehouseName', header: 'To Warehouse' },
      { key: 'lineCount', header: 'Lines' },
      { key: 'createdAt', header: 'Created', getValue: (row: IbtDetail) => formatDateForExport(row.createdAt) },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('ibts'));
  }, [tableData, selectedCount, selectedIds]);

  const handleCreate = async () => {
    if (!fromWarehouseId || !toWarehouseId) return;
    try {
      const result = await createIbt.mutateAsync({
        fromWarehouseId,
        toWarehouseId,
        notes: notes || undefined,
      });
      addToast('Transfer created', 'success');
      setShowCreate(false);
      setFromWarehouseId('');
      setToWarehouseId('');
      setNotes('');
      router.push(`/inventory/ibts/${result.id}`);
    } catch {
      addToast('Failed to create transfer', 'error');
    }
  };

  const totalIbts = data?.meta?.total || 0;
  const draftCount = tableData.filter((o) => o.status === 'DRAFT').length;
  const inTransitCount = tableData.filter((o) => o.status === 'IN_TRANSIT').length;
  const receivedCount = tableData.filter((o) => o.status === 'RECEIVED').length;

  return (
    <ListPageTemplate
      title="Inter-Branch Transfers"
      subtitle="Transfer stock between warehouses"
      headerActions={
        <Button onClick={() => setShowCreate(!showCreate)}>
          <PlusIcon />
          {showCreate ? 'Cancel' : 'New Transfer'}
        </Button>
      }
      stats={[
        { title: 'Total', value: totalIbts, icon: <TransferIcon />, iconColor: 'gray' },
        { title: 'Draft', value: draftCount, icon: <DraftIcon />, iconColor: 'blue' },
        { title: 'In Transit', value: inTransitCount, icon: <TruckIcon />, iconColor: 'yellow' },
        { title: 'Received', value: receivedCount, icon: <CheckIcon />, iconColor: 'green' },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search IBT#, warehouse..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
            alwaysVisible={['ibtNo']}
          />
          <ExportActions onExport={handleExport} selectedCount={selectedCount} />
        </div>
      }
    >
      {showCreate && (
        <Card className="mx-6 mb-4">
          <CardHeader>
            <CardTitle>Create Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            {(warehouses?.length || 0) < 2 ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
                You need at least two warehouses to create an inter-branch transfer.{' '}
                <Link href="/master-data/warehouses/new" className="font-medium text-primary-600 hover:underline">
                  Create another warehouse
                </Link>{' '}
                first.
              </div>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
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
        columns={visibleColumns}
        data={tableData}
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
        onRowClick={handleRowClick}
        emptyState={{
          icon: <TransferEmptyIcon />,
          title: 'No transfers found',
          description: status ? 'No transfers match the selected filter' : 'Create your first inter-branch transfer',
          action: !status && (
            <Button onClick={() => setShowCreate(true)}>Create Transfer</Button>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function DraftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5 0v-4.875c0-.621.504-1.125 1.125-1.125h3.026a1.125 1.125 0 01.795.33l2.599 2.598c.211.211.33.497.33.795V15.75m-7.5 0h7.5" />
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

function TransferEmptyIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}
