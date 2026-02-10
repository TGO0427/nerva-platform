'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { useCreditNotes, useQueryParams, CreditNote } from '@/lib/queries';

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
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useCreditNotes({
    ...params,
    status: status || undefined,
  });

  const columns: Column<CreditNote>[] = [
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
          {row.currency} {row.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleRowClick = (row: CreditNote) => {
    router.push(`/returns/credit-notes/${row.id}`);
  };

  // Stats
  const pendingApproval = data?.data?.filter(c => c.status === 'PENDING_APPROVAL').length || 0;
  const approved = data?.data?.filter(c => c.status === 'APPROVED').length || 0;
  const totalAmount = data?.data?.reduce((sum, c) => sum + c.amount, 0) || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Credit Notes</h1>
          <p className="text-slate-500 mt-1">Manage customer credit notes from returns</p>
        </div>
        <Link href="/returns">
          <Button variant="secondary">
            <ArrowLeftIcon />
            Back to RMAs
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingApproval}</div>
            <p className="text-sm text-slate-500">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{approved}</div>
            <p className="text-sm text-slate-500">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">${totalAmount.toFixed(2)}</div>
            <p className="text-sm text-slate-500">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{data?.meta?.total || 0}</div>
            <p className="text-sm text-slate-500">Total Credit Notes</p>
          </CardContent>
        </Card>
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
          icon: <CreditIcon />,
          title: 'No credit notes found',
          description: status
            ? 'No credit notes match the selected filter'
            : 'Credit notes are created from completed RMAs',
        }}
      />
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'POSTED':
      return 'success';
    case 'APPROVED':
      return 'info';
    case 'PENDING_APPROVAL':
      return 'warning';
    case 'DRAFT':
      return 'default';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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
