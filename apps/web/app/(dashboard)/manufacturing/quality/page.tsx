'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ExportActions } from '@/components/ui/export-actions';
import { ListPageTemplate } from '@/components/templates';
import { useNonConformances, useQueryParams } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport } from '@/lib/utils/export';
import type { NonConformance, NonConformanceStatus, NcSeverity } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'CRITICAL', label: 'Critical' },
];

function getStatusVariant(status: NonConformanceStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'OPEN': return 'info';
    case 'UNDER_REVIEW': return 'warning';
    case 'RESOLVED': return 'success';
    case 'CLOSED': return 'default';
    default: return 'default';
  }
}

function getSeverityVariant(severity: NcSeverity): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (severity) {
    case 'MINOR': return 'default';
    case 'MAJOR': return 'warning';
    case 'CRITICAL': return 'danger';
    default: return 'default';
  }
}

export default function QualityPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useNonConformances({
    ...params,
    status: status || undefined,
    severity: severity || undefined,
    search: search || undefined,
  });

  const tableData = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;

  const allColumns: Column<NonConformance>[] = useMemo(() => [
    {
      key: 'ncNo',
      header: 'NC#',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.ncNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      width: '100px',
      render: (row) => (
        <Badge variant={getSeverityVariant(row.severity)}>
          {row.severity}
        </Badge>
      ),
    },
    {
      key: 'itemSku',
      header: 'Product',
      render: (row) => row.itemSku || '-',
    },
    {
      key: 'workOrderNo',
      header: 'WO#',
      render: (row) => row.workOrderNo ? (
        <Link
          href={`/manufacturing/work-orders/${row.workOrderId}`}
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.workOrderNo}
        </Link>
      ) : '-',
    },
    {
      key: 'defectType',
      header: 'Defect Type',
      render: (row) => row.defectType.replace(/_/g, ' '),
    },
    {
      key: 'qtyAffected',
      header: 'Qty Affected',
      className: 'text-right',
      width: '110px',
      render: (row) => row.qtyAffected.toLocaleString(),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'quality-ncs', alwaysVisible: ['ncNo'] });

  const handleExport = () => {
    const exportColumns = [
      { key: 'ncNo', header: 'NC#' },
      { key: 'status', header: 'Status', getValue: (r: NonConformance) => r.status.replace(/_/g, ' ') },
      { key: 'severity', header: 'Severity' },
      { key: 'itemSku', header: 'Product', getValue: (r: NonConformance) => r.itemSku || '' },
      { key: 'workOrderNo', header: 'WO#', getValue: (r: NonConformance) => r.workOrderNo || '' },
      { key: 'defectType', header: 'Defect Type', getValue: (r: NonConformance) => r.defectType.replace(/_/g, ' ') },
      { key: 'qtyAffected', header: 'Qty Affected' },
      { key: 'description', header: 'Description', getValue: (r: NonConformance) => r.description || '' },
      { key: 'createdAt', header: 'Date', getValue: (r: NonConformance) => formatDateForExport(r.createdAt) },
    ];
    exportToCSV(tableData, exportColumns, generateExportFilename('non-conformances'));
  };

  const openCount = tableData.filter(nc => nc.status === 'OPEN').length;
  const reviewCount = tableData.filter(nc => nc.status === 'UNDER_REVIEW').length;
  const criticalCount = tableData.filter(nc => nc.severity === 'CRITICAL').length;

  return (
    <ListPageTemplate
      title="Quality / Non-Conformances"
      subtitle="Track and manage product quality issues and defects"
      headerActions={
        <Link href="/manufacturing/quality/new">
          <Button>
            <PlusIcon />
            New NC
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total NCs',
          value: totalCount,
          icon: <ClipboardIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Open',
          value: openCount,
          icon: <AlertCircleIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Under Review',
          value: reviewCount,
          icon: <SearchIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Critical',
          value: criticalCount,
          icon: <ExclamationIcon />,
          iconColor: 'red',
          alert: criticalCount > 0,
        },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search NC#, description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
          <Select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            options={SEVERITY_OPTIONS}
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
            alwaysVisible={['ncNo']}
          />
          <ExportActions onExport={handleExport} />
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
        onRowClick={(nc) => router.push(`/manufacturing/quality/${nc.id}`)}
        emptyState={{
          icon: <QualityIcon />,
          title: 'No non-conformances found',
          description: status || severity || search
            ? 'No results match the selected filters'
            : 'Create your first non-conformance report',
          action: !status && !severity && !search && (
            <Link href="/manufacturing/quality/new">
              <Button>Create NC Report</Button>
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

function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function QualityIcon() {
  return (
    <svg className="h-12 w-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
