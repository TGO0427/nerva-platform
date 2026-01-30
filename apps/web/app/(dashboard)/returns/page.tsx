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
import { useRmas, useQueryParams, Rma } from '@/lib/queries';
import type { RmaStatus } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'AWAITING_RETURN', label: 'Awaiting Return' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'INSPECTING', label: 'Inspecting' },
  { value: 'DISPOSITION_COMPLETE', label: 'Disposition Complete' },
  { value: 'CREDIT_PENDING', label: 'Credit Pending' },
  { value: 'CREDIT_APPROVED', label: 'Credit Approved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ReturnsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<RmaStatus | ''>('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useRmas({
    ...params,
    status: status || undefined,
  });

  const columns: Column<Rma>[] = [
    {
      key: 'rmaNo',
      header: 'RMA No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.rmaNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '160px',
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
      key: 'returnType',
      header: 'Type',
      width: '100px',
      render: (row) => (
        <Badge variant="default">{row.returnType}</Badge>
      ),
    },
    {
      key: 'orderNo',
      header: 'Order',
      render: (row) => row.orderNo || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleRowClick = (row: Rma) => {
    router.push(`/returns/${row.id}`);
  };

  // Stats
  const openRmas = data?.data?.filter(r => ['OPEN', 'AWAITING_RETURN'].includes(r.status)).length || 0;
  const awaitingInspection = data?.data?.filter(r => ['RECEIVED', 'INSPECTING'].includes(r.status)).length || 0;
  const pendingCredit = data?.data?.filter(r => ['CREDIT_PENDING'].includes(r.status)).length || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
          <p className="text-gray-500 mt-1">Manage RMAs and customer returns</p>
        </div>
        <div className="flex gap-2">
          <Link href="/returns/credit-notes">
            <Button variant="secondary">
              <CreditIcon />
              Credit Notes
            </Button>
          </Link>
          <Link href="/returns/new">
            <Button>
              <PlusIcon />
              New RMA
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{openRmas}</div>
            <p className="text-sm text-gray-500">Open RMAs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{awaitingInspection}</div>
            <p className="text-sm text-gray-500">Awaiting Inspection</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{pendingCredit}</div>
            <p className="text-sm text-gray-500">Credit Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{data?.meta?.total || 0}</div>
            <p className="text-sm text-gray-500">Total RMAs</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as RmaStatus | '')}
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
          icon: <ReturnIcon />,
          title: 'No RMAs found',
          description: status
            ? 'No RMAs match the selected filter'
            : 'Create an RMA to process customer returns',
          action: !status && (
            <Link href="/returns/new">
              <Button>Create RMA</Button>
            </Link>
          ),
        }}
      />
    </div>
  );
}

function getStatusVariant(status: RmaStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'CLOSED':
    case 'CREDIT_APPROVED':
      return 'success';
    case 'INSPECTING':
    case 'DISPOSITION_COMPLETE':
    case 'CREDIT_PENDING':
      return 'warning';
    case 'OPEN':
    case 'AWAITING_RETURN':
    case 'RECEIVED':
      return 'info';
    case 'CANCELLED':
      return 'danger';
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

function CreditIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}
