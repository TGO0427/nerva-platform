'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { useTrips, useQueryParams, Trip } from '@/lib/queries';
import type { TripStatus } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'LOADING', label: 'Loading' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function DispatchPage() {
  const router = useRouter();
  const [status, setStatus] = useState<TripStatus | ''>('');
  const [date, setDate] = useState('');
  const { params, setPage } = useQueryParams();

  const { data, isLoading } = useTrips({
    ...params,
    status: status || undefined,
    date: date || undefined,
  });

  const columns: Column<Trip>[] = [
    {
      key: 'tripNo',
      header: 'Trip No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.tripNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{row.status.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      key: 'driverName',
      header: 'Driver',
      render: (row) => row.driverName || '-',
    },
    {
      key: 'vehiclePlate',
      header: 'Vehicle',
      render: (row) => row.vehiclePlate || '-',
    },
    {
      key: 'totalStops',
      header: 'Stops',
      className: 'text-center',
      render: (row) => (
        <span>
          {row.completedStops || 0}/{row.totalStops}
        </span>
      ),
    },
    {
      key: 'plannedDate',
      header: 'Planned Date',
      render: (row) => row.plannedDate
        ? new Date(row.plannedDate).toLocaleDateString()
        : '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleRowClick = (row: Trip) => {
    router.push(`/dispatch/${row.id}`);
  };

  // Stats from visible data
  const plannedTrips = data?.data?.filter(t => t.status === 'PLANNED').length || 0;
  const inProgressTrips = data?.data?.filter(t => t.status === 'IN_PROGRESS').length || 0;
  const completedToday = data?.data?.filter(t => t.status === 'COMPLETE').length || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-500 mt-1">Manage delivery trips and routes</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{plannedTrips}</div>
            <p className="text-sm text-gray-500">Planned Trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{inProgressTrips}</div>
            <p className="text-sm text-gray-500">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
            <p className="text-sm text-gray-500">Completed Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{data?.meta?.total || 0}</div>
            <p className="text-sm text-gray-500">Total Trips</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as TripStatus | '')}
          options={STATUS_OPTIONS}
          className="w-48"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-48"
        />
        {(status || date) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatus('');
              setDate('');
            }}
          >
            Clear Filters
          </Button>
        )}
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
          icon: <TruckIcon />,
          title: 'No trips found',
          description: status || date
            ? 'No trips match the selected filters'
            : 'Trips will appear here when shipments are ready for dispatch',
        }}
      />
    </div>
  );
}

function getStatusVariant(status: TripStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'LOADING':
      return 'warning';
    case 'ASSIGNED':
      return 'info';
    case 'PLANNED':
      return 'default';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function TruckIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
