'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { ColumnToggle } from '@/components/ui/column-toggle';
import { ListPageTemplate } from '@/components/templates';
import { useRoutings, useQueryParams } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import type { Routing, RoutingStatus } from '@nerva/shared';

type RoutingWithMeta = Routing & { itemSku?: string; itemDescription?: string; operationCount?: number };

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'OBSOLETE', label: 'Obsolete' },
];

export default function RoutingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<RoutingStatus | ''>('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useRoutings({ ...params, status: status || undefined });

  const tableData = data?.data || [];

  const allColumns: Column<RoutingWithMeta>[] = useMemo(() => [
    {
      key: 'itemSku',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-primary-600">{row.itemSku || '-'}</div>
          {row.itemDescription && (
            <div className="text-sm text-slate-500 truncate max-w-[200px]">{row.itemDescription}</div>
          )}
        </div>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      width: '100px',
      render: (row) => (
        <span className="font-medium">V{row.version}</span>
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
      key: 'operationCount',
      header: 'Operations',
      width: '100px',
      render: (row) => row.operationCount || 0,
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (row) => row.effectiveFrom
        ? new Date(row.effectiveFrom).toLocaleDateString()
        : '-',
    },
    {
      key: 'effectiveTo',
      header: 'Effective To',
      render: (row) => row.effectiveTo
        ? new Date(row.effectiveTo).toLocaleDateString()
        : '-',
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
  } = useColumnVisibility(allColumns, { storageKey: 'routings', alwaysVisible: ['itemSku'] });

  const handleRowClick = (row: RoutingWithMeta) => {
    router.push(`/manufacturing/routings/${row.id}`);
  };

  const totalRoutings = data?.meta?.total || 0;
  const draftCount = tableData.filter(r => r.status === 'DRAFT').length;
  const approvedCount = tableData.filter(r => r.status === 'APPROVED').length;

  return (
    <ListPageTemplate
      title="Routings"
      subtitle="Manage production sequences and operations"
      headerActions={
        <Link href="/manufacturing/routings/new">
          <Button>
            <PlusIcon />
            New Routing
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total Routings',
          value: totalRoutings,
          icon: <RouteIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Draft',
          value: draftCount,
          icon: <PencilIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Approved',
          value: approvedCount,
          icon: <CheckIcon />,
          iconColor: 'green',
        },
      ]}
      filters={
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as RoutingStatus | '')}
          options={STATUS_OPTIONS}
          className="max-w-xs"
        />
      }
      filterActions={
        <ColumnToggle
          columns={allColumns}
          visibleKeys={visibleKeys}
          onToggle={toggleColumn}
          onReset={resetColumns}
          alwaysVisible={['itemSku']}
        />
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
          icon: <RoutingIcon />,
          title: 'No routings found',
          description: status ? 'No routings match the selected filter' : 'Create your first routing',
          action: !status && (
            <Link href="/manufacturing/routings/new">
              <Button>Create Routing</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: RoutingStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'OBSOLETE':
      return 'danger';
    case 'DRAFT':
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

function RouteIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
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

function RoutingIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
