'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { PageShell, MetricGrid } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
  useTrips,
  useCreateTrip,
  useQueryParams,
  Trip,
  useReadyForDispatchShipments,
  Shipment,
} from '@/lib/queries';
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

type Tab = 'trips' | 'ready-shipments';

export default function DispatchPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('trips');
  const [status, setStatus] = useState<TripStatus | ''>('');
  const [date, setDate] = useState('');
  const [selectedShipments, setSelectedShipments] = useState<Set<string>>(new Set());
  const [plannedDate, setPlannedDate] = useState('');
  const [error, setError] = useState('');
  const { params, setPage } = useQueryParams();

  const { data: tripsData, isLoading: tripsLoading } = useTrips({
    ...params,
    status: status || undefined,
    date: date || undefined,
  });

  const { data: readyShipments, isLoading: shipmentsLoading } = useReadyForDispatchShipments();
  const createTrip = useCreateTrip();

  const tripColumns: Column<Trip>[] = [
    {
      key: 'tripNo',
      header: 'Trip No.',
      sortable: true,
      render: (row) => (
        <Link href={`/dispatch/${row.id}`} className="font-medium text-primary-600 hover:underline">
          {row.tripNo}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      render: (row) => (
        <Badge variant={getTripStatusVariant(row.status)}>{row.status?.replace(/_/g, ' ') || row.status}</Badge>
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
  ];

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={readyShipments && readyShipments.length > 0 && selectedShipments.size === readyShipments.length}
          onChange={(e) => {
            if (e.target.checked && readyShipments) {
              setSelectedShipments(new Set(readyShipments.map(s => s.id)));
            } else {
              setSelectedShipments(new Set());
            }
          }}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
      width: '50px',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedShipments.has(row.id)}
          onChange={(e) => {
            const newSelected = new Set(selectedShipments);
            if (e.target.checked) {
              newSelected.add(row.id);
            } else {
              newSelected.delete(row.id);
            }
            setSelectedShipments(newSelected);
          }}
          className="h-4 w-4 rounded border-gray-300"
        />
      ),
    },
    {
      key: 'shipmentNo',
      header: 'Shipment No.',
      render: (row) => (
        <Link href={`/fulfilment/shipments/${row.id}`} className="font-medium text-primary-600 hover:underline">
          {row.shipmentNo}
        </Link>
      ),
    },
    {
      key: 'orderNo',
      header: 'Order',
      render: (row) => row.orderNo || row.salesOrderId.slice(0, 8),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant="warning">{row.status?.replace(/_/g, ' ') || row.status}</Badge>
      ),
    },
    {
      key: 'totalWeightKg',
      header: 'Weight',
      render: (row) => `${row.totalWeightKg} kg`,
    },
    {
      key: 'carrier',
      header: 'Carrier',
      render: (row) => row.carrier || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleRowClick = (row: Trip) => {
    router.push(`/dispatch/${row.id}`);
  };

  const handleCreateTrip = async () => {
    if (selectedShipments.size === 0) {
      setError('Please select at least one shipment');
      return;
    }

    setError('');
    try {
      const trip = await createTrip.mutateAsync({
        shipmentIds: Array.from(selectedShipments),
        plannedDate: plannedDate || undefined,
      });
      setSelectedShipments(new Set());
      setPlannedDate('');
      router.push(`/dispatch/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    }
  };

  // Stats
  const readyCount = readyShipments?.length || 0;
  const plannedTrips = tripsData?.data?.filter(t => t.status === 'PLANNED').length || 0;
  const inProgressTrips = tripsData?.data?.filter(t => t.status === 'IN_PROGRESS').length || 0;
  const completedToday = tripsData?.data?.filter(t => t.status === 'COMPLETE').length || 0;
  const totalTrips = tripsData?.meta?.total || 0;

  // Calculate total weight of selected shipments
  const selectedWeight = useMemo(() => {
    if (!readyShipments) return 0;
    return readyShipments
      .filter(s => selectedShipments.has(s.id))
      .reduce((sum, s) => sum + (s.totalWeightKg || 0), 0);
  }, [readyShipments, selectedShipments]);

  return (
    <PageShell>
      <PageHeader
        title="Dispatch"
        subtitle="Manage delivery trips and routes"
      />

      {/* Quick stats */}
      <MetricGrid className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Ready for Dispatch"
          value={readyCount}
          icon={<PackageSmIcon />}
          iconColor="orange"
          alert={readyCount > 0}
        />
        <StatCard
          title="Planned Trips"
          value={plannedTrips}
          icon={<CalendarIcon />}
          iconColor="blue"
        />
        <StatCard
          title="In Progress"
          value={inProgressTrips}
          icon={<PlayIcon />}
          iconColor="yellow"
        />
        <StatCard
          title="Completed Today"
          value={completedToday}
          icon={<CheckIcon />}
          iconColor="green"
        />
        <StatCard
          title="Total Trips"
          value={totalTrips}
          icon={<TruckSmIcon />}
          iconColor="gray"
        />
      </MetricGrid>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('trips')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trips'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Trips
          </button>
          <button
            onClick={() => setActiveTab('ready-shipments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'ready-shipments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ready for Dispatch
            {readyCount > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {readyCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {activeTab === 'trips' && (
        <>
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
            columns={tripColumns}
            data={tripsData?.data || []}
            keyField="id"
            isLoading={tripsLoading}
            pagination={tripsData?.meta ? {
              page: tripsData.meta.page,
              limit: tripsData.meta.limit,
              total: tripsData.meta.total || 0,
              totalPages: tripsData.meta.totalPages || 1,
            } : undefined}
            onPageChange={setPage}
            onRowClick={handleRowClick}
            emptyState={{
              icon: <TruckIcon />,
              title: 'No trips found',
              description: status || date
                ? 'No trips match the selected filters'
                : 'Create a trip from ready shipments to get started',
            }}
          />
        </>
      )}

      {activeTab === 'ready-shipments' && (
        <>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Create Trip Panel */}
          {selectedShipments.size > 0 && (
            <Card className="mb-4 border-primary-200 bg-primary-50">
              <CardHeader>
                <CardTitle className="text-lg">Create Trip</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selected Shipments
                    </label>
                    <div className="text-2xl font-bold text-primary-600">
                      {selectedShipments.size}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Weight
                    </label>
                    <div className="text-lg font-medium">
                      {selectedWeight.toFixed(1)} kg
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Planned Date
                    </label>
                    <Input
                      type="date"
                      value={plannedDate}
                      onChange={(e) => setPlannedDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleCreateTrip}
                    isLoading={createTrip.isPending}
                  >
                    <PlusIcon />
                    Create Trip
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedShipments(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {shipmentsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : readyShipments && readyShipments.length > 0 ? (
            <DataTable
              columns={shipmentColumns}
              data={readyShipments}
              keyField="id"
              emptyState={{
                title: 'No shipments ready',
                description: 'Shipments will appear here when marked ready for dispatch',
              }}
            />
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <PackageIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No shipments ready for dispatch</h3>
              <p className="text-gray-500 mt-1">
                Shipments will appear here when marked as "Ready for Dispatch" in the fulfilment module
              </p>
              <Link href="/fulfilment">
                <Button variant="secondary" className="mt-4">
                  Go to Fulfilment
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

function getTripStatusVariant(status: TripStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
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

// Stat card icons (small)
function PackageSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
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

function TruckSmIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

// Empty state icons (large)
function TruckIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
