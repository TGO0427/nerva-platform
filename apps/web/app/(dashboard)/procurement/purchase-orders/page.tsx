'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/data-table';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { usePurchaseOrders, useQueryParams } from '@/lib/queries';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport, formatCurrencyForExport } from '@/lib/utils/export';
import type { PurchaseOrder, PurchaseOrderStatus } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type PurchaseOrderWithSupplier = PurchaseOrder & { supplierName?: string; lineCount?: number };

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { params, setSearch, setPage } = useQueryParams({ page: 1, limit: 20 });
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = usePurchaseOrders({
    ...params,
    status: statusFilter || undefined,
  });

  const tableData = data?.data || [];

  // Row selection
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

  // Column definitions
  const allColumns: Column<PurchaseOrderWithSupplier>[] = useMemo(() => [
    {
      key: 'poNo',
      header: 'PO #',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.poNo}</span>
      ),
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (row) => row.supplierName || '-',
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status as PurchaseOrderStatus)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'orderDate',
      header: 'Order Date',
      sortable: true,
      render: (row) => new Date(row.orderDate).toLocaleDateString(),
    },
    {
      key: 'expectedDate',
      header: 'Expected Date',
      render: (row) => row.expectedDate ? new Date(row.expectedDate).toLocaleDateString() : '-',
    },
    {
      key: 'lineCount',
      header: 'Lines',
      width: '80px',
      render: (row) => row.lineCount || 0,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">
          R {row.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ], []);

  // Column visibility
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'purchase-orders', alwaysVisible: ['poNo'] });

  const handleRowClick = (row: PurchaseOrderWithSupplier) => {
    router.push(`/procurement/purchase-orders/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'poNo', header: 'PO #' },
      { key: 'supplierName', header: 'Supplier' },
      { key: 'status', header: 'Status' },
      { key: 'orderDate', header: 'Order Date', getValue: (row: PurchaseOrderWithSupplier) => formatDateForExport(row.orderDate) },
      { key: 'expectedDate', header: 'Expected Date', getValue: (row: PurchaseOrderWithSupplier) => formatDateForExport(row.expectedDate) },
      { key: 'lineCount', header: 'Lines' },
      { key: 'totalAmount', header: 'Total', getValue: (row: PurchaseOrderWithSupplier) => formatCurrencyForExport(row.totalAmount) },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('purchase-orders'));
  };

  // Calculate stats
  const totalPOs = data?.meta?.total || 0;
  const draftPOs = tableData.filter(po => po.status === 'DRAFT').length;
  const pendingPOs = tableData.filter(po => ['SENT', 'CONFIRMED', 'PARTIAL'].includes(po.status)).length;
  const receivedPOs = tableData.filter(po => po.status === 'RECEIVED').length;

  return (
    <ListPageTemplate
      title="Purchase Orders"
      subtitle="Manage supplier orders and receiving"
      headerActions={
        <Link href="/procurement/purchase-orders/new">
          <Button>
            <PlusIcon />
            Create Purchase Order
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total POs',
          value: totalPOs,
          icon: <ClipboardIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Draft',
          value: draftPOs,
          icon: <DraftIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Pending Receipt',
          value: pendingPOs,
          icon: <TruckIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Received',
          value: receivedPOs,
          icon: <CheckIcon />,
          iconColor: 'green',
        },
      ]}
      statsColumns={4}
      filters={
        <>
          <Input
            placeholder="Search PO # or supplier..."
            value={params.search || ''}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </>
      }
      filterActions={
        <div className="flex gap-2">
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['poNo']}
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
          icon: <ShoppingCartIcon />,
          title: 'No purchase orders yet',
          description: statusFilter
            ? 'No orders match the selected filter'
            : 'Create your first purchase order to get started',
          action: !statusFilter && (
            <Link href="/procurement/purchase-orders/new">
              <Button>Create Purchase Order</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: PurchaseOrderStatus): 'success' | 'warning' | 'danger' | 'default' {
  const variants: Record<PurchaseOrderStatus, 'success' | 'warning' | 'danger' | 'default'> = {
    DRAFT: 'default',
    SENT: 'warning',
    CONFIRMED: 'success',
    PARTIAL: 'warning',
    RECEIVED: 'success',
    CANCELLED: 'danger',
  };
  return variants[status];
}

// Button icons
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

// Stat card icons
function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
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

// Empty state icon
function ShoppingCartIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}
