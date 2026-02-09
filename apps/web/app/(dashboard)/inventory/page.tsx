'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useItems, useQueryParams, useWarehouses } from '@/lib/queries';
import { useExpiryAlertsSummary } from '@/lib/queries/inventory';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename } from '@/lib/utils/export';
import type { Item } from '@nerva/shared';

export default function InventoryPage() {
  const router = useRouter();
  const { params, setPage, setSearch } = useQueryParams();
  const { data: itemsData, isLoading } = useItems(params);
  const { data: warehouses } = useWarehouses();
  const { data: expiryAlerts } = useExpiryAlertsSummary();

  const tableData = itemsData?.data || [];

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
  const allColumns: Column<Item>[] = useMemo(() => [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.sku}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'uom',
      header: 'UOM',
      width: '80px',
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ], []);

  // Column visibility
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'inventory-items', alwaysVisible: ['sku'] });

  const handleRowClick = (row: Item) => {
    router.push(`/inventory/stock/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'sku', header: 'SKU' },
      { key: 'description', header: 'Description' },
      { key: 'uom', header: 'UOM' },
      { key: 'isActive', header: 'Status', getValue: (row: Item) => row.isActive ? 'Active' : 'Inactive' },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('inventory'));
  };

  const expiredCount = expiryAlerts?.expired || 0;
  const criticalCount = expiryAlerts?.critical || 0;

  return (
    <ListPageTemplate
      title="Inventory"
      subtitle="View and manage stock levels"
      headerActions={
        <div className="flex gap-2">
          <Link href="/inventory/expiry-alerts">
            <Button variant="secondary">
              <ExpiryIcon />
              Expiry Alerts
              {expiredCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {expiredCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/inventory/grn">
            <Button variant="secondary">
              <ReceiveIcon />
              GRN Receiving
            </Button>
          </Link>
          <Link href="/inventory/transfers">
            <Button variant="secondary">
              <TransferIcon />
              Transfers
            </Button>
          </Link>
        </div>
      }
      stats={[
        {
          title: 'Warehouses',
          value: warehouses?.length || 0,
          icon: <WarehouseIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Active Items',
          value: itemsData?.meta?.total || 0,
          icon: <ItemsIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Expiry Alerts',
          value: expiredCount,
          subtitle: criticalCount > 0 ? `+${criticalCount} critical` : undefined,
          subtitleType: 'negative',
          icon: <ExpiryLgIcon />,
          iconColor: expiredCount > 0 ? 'red' : 'gray',
          href: '/inventory/expiry-alerts',
          alert: expiredCount > 0,
        },
        {
          title: 'Pending GRNs',
          value: '-',
          icon: <GrnIcon />,
          iconColor: 'blue',
          emptyHint: 'No pending receipts',
        },
      ]}
      statsColumns={4}
      filters={
        <Input
          type="search"
          placeholder="Search items by SKU or description..."
          className="max-w-md"
          value={params.search || ''}
          onChange={(e) => setSearch(e.target.value)}
        />
      }
      filterActions={
        <div className="flex gap-2">
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['sku']}
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
        pagination={itemsData?.meta ? {
          page: itemsData.meta.page,
          limit: itemsData.meta.limit,
          total: itemsData.meta.total || 0,
          totalPages: itemsData.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <BoxIcon />,
          title: 'No items found',
          description: 'Search for an item to view its stock levels',
        }}
      />
    </ListPageTemplate>
  );
}

// Button icons (small)
function ExpiryIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ReceiveIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
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

// Stat card icons (medium)
function WarehouseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ItemsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ExpiryLgIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GrnIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

// Empty state icon (large)
function BoxIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
