'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useWorkOrders, useQueryParams } from '@/lib/queries';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import type { WorkOrder, WorkOrderStatus } from '@nerva/shared';

type WorkOrderWithMeta = WorkOrder & { itemSku?: string; itemDescription?: string; warehouseName?: string };

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function WorkOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<WorkOrderStatus | ''>('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useWorkOrders({ ...params, status: status || undefined });

  const tableData = data?.data || [];

  const {
    selectedIds,
    selectedCount,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggle,
    togglePage,
    clearSelection,
  } = useTableSelection(tableData);

  const allColumns: Column<WorkOrderWithMeta>[] = useMemo(() => [
    {
      key: 'workOrderNo',
      header: 'Work Order',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.workOrderNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: 'itemSku',
      header: 'Product',
      render: (row) => (
        <div>
          <div className="font-medium">{row.itemSku || '-'}</div>
          {row.itemDescription && (
            <div className="text-sm text-slate-500 truncate max-w-[200px]">{row.itemDescription}</div>
          )}
        </div>
      ),
    },
    {
      key: 'qtyOrdered',
      header: 'Qty Ordered',
      width: '100px',
      render: (row) => row.qtyOrdered.toLocaleString(),
    },
    {
      key: 'qtyCompleted',
      header: 'Completed',
      width: '100px',
      render: (row) => (
        <span className={row.qtyCompleted >= row.qtyOrdered ? 'text-green-600' : ''}>
          {row.qtyCompleted.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '90px',
      render: (row) => (
        <Badge variant={getPriorityVariant(row.priority)}>
          {getPriorityLabel(row.priority)}
        </Badge>
      ),
    },
    {
      key: 'plannedStart',
      header: 'Planned Start',
      render: (row) => row.plannedStart
        ? new Date(row.plannedStart).toLocaleDateString()
        : '-',
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      render: (row) => row.warehouseName || '-',
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
  } = useColumnVisibility(allColumns, { storageKey: 'work-orders', alwaysVisible: ['workOrderNo'] });

  const handleRowClick = (row: WorkOrderWithMeta) => {
    router.push(`/manufacturing/work-orders/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'workOrderNo', header: 'Work Order' },
      { key: 'status', header: 'Status' },
      { key: 'itemSku', header: 'Product SKU' },
      { key: 'itemDescription', header: 'Product Name' },
      { key: 'qtyOrdered', header: 'Qty Ordered' },
      { key: 'qtyCompleted', header: 'Qty Completed' },
      { key: 'priority', header: 'Priority', getValue: (row: WorkOrderWithMeta) => getPriorityLabel(row.priority) },
      { key: 'plannedStart', header: 'Planned Start', getValue: (row: WorkOrderWithMeta) => formatDateForExport(row.plannedStart) },
      { key: 'plannedEnd', header: 'Planned End', getValue: (row: WorkOrderWithMeta) => formatDateForExport(row.plannedEnd) },
      { key: 'warehouseName', header: 'Warehouse' },
      { key: 'createdAt', header: 'Created', getValue: (row: WorkOrderWithMeta) => formatDateForExport(row.createdAt) },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('work-orders'));
  };

  const totalOrders = data?.meta?.total || 0;
  const draftCount = tableData.filter(o => o.status === 'DRAFT').length;
  const inProgressCount = tableData.filter(o => o.status === 'IN_PROGRESS').length;
  const completedCount = tableData.filter(o => o.status === 'COMPLETED').length;

  return (
    <ListPageTemplate
      title="Work Orders"
      subtitle="Manage production work orders"
      headerActions={
        <Link href="/manufacturing/work-orders/new">
          <Button>
            <PlusIcon />
            New Work Order
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total Orders',
          value: totalOrders,
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
          title: 'In Progress',
          value: inProgressCount,
          icon: <PlayIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Completed',
          value: completedCount,
          icon: <CheckIcon />,
          iconColor: 'green',
        },
      ]}
      filters={
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as WorkOrderStatus | '')}
          options={STATUS_OPTIONS}
          className="max-w-xs"
        />
      }
      filterActions={
        <div className="flex gap-2">
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['workOrderNo']}
          />
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <DownloadIcon />
            {selectedCount > 0 ? `Export (${selectedCount})` : 'Export'}
          </Button>
        </div>
      }
    >
      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
        >
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <DownloadIcon />
            Export Selected
          </Button>
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
          icon: <WorkOrderIcon />,
          title: 'No work orders found',
          description: status ? 'No work orders match the selected filter' : 'Create your first work order to start production',
          action: !status && (
            <Link href="/manufacturing/work-orders/new">
              <Button>Create Work Order</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: WorkOrderStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'RELEASED':
      return 'info';
    case 'ON_HOLD':
    case 'CANCELLED':
      return 'danger';
    case 'DRAFT':
    default:
      return 'default';
  }
}

function formatStatus(status: WorkOrderStatus): string {
  return status?.replace(/_/g, ' ') || status || '';
}

function getPriorityVariant(priority: number): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (priority >= 8) return 'danger';
  if (priority >= 5) return 'warning';
  return 'default';
}

function getPriorityLabel(priority: number): string {
  if (priority >= 8) return 'Urgent';
  if (priority >= 5) return 'High';
  if (priority >= 3) return 'Normal';
  return 'Low';
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
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

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
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

function WorkOrderIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}
