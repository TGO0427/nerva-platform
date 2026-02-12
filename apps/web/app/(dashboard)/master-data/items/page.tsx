'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExportActions } from '@/components/ui/export-actions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useItems, useQueryParams } from '@/lib/queries';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import type { Item } from '@nerva/shared';

export default function ItemsPage() {
  const router = useRouter();
  const { params, setPage, setSort, setSearch } = useQueryParams();
  const { data, isLoading } = useItems(params);

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
      width: '100px',
    },
    {
      key: 'weightKg',
      header: 'Weight (kg)',
      width: '120px',
      render: (row) => row.weightKg?.toFixed(2) ?? '-',
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
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      width: '120px',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ], []);

  // Column visibility
  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'items', alwaysVisible: ['sku'] });

  const handleRowClick = (row: Item) => {
    router.push(`/master-data/items/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'sku', header: 'SKU' },
      { key: 'description', header: 'Description' },
      { key: 'uom', header: 'UOM' },
      { key: 'weightKg', header: 'Weight (kg)', getValue: (row: Item) => row.weightKg?.toFixed(2) ?? '' },
      { key: 'isActive', header: 'Status', getValue: (row: Item) => row.isActive ? 'Active' : 'Inactive' },
      { key: 'createdAt', header: 'Created', getValue: (row: Item) => formatDateForExport(row.createdAt) },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('items'));
  };

  const activeItems = tableData.filter(i => i.isActive).length;
  const inactiveItems = tableData.filter(i => !i.isActive).length;
  const totalItems = data?.meta?.total || 0;

  return (
    <ListPageTemplate
      title="Items"
      subtitle="Manage your product catalog"
      headerActions={
        <Link href="/master-data/items/new">
          <Button>
            <PlusIcon />
            Add Item
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total Items',
          value: totalItems,
          icon: <BoxSmIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Active',
          value: activeItems,
          icon: <CheckCircleIcon />,
          iconColor: 'green',
        },
        {
          title: 'Inactive',
          value: inactiveItems,
          icon: <XCircleIcon />,
          iconColor: 'red',
        },
      ]}
      statsColumns={3}
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
        <div className="flex gap-2 print:hidden">
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['sku']}
          />
          <ExportActions onExport={handleExport} selectedCount={selectedCount} />
        </div>
      }
    >
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
        onSort={setSort}
        sortKey={params.sortBy}
        sortOrder={params.sortOrder}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <BoxIcon />,
          title: 'No items found',
          description: params.search
            ? 'Try adjusting your search criteria'
            : 'Get started by adding your first item',
          action: !params.search && (
            <Link href="/master-data/items/new">
              <Button>Add Item</Button>
            </Link>
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

function BoxSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
