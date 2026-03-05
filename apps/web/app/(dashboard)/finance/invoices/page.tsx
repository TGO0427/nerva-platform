'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ExportActions } from '@/components/ui/export-actions';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useInvoices, useInvoiceStats, useCancelInvoice, useQueryParams, Invoice } from '@/lib/queries';
import { useTableSelection, useColumnVisibility } from '@/lib/hooks';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { exportToCSV, generateExportFilename, formatDateForExport, formatCurrencyForExport } from '@/lib/utils/export';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'VOID', label: 'Void' },
];

function formatAmount(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const cancelInvoice = useCancelInvoice();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useInvoices({
    ...params,
    status: status || undefined,
    search: search || undefined,
  });

  const { data: stats } = useInvoiceStats();

  const tableData = data?.data || [];

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggle,
    togglePage,
    clearSelection,
  } = useTableSelection(tableData);

  const safeStats = stats || {
    outstandingCount: 0,
    outstandingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
    totalThisMonth: 0,
  };

  const allColumns: Column<Invoice>[] = useMemo(() => [
    {
      key: 'invoiceNo',
      header: 'Invoice No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.invoiceNo}</span>
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
      key: 'customerName',
      header: 'Customer',
      render: (row) => row.customerName || row.customerId.slice(0, 8),
    },
    {
      key: 'orderNo',
      header: 'Order Ref',
      render: (row) => row.orderNo || '-',
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      className: 'text-right',
      render: (row) => (
        <span className="font-medium">{formatAmount(row.totalAmount)}</span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row) =>
        row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-',
    },
    {
      key: 'amountPaid',
      header: 'Paid',
      className: 'text-right',
      render: (row) => (
        <span>{formatAmount(row.amountPaid)}</span>
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
  } = useColumnVisibility(allColumns, { storageKey: 'invoices', alwaysVisible: ['invoiceNo'] });

  const handleRowClick = (row: Invoice) => {
    router.push(`/finance/invoices/${row.id}`);
  };

  const handleExport = () => {
    const exportData = selectedCount > 0
      ? tableData.filter(row => selectedIds.has(row.id))
      : tableData;

    const exportColumns = [
      { key: 'invoiceNo', header: 'Invoice No.' },
      { key: 'status', header: 'Status', getValue: (row: Invoice) => row.status?.replace(/_/g, ' ') },
      { key: 'customerName', header: 'Customer', getValue: (row: Invoice) => row.customerName || row.customerId.slice(0, 8) },
      { key: 'orderNo', header: 'Order Ref', getValue: (row: Invoice) => row.orderNo || '' },
      { key: 'currency', header: 'Currency' },
      { key: 'totalAmount', header: 'Amount', getValue: (row: Invoice) => formatCurrencyForExport(row.totalAmount) },
      { key: 'dueDate', header: 'Due Date', getValue: (row: Invoice) => formatDateForExport(row.dueDate) },
      { key: 'amountPaid', header: 'Paid', getValue: (row: Invoice) => formatCurrencyForExport(row.amountPaid) },
      { key: 'createdAt', header: 'Created', getValue: (row: Invoice) => formatDateForExport(row.createdAt) },
    ];

    exportToCSV(exportData, exportColumns, generateExportFilename('invoices'));
  };

  const handleBulkCancel = async () => {
    const cancellable = tableData.filter(r => selectedIds.has(r.id) && r.status === 'DRAFT');
    if (cancellable.length === 0) {
      addToast('No selected invoices can be cancelled (must be Draft)', 'error');
      return;
    }
    const confirmed = await confirm({
      title: 'Cancel Invoices',
      message: `Cancel ${cancellable.length} draft invoice(s)? This cannot be undone.`,
      confirmLabel: 'Cancel Invoices',
      variant: 'danger',
    });
    if (!confirmed) return;
    let count = 0;
    for (const inv of cancellable) {
      try {
        await cancelInvoice.mutateAsync(inv.id);
        count++;
      } catch { /* skip failures */ }
    }
    addToast(`${count} invoice(s) cancelled`, 'success');
    clearSelection();
  };

  return (
    <ListPageTemplate
      title="Invoices"
      subtitle="Manage customer invoices and payments"
      stats={[
        {
          title: 'Outstanding',
          value: safeStats.outstandingCount,
          subtitle: formatAmount(safeStats.outstandingAmount),
          icon: <InvoiceSmIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Overdue',
          value: safeStats.overdueCount,
          subtitle: formatAmount(safeStats.overdueAmount),
          subtitleType: 'negative',
          icon: <AlertIcon />,
          iconColor: 'red',
          alert: safeStats.overdueCount > 0,
        },
        {
          title: 'Paid This Month',
          value: formatAmount(safeStats.paidThisMonth),
          icon: <CheckIcon />,
          iconColor: 'green',
        },
        {
          title: 'Total This Month',
          value: formatAmount(safeStats.totalThisMonth),
          icon: <ChartIcon />,
          iconColor: 'purple',
        },
      ]}
      filters={
        <div className="flex gap-2">
          <Input
            placeholder="Search invoice no. or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
            alwaysVisible={['invoiceNo']}
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
          <Button variant="danger" size="sm" onClick={handleBulkCancel}>
            Cancel Selected
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
          icon: <InvoiceIcon />,
          title: 'No invoices found',
          description: status || search
            ? 'No invoices match the selected filters'
            : 'Invoices will appear here once created from sales orders',
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DRAFT': return 'default';
    case 'SENT': return 'warning';
    case 'PAID': return 'success';
    case 'PARTIALLY_PAID': return 'info';
    case 'OVERDUE': return 'danger';
    case 'CANCELLED': return 'default';
    case 'VOID': return 'default';
    default: return 'default';
  }
}

function InvoiceSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
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

function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
