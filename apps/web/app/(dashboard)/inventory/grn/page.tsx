'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ListPageTemplate } from '@/components/templates';
import { useGrns, useQueryParams, Grn } from '@/lib/queries';
import { useWarehouses } from '@/lib/queries/warehouses';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'PUTAWAY_PENDING', label: 'Putaway Pending' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function GrnListPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useGrns({ ...params, status: status || undefined });
  const { data: warehouses } = useWarehouses();
  const warehouseMap = new Map(warehouses?.map(w => [w.id, w.name]) || []);

  const columns: Column<Grn>[] = [
    {
      key: 'grnNo',
      header: 'GRN No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.grnNo}</span>
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
      key: 'warehouseId',
      header: 'Warehouse',
      render: (row) => warehouseMap.get(row.warehouseId) || '-'
    },
    {
      key: 'supplierId',
      header: 'Supplier',
      render: (row) => row.supplierId ? 'Supplier' : '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleRowClick = (row: Grn) => {
    router.push(`/inventory/grn/${row.id}`);
  };

  // Stats
  const openGrns = data?.data?.filter(g => g.status === 'OPEN').length || 0;
  const partialGrns = data?.data?.filter(g => g.status === 'PARTIAL').length || 0;
  const pendingPutaway = data?.data?.filter(g => g.status === 'PUTAWAY_PENDING').length || 0;
  const totalGrns = data?.meta?.total || 0;

  return (
    <ListPageTemplate
      title="Goods Receipt Notes"
      subtitle="Manage incoming stock receipts"
      headerActions={
        <Link href="/inventory/grn/new">
          <Button>
            <PlusIcon />
            New GRN
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Open GRNs',
          value: openGrns,
          icon: <FolderOpenIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Partial Received',
          value: partialGrns,
          icon: <PartialIcon />,
          iconColor: 'yellow',
        },
        {
          title: 'Pending Putaway',
          value: pendingPutaway,
          icon: <PutawayIcon />,
          iconColor: 'orange',
          alert: pendingPutaway > 0,
        },
        {
          title: 'Total GRNs',
          value: totalGrns,
          icon: <ReceiveSmIcon />,
          iconColor: 'gray',
        },
      ]}
      statsColumns={4}
      filters={
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
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
          icon: <ReceiveIcon />,
          title: 'No GRNs found',
          description: status ? 'No GRNs match the selected filter' : 'Create your first GRN to start receiving stock',
          action: !status && (
            <Link href="/inventory/grn/new">
              <Button>Create GRN</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
    case 'RECEIVED':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'OPEN':
    case 'PUTAWAY_PENDING':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

// Button icon
function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function PartialIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function PutawayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function ReceiveSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

// Empty state icon
function ReceiveIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
