'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { useGrns, useQueryParams, Grn } from '@/lib/queries';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function GrnListPage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useGrns({ ...params, status: status || undefined });

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
      width: '120px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'warehouseId',
      header: 'Warehouse',
      render: () => 'Main Warehouse', // TODO: Fetch warehouse name
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

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receipt Notes</h1>
          <p className="text-gray-500 mt-1">Manage incoming stock receipts</p>
        </div>
        <Link href="/inventory/grn/new">
          <Button>
            <PlusIcon />
            New GRN
          </Button>
        </Link>
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
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'OPEN':
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

function ReceiveIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
