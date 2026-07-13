'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ListPageTemplate } from '@/components/templates';
import { useImportShipments, useQueryParams } from '@/lib/queries';
import { formatDate } from '@/lib/format';
import {
  ALL_IMPORT_SHIPMENT_STATUSES,
  STATUS_LABELS,
  DELAYED_STATUSES,
  POST_ARRIVAL_STATUSES,
} from '@nerva/shared';
import type { ImportShipmentLineRow, ImportShipmentStatus } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...ALL_IMPORT_SHIPMENT_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

export default function ImportSchedulePage() {
  const router = useRouter();
  const [status, setStatus] = useState<ImportShipmentStatus | ''>('');
  const [search, setSearch] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useImportShipments({
    ...params,
    status: status || undefined,
    search: search || undefined,
  });

  const columns: Column<ImportShipmentLineRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => <span className="font-medium text-primary-600">{row.reference}</span>,
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      render: (row) => row.supplierName || row.supplierId.slice(0, 8),
    },
    {
      key: 'productDescription',
      header: 'Product',
      render: (row) => row.productDescription,
    },
    {
      key: 'transportMode',
      header: 'Mode',
      width: '90px',
      render: (row) => row.transportMode,
    },
    {
      key: 'destinationPort',
      header: 'Destination',
      render: (row) => row.destinationPort || '—',
    },
    {
      key: 'weekStartDate',
      header: 'Week',
      sortable: true,
      render: (row) => (row.weekStartDate ? formatDate(row.weekStartDate) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      width: '160px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{STATUS_LABELS[row.status]}</Badge>
      ),
    },
  ];

  const hasActiveFilters = Boolean(search || status);

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  return (
    <ListPageTemplate
      title="Import Schedule"
      subtitle="Track inbound shipments from suppliers"
      headerActions={
        <Link href="/import-schedule/new">
          <Button>
            <PlusIcon />
            New Shipment
          </Button>
        </Link>
      }
      filters={
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search reference, supplier or product..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value as ImportShipmentStatus | ''); setPage(1); }}
            options={STATUS_OPTIONS}
            className="max-w-xs"
          />
        </div>
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
        onRowClick={(row) => router.push(`/import-schedule/${row.importShipmentId}`)}
        emptyState={{
          icon: <ShipmentIcon />,
          title: 'No shipments found',
          description: hasActiveFilters
            ? 'No shipments match the current search or filters.'
            : 'Create your first import shipment to get started.',
          action: hasActiveFilters ? (
            <Button variant="secondary" onClick={clearAllFilters}>Clear Filters</Button>
          ) : (
            <Link href="/import-schedule/new">
              <Button>Create Shipment</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: ImportShipmentStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'CANCELLED') return 'danger';
  if (DELAYED_STATUSES.includes(status)) return 'warning';
  if (POST_ARRIVAL_STATUSES.includes(status) || status === 'STORED' || status === 'ARCHIVED') return 'success';
  return 'info';
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ShipmentIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
