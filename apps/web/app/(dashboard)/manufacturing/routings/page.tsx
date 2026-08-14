'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { CsvImportDialog } from '@/components/ui/csv-import-dialog';
import { SavedFilterViews, type SavedFilterValues } from '@/components/ui/saved-filter-views';
import { ListPageTemplate } from '@/components/templates';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { useRoutings, useImportRoutings, useQueryParams } from '@/lib/queries';
import { routingImportConfig } from '@/lib/config/csv-import';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import { formatDate, formatNumber } from '@/lib/format';
import type { Routing, RoutingStatus } from '@nerva/shared';

type RoutingWithMeta = Routing & { itemSku?: string; itemDescription?: string; operationCount?: number };

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'OBSOLETE', label: 'Obsolete' },
];
const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value).filter(Boolean);

export default function RoutingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<RoutingStatus | ''>('');
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useRoutings({ ...params, status: status || undefined, search: search || undefined });
  const { data: allRoutingsData } = useRoutings({ page: 1, limit: 1 });
  const { data: draftRoutingsData } = useRoutings({ page: 1, limit: 1, status: 'DRAFT' });
  const { data: pendingRoutingsData } = useRoutings({ page: 1, limit: 1, status: 'PENDING_APPROVAL' });
  const { data: approvedRoutingsData } = useRoutings({ page: 1, limit: 1, status: 'APPROVED' });
  const importMutation = useImportRoutings();

  const tableData = data?.data || [];

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && STATUS_VALUES.includes(statusParam)) {
      setStatus(statusParam as RoutingStatus);
    } else {
      setStatus('');
    }
    setPage(1);
  }, [searchParams, setPage]);

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggle,
    togglePage,
    clearSelection,
  } = useTableSelection(tableData);

  const allColumns: Column<RoutingWithMeta>[] = useMemo(() => [
    {
      key: 'itemSku',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-primary-600">{row.itemSku || '-'}</div>
          {row.itemDescription && (
            <div className="text-sm text-slate-500 truncate max-w-[200px]">{row.itemDescription}</div>
          )}
        </div>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      width: '100px',
      render: (row) => (
        <span className="font-medium">V{row.version}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'operationCount',
      header: 'Operations',
      width: '100px',
      render: (row) => formatNumber(row.operationCount || 0),
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (row) => formatDate(row.effectiveFrom),
    },
    {
      key: 'effectiveTo',
      header: 'Effective To',
      render: (row) => formatDate(row.effectiveTo),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => formatDate(row.createdAt),
    },
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'routings', alwaysVisible: ['itemSku'] });

  const handleRowClick = (row: RoutingWithMeta) => {
    router.push(`/manufacturing/routings/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'itemSku', header: 'Product SKU', getValue: (r: RoutingWithMeta) => r.itemSku || '' },
      { key: 'itemDescription', header: 'Description', getValue: (r: RoutingWithMeta) => r.itemDescription || '' },
      { key: 'version', header: 'Version', getValue: (r: RoutingWithMeta) => `V${r.version}` },
      { key: 'status', header: 'Status' },
      { key: 'operationCount', header: 'Operations', getValue: (r: RoutingWithMeta) => r.operationCount || 0 },
      { key: 'effectiveFrom', header: 'Effective From', getValue: (r: RoutingWithMeta) => formatDateForExport(r.effectiveFrom) },
      { key: 'effectiveTo', header: 'Effective To', getValue: (r: RoutingWithMeta) => formatDateForExport(r.effectiveTo) },
      { key: 'createdAt', header: 'Created', getValue: (r: RoutingWithMeta) => formatDateForExport(r.createdAt) },
    ];
    exportToCSV(exportData, exportColumns, generateExportFilename('routings'));
  };

  const totalRoutings = allRoutingsData?.meta?.total || data?.meta?.total || 0;
  const draftCount = draftRoutingsData?.meta?.total || 0;
  const pendingCount = pendingRoutingsData?.meta?.total || 0;
  const approvedCount = approvedRoutingsData?.meta?.total || 0;
  const hasActiveFilters = Boolean(status || search);
  const activeFilterLabels = [
    status ? `Status: ${STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}` : null,
    search ? `Search: ${search}` : null,
  ].filter(Boolean) as string[];

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
    router.replace('/manufacturing/routings');
  };

  const handleApplySavedView = (values: SavedFilterValues) => {
    setSearch(String(values.search ?? ''));
    setStatus((values.status ?? '') as RoutingStatus | '');
    setPage(1);
  };

  return (
    <ListPageTemplate
      title="Routings"
      subtitle="Manage production sequences and operations"
      headerActions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <ImportIcon />
            Import
          </Button>
          <Link href="/manufacturing/routings/new">
            <Button>
              <PlusIcon />
              New Routing
            </Button>
          </Link>
        </div>
      }
      stats={[
        {
          title: 'Total Routings',
          value: formatNumber(totalRoutings),
          icon: <RouteIcon />,
          iconColor: 'gray',
          href: '/manufacturing/routings',
        },
        {
          title: 'Draft',
          value: formatNumber(draftCount),
          icon: <PencilIcon />,
          iconColor: 'blue',
          href: '/manufacturing/routings?status=DRAFT',
        },
        {
          title: 'Pending Approval',
          value: formatNumber(pendingCount),
          icon: <ClockIcon />,
          iconColor: 'yellow',
          href: '/manufacturing/routings?status=PENDING_APPROVAL',
        },
        {
          title: 'Approved',
          value: formatNumber(approvedCount),
          icon: <CheckIcon />,
          iconColor: 'green',
          href: '/manufacturing/routings?status=APPROVED',
        },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search product SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value as RoutingStatus | ''); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
      }
      filterActions={
        <div className="flex gap-2 print:hidden">
          <SavedFilterViews
            storageKey="routings"
            currentValues={{ search, status }}
            onApply={handleApplySavedView}
          />
          <ExportActions onExport={handleExport} selectedCount={selectedCount} />
          <ColumnToggle
          columns={allColumns}
          visibleKeys={visibleKeys}
          onToggle={toggleColumn}
          onReset={resetColumns}
          alwaysVisible={['itemSku']}
        />
        </div>
      }
    >
      {activeFilterLabels.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900">
          <span className="font-medium">Active filters:</span>
          {activeFilterLabels.map((label) => (
            <span key={label} className="rounded bg-white px-2 py-0.5 text-xs font-medium text-primary-700 shadow-sm">
              {label}
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="ml-auto text-xs font-medium text-primary-700 hover:text-primary-900"
          >
            Clear
          </button>
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
        stickyHeader
        maxBodyHeight="65vh"
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <RoutingIcon />,
          title: 'No routings found',
          description: hasActiveFilters
            ? 'No routings match the current search or filters.'
            : 'Create your first routing.',
          action: hasActiveFilters ? (
            <Button
              variant="secondary"
              onClick={clearAllFilters}
            >
              Clear Filters
            </Button>
          ) : (
            <Link href="/manufacturing/routings/new">
              <Button>Create Routing</Button>
            </Link>
          ),
        }}
      />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => setImportOpen(false)}
        config={routingImportConfig}
        importFn={async (rows) => importMutation.mutateAsync(rows)}
      />
    </ListPageTemplate>
  );
}

function ImportIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function getStatusVariant(status: RoutingStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'PENDING_APPROVAL':
      return 'warning';
    case 'OBSOLETE':
      return 'danger';
    case 'DRAFT':
    default:
      return 'default';
  }
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
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

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function RoutingIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
