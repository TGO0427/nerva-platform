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
import { useWorkstations, useQueryParams } from '@/lib/queries';
import { useColumnVisibility } from '@/lib/hooks';
import type { Workstation, WorkstationStatus } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export default function WorkstationsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<WorkstationStatus | ''>('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useWorkstations({ ...params, status: status || undefined });

  const tableData = data?.data || [];

  const allColumns: Column<Workstation>[] = useMemo(() => [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => row.name,
    },
    {
      key: 'workstationType',
      header: 'Type',
      width: '120px',
      render: (row) => (
        <Badge variant="default">
          {row.workstationType}
        </Badge>
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
      key: 'capacityPerHour',
      header: 'Capacity/Hr',
      width: '100px',
      render: (row) => row.capacityPerHour?.toLocaleString() || '-',
    },
    {
      key: 'costPerHour',
      header: 'Cost/Hr',
      width: '100px',
      render: (row) => row.costPerHour ? `$${row.costPerHour.toFixed(2)}` : '-',
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => row.description || '-',
    },
  ], []);

  const {
    visibleKeys,
    visibleColumns,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useColumnVisibility(allColumns, { storageKey: 'workstations', alwaysVisible: ['code'] });

  const handleRowClick = (row: Workstation) => {
    router.push(`/manufacturing/workstations/${row.id}`);
  };

  const totalWorkstations = data?.meta?.total || 0;
  const activeCount = tableData.filter(w => w.status === 'ACTIVE').length;
  const maintenanceCount = tableData.filter(w => w.status === 'MAINTENANCE').length;

  return (
    <ListPageTemplate
      title="Workstations"
      subtitle="Manage machines and work centers"
      headerActions={
        <Link href="/manufacturing/workstations/new">
          <Button>
            <PlusIcon />
            New Workstation
          </Button>
        </Link>
      }
      stats={[
        {
          title: 'Total',
          value: totalWorkstations,
          icon: <FactoryIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Active',
          value: activeCount,
          icon: <CheckIcon />,
          iconColor: 'green',
        },
        {
          title: 'Maintenance',
          value: maintenanceCount,
          icon: <WrenchIcon />,
          iconColor: 'yellow',
        },
      ]}
      filters={
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as WorkstationStatus | '')}
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
          alwaysVisible={['code']}
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
          icon: <WorkstationIcon />,
          title: 'No workstations found',
          description: status ? 'No workstations match the selected filter' : 'Create your first workstation',
          action: !status && (
            <Link href="/manufacturing/workstations/new">
              <Button>Create Workstation</Button>
            </Link>
          ),
        }}
      />
    </ListPageTemplate>
  );
}

function getStatusVariant(status: WorkstationStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'MAINTENANCE':
      return 'warning';
    case 'INACTIVE':
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

function FactoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
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

function WrenchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
    </svg>
  );
}

function WorkstationIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}
