'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { ListPageTemplate } from '@/components/templates';
import { useBoms, useQueryParams } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import type { BomHeader, BomStatus } from '@nerva/shared';

type BomWithMeta = BomHeader & { itemSku?: string; itemDescription?: string; lineCount?: number };

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'OBSOLETE', label: 'Obsolete' },
];

export default function BomsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BomStatus | ''>('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useBoms({ ...params, status: status || undefined });

  const tableData = data?.data || [];

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
      render: (row) => row.lineCount || 0,
    },
    {
      key: 'baseQty',
      header: 'Base Qty',
      width: '100px',
      render: (row) => `${row.baseQty} ${row.uom}`,
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (row) => row.effectiveFrom
        ? new Date(row.effectiveFrom).toLocaleDateString()
        : '-',
    },
    {
      key: 'effectiveTo',
      header: 'Effective To',
      render: (row) => row.effectiveTo
        ? new Date(row.effectiveTo).toLocaleDateString()
        : '-',
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
  } = useColumnVisibility(allColumns, { storageKey: 'boms', alwaysVisible: ['itemSku'] });

  const handleRowClick = (row: BomWithMeta) => {
    router.push(`/manufacturing/boms/${row.id}`);
  };

  const handleExport = () => {
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
    exportToCSV(tableData, exportColumns, generateExportFilename('boms'));
  };

  const totalBoms = data?.meta?.total || 0;
  const draftCount = tableData.filter(b => b.status === 'DRAFT').length;
  const pendingCount = tableData.filter(b => b.status === 'PENDING_APPROVAL').length;
  const approvedCount = tableData.filter(b => b.status === 'APPROVED').length;

  return (
    <ListPageTemplate
      title="Bills of Materials"
      subtitle="Manage product recipes and components"
      headerActions={
        <Link href="/manufacturing/boms/new">
          <Button>
            <PlusIcon />
            New BOM
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total BOMs',
          value: totalBoms,
          icon: <ListIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Draft',
          value: draftCount,
          icon: <PencilIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Pending Approval',
          value: pendingCount,
          icon: <ClockIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Approved',
          value: approvedCount,
          icon: <CheckIcon />,
          iconColor: 'green',
        },
      ]}
      filters={
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as BomStatus | '')}
          options={STATUS_OPTIONS}
          className="max-w-xs"
        />
      }
      filterActions={
        <div className="flex gap-2 print:hidden">
          <Link href="/manufacturing/boms/compare">
            <Button variant="secondary" size="sm">
              <CompareIcon />
              Compare BOMs
            </Button>
          </Link>
          <ExportActions onExport={handleExport} />
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
      <DataTable
        columns={visibleColumns}
        data={tableData}
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
        onRowClick={handleRowClick}
        emptyState={{
          icon: <BomIcon />,
          title: 'No BOMs found',
          description: status ? 'No BOMs match the selected filter' : 'Create your first Bill of Materials',
          action: !status && (
            <Link href="/manufacturing/boms/new">
              <Button>Create BOM</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
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
