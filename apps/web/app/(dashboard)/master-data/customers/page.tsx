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
import { useCustomers, useQueryParams } from '@/lib/queries';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import type { Customer } from '@nerva/shared';

export default function CustomersPage() {
  const router = useRouter();
  const { params, setPage, setSort, setSearch } = useQueryParams();
  const { data, isLoading } = useCustomers(params);

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
  const allColumns: Column<Customer>[] = useMemo(() => [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: '120px',
      render: (row) => (
        <span className="font-medium text-primary-600">{row.code || '-'}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => row.email || '-',
    },
    {
      key: 'phone',
      header: 'Phone',
      width: '150px',
      render: (row) => row.phone || '-',
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
  } = useColumnVisibility(allColumns, { storageKey: 'customers', alwaysVisible: ['code', 'name'] });

  const handleRowClick = (row: Customer) => {
    router.push(`/customers/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'isActive', header: 'Status', getValue: (row: Customer) => row.isActive ? 'Active' : 'Inactive' },
      { key: 'createdAt', header: 'Created', getValue: (row: Customer) => formatDateForExport(row.createdAt) },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('customers'));
  };

  const activeCustomers = tableData.filter(c => c.isActive).length;
  const inactiveCustomers = tableData.filter(c => !c.isActive).length;
  const totalCustomers = data?.meta?.total || 0;

  return (
    <ListPageTemplate
      title="Customers"
      subtitle="Manage your customer database"
      headerActions={
        <Link href="/master-data/customers/new">
          <Button>
            <PlusIcon />
            Add Customer
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total Customers',
          value: totalCustomers,
          icon: <UsersSmIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Active',
          value: activeCustomers,
          icon: <CheckCircleIcon />,
          iconColor: 'green',
        },
        {
          title: 'Inactive',
          value: inactiveCustomers,
          icon: <XCircleIcon />,
          iconColor: 'red',
        },
      ]}
      statsColumns={3}
      filters={
        <Input
          type="search"
          placeholder="Search customers by name, code, or email..."
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
            alwaysVisible={['code', 'name']}
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
        onSort={setSort}
        sortKey={params.sortBy}
        sortOrder={params.sortOrder}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <UsersIcon />,
          title: 'No customers found',
          description: params.search
            ? 'Try adjusting your search criteria'
            : 'Get started by adding your first customer',
          action: !params.search && (
            <Link href="/master-data/customers/new">
              <Button>Add Customer</Button>
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

function DownloadIcon() {
  return (
    <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function UsersSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
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

function UsersIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
