'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useProductionLedger, useQueryParams } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import type { ProductionLedgerEntry } from '@nerva/shared';

type LedgerEntryWithMeta = ProductionLedgerEntry & {
  itemSku?: string;
  itemDescription?: string;
  workOrderNo?: string;
  operatorName?: string;
  warehouseName?: string;
  binCode?: string;
};

const ENTRY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'MATERIAL_ISSUE', label: 'Material Issue' },
  { value: 'MATERIAL_RETURN', label: 'Material Return' },
  { value: 'PRODUCTION_OUTPUT', label: 'Production Output' },
  { value: 'SCRAP', label: 'Scrap' },
  { value: 'REWORK', label: 'Rework' },
];

export default function ProductionLedgerPage() {
  const [entryType, setEntryType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useProductionLedger({
    ...params,
    entryType: entryType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const tableData = data?.data || [];

  const allColumns: Column<LedgerEntryWithMeta>[] = useMemo(() => [
    {
      key: 'createdAt',
      header: 'Date/Time',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'entryType',
      header: 'Type',
      width: '140px',
      render: (row) => (
        <Badge variant={getTypeVariant(row.entryType)}>
          {formatEntryType(row.entryType)}
        </Badge>
      ),
    },
    {
      key: 'workOrderNo',
      header: 'Work Order',
      render: (row) => (
        <span className="font-medium text-primary-600">{row.workOrderNo || '-'}</span>
      ),
    },
    {
      key: 'itemSku',
      header: 'Item',
      render: (row) => (
        <div>
          <div className="font-medium">{row.itemSku || '-'}</div>
          {row.itemDescription && (
            <div className="text-sm text-gray-500 truncate max-w-[150px]">{row.itemDescription}</div>
          )}
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Quantity',
      width: '100px',
      render: (row) => (
        <span className={row.qty < 0 ? 'text-red-600' : 'text-green-600'}>
          {row.qty > 0 ? '+' : ''}{row.qty.toLocaleString()} {row.uom}
        </span>
      ),
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      render: (row) => row.warehouseName || '-',
    },
    {
      key: 'binCode',
      header: 'Bin',
      render: (row) => row.binCode || '-',
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
    {
      key: 'operatorName',
      header: 'Operator',
      render: (row) => row.operatorName || '-',
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row) => row.notes || '-',
    },
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'production-ledger', alwaysVisible: ['createdAt', 'entryType'] });

  const handleExport = () => {
    const exportColumns = [
      { key: 'createdAt', header: 'Date/Time', getValue: (row: LedgerEntryWithMeta) => formatDateForExport(row.createdAt) },
      { key: 'entryType', header: 'Type', getValue: (row: LedgerEntryWithMeta) => formatEntryType(row.entryType) },
      { key: 'workOrderNo', header: 'Work Order' },
      { key: 'itemSku', header: 'Item SKU' },
      { key: 'itemDescription', header: 'Item Description' },
      { key: 'qty', header: 'Quantity' },
      { key: 'uom', header: 'UOM' },
      { key: 'warehouseName', header: 'Warehouse' },
      { key: 'binCode', header: 'Bin' },
      { key: 'batchNo', header: 'Batch' },
      { key: 'operatorName', header: 'Operator' },
      { key: 'notes', header: 'Notes' },
    ];

    exportToCSV(tableData, exportColumns, generateExportFilename('production-ledger'));
  };

  // Calculate summary stats
  const materialIssues = tableData.filter(e => e.entryType === 'MATERIAL_ISSUE').length;
  const productionOutputs = tableData.filter(e => e.entryType === 'PRODUCTION_OUTPUT').length;
  const scrapEntries = tableData.filter(e => e.entryType === 'SCRAP').length;

  return (
    <ListPageTemplate
      title="Production Ledger"
      subtitle="View production history and transactions"
      stats={[
        {
          title: 'Total Entries',
          value: data?.meta?.total || 0,
          icon: <LedgerIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Material Issues',
          value: materialIssues,
          icon: <ArrowDownIcon />,
          iconColor: 'red',
        },
        {
          title: 'Production Output',
          value: productionOutputs,
          icon: <ArrowUpIcon />,
          iconColor: 'green',
        },
        {
          title: 'Scrap',
          value: scrapEntries,
          icon: <TrashIcon />,
          iconColor: 'yellow',
        },
      ]}
      filters={
        <div className="flex flex-wrap gap-4">
          <Select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value)}
            options={ENTRY_TYPE_OPTIONS}
            className="w-48"
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
              placeholder="Start date"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
              placeholder="End date"
            />
          </div>
        </div>
      }
      filterActions={
        <div className="flex gap-2">
          <ColumnToggle
            columns={allColumns}
            visibleKeys={visibleKeys}
            onToggle={toggleColumn}
            onReset={resetColumns}
            alwaysVisible={['createdAt', 'entryType']}
          />
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <DownloadIcon />
            Export
          </Button>
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
        emptyState={{
          icon: <EmptyLedgerIcon />,
          title: 'No ledger entries found',
          description: entryType || startDate || endDate
            ? 'No entries match the selected filters'
            : 'Production ledger entries will appear here as work orders are processed',
        }}
      />
    </ListPageTemplate>
  );
}

function getTypeVariant(type: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (type) {
    case 'PRODUCTION_OUTPUT':
      return 'success';
    case 'MATERIAL_ISSUE':
      return 'info';
    case 'MATERIAL_RETURN':
      return 'warning';
    case 'SCRAP':
      return 'danger';
    default:
      return 'default';
  }
}

function formatEntryType(type: string): string {
  return type?.replace(/_/g, ' ') || type || '';
}

function LedgerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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

function EmptyLedgerIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
