'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportActions } from '@/components/ui/export-actions';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useCreditNotes, useQueryParams, CreditNote } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import { exportToCSV, generateExportFilename, formatDateForExport, formatCurrencyForExport } from '@/lib/utils/export';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function CreditNotesPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useCreditNotes({
    ...params,
    status: status || undefined,
  });

  // Client-side search filtering since backend may not support it
  const tableData = useMemo(() => {
    let filtered = data?.data || [];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c =>
        c.creditNoteNo.toLowerCase().includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.rmaNo && c.rmaNo.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [data?.data, search]);

  const allColumns: Column<CreditNote>[] = useMemo(() => [
    {
      key: 'creditNoteNo',
      header: 'Credit Note No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.creditNoteNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'rmaNo',
      header: 'RMA',
      render: (row) => row.rmaNo || row.rmaId.slice(0, 8),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => row.customerName || row.customerId.slice(0, 8),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">
          {row.currency} {Number(row.amount).toFixed(2)}
        </span>
      ),
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
  } = useColumnVisibility(allColumns, { storageKey: 'credit-notes', alwaysVisible: ['creditNoteNo'] });

  const handleRowClick = (row: CreditNote) => {
    router.push(`/returns/credit-notes/${row.id}`);
  };

  const handleExport = () => {
    const exportColumns = [
      { key: 'creditNoteNo', header: 'Credit Note No.' },
      { key: 'status', header: 'Status', getValue: (row: CreditNote) => row.status?.replace(/_/g, ' ') },
      { key: 'rmaNo', header: 'RMA', getValue: (row: CreditNote) => row.rmaNo || row.rmaId.slice(0, 8) },
      { key: 'customerName', header: 'Customer', getValue: (row: CreditNote) => row.customerName || row.customerId.slice(0, 8) },
      { key: 'currency', header: 'Currency' },
      { key: 'amount', header: 'Amount', getValue: (row: CreditNote) => formatCurrencyForExport(row.amount) },
      { key: 'createdAt', header: 'Created', getValue: (row: CreditNote) => formatDateForExport(row.createdAt) },
    ];

    exportToCSV(tableData, exportColumns, generateExportFilename('credit-notes'));
  };

  const allData = data?.data || [];
  const pendingApproval = allData.filter(c => c.status === 'PENDING_APPROVAL').length;
  const approved = allData.filter(c => c.status === 'APPROVED').length;
  const totalAmount = allData.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <ListPageTemplate
      title="Credit Notes"
      subtitle="Manage customer credit notes from returns"
      headerActions={
        <Link href="/returns">
          <Button variant="secondary">
            <ArrowLeftIcon />
            Back to RMAs
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Pending Approval',
          value: pendingApproval,
          icon: <ClockIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Approved',
          value: approved,
          icon: <CheckIcon />,
          iconColor: 'green',
        },
        {
          title: 'Total Value',
          value: `R ${totalAmount.toFixed(2)}`,
          icon: <CurrencyIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Total Credit Notes',
          value: data?.meta?.total || 0,
          icon: <CreditLgIcon />,
          iconColor: 'purple',
        },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search credit note, customer, RMA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
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
            alwaysVisible={['creditNoteNo']}
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
        onRowClick={handleRowClick}
        emptyState={{
          icon: <CreditIcon />,
          title: 'No credit notes found',
          description: status || search
            ? 'No credit notes match the selected filters'
            : 'Credit notes are created from completed RMAs',
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'POSTED': return 'success';
    case 'APPROVED': return 'info';
    case 'PENDING_APPROVAL': return 'warning';
    case 'DRAFT': return 'default';
    case 'CANCELLED': return 'danger';
    default: return 'default';
  }
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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

function CurrencyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CreditLgIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}
