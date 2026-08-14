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
import { useBoms, useImportBoms, useQueryParams } from '@/lib/queries';
import { bomImportConfig } from '@/lib/config/csv-import';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import { formatDate, formatNumber, formatQuantity } from '@/lib/format';
import type { BomHeader, BomStatus } from '@nerva/shared';

type BomWithMeta = BomHeader & { itemSku?: string; itemDescription?: string; lineCount?: number };

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'OBSOLETE', label: 'Obsolete' },
];
const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value).filter(Boolean);

export default function BomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BomStatus | ''>('');
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useBoms({ ...params, status: status || undefined, search: search || undefined });
  const { data: allBomsData } = useBoms({ page: 1, limit: 1 });
  const { data: draftBomsData } = useBoms({ page: 1, limit: 1, status: 'DRAFT' });
  const { data: pendingBomsData } = useBoms({ page: 1, limit: 1, status: 'PENDING_APPROVAL' });
  const { data: approvedBomsData } = useBoms({ page: 1, limit: 1, status: 'APPROVED' });
  const importMutation = useImportBoms();

  const tableData = data?.data || [];

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && STATUS_VALUES.includes(statusParam)) {
      setStatus(statusParam as BomStatus);
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

  const allColumns: Column<BomWithMeta>[] = useMemo(() => [
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
      width: '120px',
      render: (row) => (
        <span className="font-medium">
          V{row.version} Rev {row.revision}
        </span>
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
      key: 'lineCount',
      header: 'Components',
      width: '100px',
      render: (row) => formatNumber(row.lineCount || 0),
    },
    {
      key: 'baseQty',
      header: 'Base Qty',
      width: '100px',
      render: (row) => `${formatQuantity(row.baseQty)} ${row.uom}`,
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
  } = useColumnVisibility(allColumns, { storageKey: 'boms', alwaysVisible: ['itemSku'] });

  const handleRowClick = (row: BomWithMeta) => {
    router.push(`/manufacturing/boms/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'itemSku', header: 'Product SKU' },
      { key: 'itemDescription', header: 'Description' },
      {
        key: 'version',
        header: 'Version',
        getValue: (row: BomWithMeta) => `V${row.version} Rev ${row.revision}`,
      },
      {
        key: 'status',
        header: 'Status',
        getValue: (row: BomWithMeta) => formatStatus(row.status),
      },
      {
        key: 'lineCount',
        header: 'Components',
        getValue: (row: BomWithMeta) => row.lineCount || 0,
      },
      {
        key: 'baseQty',
        header: 'Base Qty',
        getValue: (row: BomWithMeta) => `${row.baseQty} ${row.uom}`,
      },
      {
        key: 'effectiveFrom',
        header: 'Effective From',
        getValue: (row: BomWithMeta) => formatDateForExport(row.effectiveFrom),
      },
      {
        key: 'effectiveTo',
        header: 'Effective To',
        getValue: (row: BomWithMeta) => formatDateForExport(row.effectiveTo),
      },
      {
        key: 'createdAt',
        header: 'Created',
        getValue: (row: BomWithMeta) => formatDateForExport(row.createdAt),
      },
    ];
    exportToCSV(exportData, exportColumns, generateExportFilename('boms'));
  };

  const totalBoms = allBomsData?.meta?.total || data?.meta?.total || 0;
  const draftCount = draftBomsData?.meta?.total || 0;
  const pendingCount = pendingBomsData?.meta?.total || 0;
  const approvedCount = approvedBomsData?.meta?.total || 0;
  const hasActiveFilters = Boolean(status || search);
  const activeFilterLabels = [
    status ? `Status: ${STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}` : null,
    search ? `Search: ${search}` : null,
  ].filter(Boolean) as string[];

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
    router.replace('/manufacturing/boms');
  };

  const handleApplySavedView = (values: SavedFilterValues) => {
    setSearch(String(values.search ?? ''));
    setStatus((values.status ?? '') as BomStatus | '');
    setPage(1);
  };

  return (
    <ListPageTemplate
      title="Bills of Materials"
      subtitle="Manage product recipes and components"
      headerActions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <ImportIcon />
            Import
          </Button>
          <Link href="/manufacturing/boms/new">
            <Button>
              <PlusIcon />
              New BOM
            </Button>
          </Link>
        </div>
      }
      stats={[
        {
          title: 'Total BOMs',
          value: formatNumber(totalBoms),
          icon: <ListIcon />,
          iconColor: 'gray',
          href: '/manufacturing/boms',
        },
        {
          title: 'Draft',
          value: formatNumber(draftCount),
          icon: <PencilIcon />,
          iconColor: 'blue',
          href: '/manufacturing/boms?status=DRAFT',
        },
        {
          title: 'Pending Approval',
          value: formatNumber(pendingCount),
          icon: <ClockIcon />,
          iconColor: 'yellow',
          href: '/manufacturing/boms?status=PENDING_APPROVAL',
        },
        {
          title: 'Approved',
          value: formatNumber(approvedCount),
          icon: <CheckIcon />,
          iconColor: 'green',
          href: '/manufacturing/boms?status=APPROVED',
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
            onChange={(e) => { setStatus(e.target.value as BomStatus | ''); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
      }
      filterActions={
        <div className="flex gap-2 print:hidden">
          <SavedFilterViews
            storageKey="boms"
            currentValues={{ search, status }}
            onApply={handleApplySavedView}
          />
          <Link href="/manufacturing/boms/compare">
            <Button variant="secondary" size="sm">
              <CompareIcon />
              Compare BOMs
            </Button>
          </Link>
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
          icon: <BomIcon />,
          title: 'No BOMs found',
          description: hasActiveFilters
            ? 'No BOMs match the current search or filters.'
            : 'Create your first Bill of Materials.',
          action: hasActiveFilters ? (
            <Button
              variant="secondary"
              onClick={clearAllFilters}
            >
              Clear Filters
            </Button>
          ) : (
            <Link href="/manufacturing/boms/new">
              <Button>Create BOM</Button>
            </Link>
          ),
        }}
      />
      <CsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => setImportOpen(false)}
        config={bomImportConfig}
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

function getStatusVariant(status: BomStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
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

function formatStatus(status: BomStatus): string {
  return status?.replace(/_/g, ' ') || status || '';
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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

function BomIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}
