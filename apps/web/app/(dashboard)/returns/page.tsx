'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ListPageTemplate } from '@/components/templates';
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
  const totalRmas = data?.meta?.total || 0;

  return (
    <ListPageTemplate
      title="Returns"
      subtitle="Manage RMAs and customer returns"
      headerActions={
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
      }
      stats={[
        {
          title: 'Open RMAs',
          value: openRmas,
          icon: <FolderOpenIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Awaiting Inspection',
          value: awaitingInspection,
          icon: <SearchIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Credit Pending',
          value: pendingCredit,
          icon: <CreditLgIcon />,
          iconColor: 'orange',
          alert: pendingCredit > 0,
        },
        {
          title: 'Total RMAs',
          value: totalRmas,
          icon: <RefreshIcon />,
          iconColor: 'gray',
        },
      ]}
      statsColumns={4}
      filters={
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as RmaStatus | '')}
          options={STATUS_OPTIONS}
          className="max-w-xs"
        />
      }
    >
      <DataTable
        columns={columns}
        data={data?.data || []}
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
    </ListPageTemplate>
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

// Button icons
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

// Stat card icons
function FolderOpenIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
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

function CreditLgIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

// Empty state icon
function ReturnIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}
