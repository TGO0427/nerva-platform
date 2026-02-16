'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { ExportActions } from '@/components/ui/export-actions';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { useInvoices, useInvoiceStats, useQueryParams, Invoice } from '@/lib/queries';
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
  const [status, setStatus] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useInvoices({
    ...params,
    status: status || undefined,
  });

  const { data: stats } = useInvoiceStats();

  const safeStats = stats || {
    outstandingCount: 0,
    outstandingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
    totalThisMonth: 0,
  };

  const columns: Column<Invoice>[] = [
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
  ];

  const handleRowClick = (row: Invoice) => {
    router.push(`/finance/invoices/${row.id}`);
  };

  const handleExport = () => {
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

    exportToCSV(data?.data || [], exportColumns, generateExportFilename('invoices'));
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage customer invoices and payments</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <ExportActions onExport={handleExport} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Outstanding"
          value={safeStats.outstandingCount}
          subtitle={formatAmount(safeStats.outstandingAmount)}
          iconColor="blue"
        />
        <StatCard
          title="Overdue"
          value={safeStats.overdueCount}
          subtitle={formatAmount(safeStats.overdueAmount)}
          subtitleType="negative"
          iconColor="red"
          alert={safeStats.overdueCount > 0}
        />
        <StatCard
          title="Paid This Month"
          value={formatAmount(safeStats.paidThisMonth)}
          iconColor="green"
        />
        <StatCard
          title="Total This Month"
          value={formatAmount(safeStats.totalThisMonth)}
          iconColor="purple"
        />
      </div>

      <div className="mb-4">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
          className="max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        keyField="id"
        isLoading={isLoading}
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
          description: status
            ? 'No invoices match the selected filter'
            : 'Invoices will appear here once created from sales orders',
        }}
      />
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'SENT':
      return 'warning';
    case 'PAID':
      return 'success';
    case 'PARTIALLY_PAID':
      return 'info';
    case 'OVERDUE':
      return 'danger';
    case 'CANCELLED':
      return 'default';
    case 'VOID':
      return 'default';
    default:
      return 'default';
  }
}

function InvoiceIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
