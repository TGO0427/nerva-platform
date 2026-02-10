'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Drawer, StopsProgress } from '@/components/ui/drawer';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useCopy } from '@/lib/hooks/use-copy';
import {
  useTrips,
  useCreateTrip,
  useStartTrip,
  useCompleteTrip,
  useQueryParams,
  Trip,
  useReadyForDispatchShipments,
  Shipment,
  useTripStops,
  TripStop,
  useDispatchActivity,
  AuditEntryWithActor,
} from '@/lib/queries';
import type { TripStatus, StopStatus } from '@nerva/shared';

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
type ViewMode = 'table' | 'board';

// Auto-refresh interval in milliseconds
const REFRESH_INTERVAL = 25000; // 25 seconds

// Consistent date formatting
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Board column config
const BOARD_COLUMNS = [
  { status: 'PLANNED' as TripStatus, label: 'Planned', color: 'bg-slate-100' },
  { status: 'ASSIGNED' as TripStatus, label: 'Assigned', color: 'bg-blue-50' },
  { status: 'IN_PROGRESS' as TripStatus, label: 'In Progress', color: 'bg-yellow-50' },
  { status: 'COMPLETE' as TripStatus, label: 'Completed', color: 'bg-green-50' },
];

export default function DispatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const { copy } = useCopy();
  const [activeTab, setActiveTab] = useState<Tab>('trips');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [status, setStatus] = useState<TripStatus | ''>('');
  const [date, setDate] = useState('');
  const [selectedShipments, setSelectedShipments] = useState<Set<string>>(new Set());
  const [plannedDate, setPlannedDate] = useState('');
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { params, setPage } = useQueryParams();

  // Trip detail drawer state
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const { data: selectedTripStops, isLoading: stopsLoading } = useTripStops(selectedTripId || undefined);

  // Read URL params on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab | null;
    const statusParam = searchParams.get('status') as TripStatus | null;
    const viewParam = searchParams.get('view') as ViewMode | null;

    if (tabParam && ['trips', 'ready-shipments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (statusParam) {
      setStatus(statusParam);
    }
    if (viewParam && ['table', 'board'].includes(viewParam)) {
      setViewMode(viewParam);
    }
  }, [searchParams]);

  const { data: tripsData, isLoading: tripsLoading, refetch: refetchTrips } = useTrips({
    ...params,
    limit: 100, // Get more for board view
    status: status || undefined,
    date: date || undefined,
  });

  const { data: readyShipments, isLoading: shipmentsLoading, refetch: refetchShipments } = useReadyForDispatchShipments();
  const { data: activityData, isLoading: activityLoading } = useDispatchActivity(12);
  const createTrip = useCreateTrip();
  const startTrip = useStartTrip();
  const completeTrip = useCompleteTrip();

  // Auto-refresh when live mode is enabled
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      refetchTrips();
      refetchShipments();
      setLastRefresh(new Date());
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isLive, refetchTrips, refetchShipments]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    refetchTrips();
    refetchShipments();
    setLastRefresh(new Date());
    addToast('Data refreshed', 'success', 1500);
  }, [refetchTrips, refetchShipments, addToast]);

  // Quick action handlers
  const handleQuickStart = async (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Start Trip',
      message: `Start trip ${trip.tripNo}? The driver will be notified.`,
      confirmLabel: 'Start',
    });
    if (confirmed) {
      try {
        await startTrip.mutateAsync(trip.id);
        addToast('Trip started', 'success');
      } catch {
        addToast('Failed to start trip', 'error');
      }
    }
  };

  const handleQuickComplete = async (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Complete Trip',
      message: `Mark trip ${trip.tripNo} as complete?`,
      confirmLabel: 'Complete',
    });
    if (confirmed) {
      try {
        await completeTrip.mutateAsync(trip.id);
        addToast('Trip completed', 'success');
      } catch {
        addToast('Failed to complete trip', 'error');
      }
    }
  };

  // Group trips by status for board view
  const tripsByStatus = useMemo(() => {
    const groups: Record<TripStatus, Trip[]> = {
      PLANNED: [],
      ASSIGNED: [],
      LOADING: [],
      IN_PROGRESS: [],
      COMPLETE: [],
      CANCELLED: [],
    };

    tripsData?.data?.forEach((trip) => {
      if (groups[trip.status]) {
        groups[trip.status].push(trip);
      }
    });

    return groups;
  }, [tripsData?.data]);

  const tripColumns: Column<Trip>[] = [
    {
      key: 'tripNo',
      header: 'Trip No.',
      sortable: true,
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            copy(row.tripNo, 'Trip number copied');
          }}
          className="font-medium text-primary-600 hover:underline"
        >
          {row.tripNo}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      render: (row) => (
        <Badge variant={getTripStatusVariant(row.status)}>{formatStatus(row.status)}</Badge>
      ),
    },
    {
      key: 'driverName',
      header: 'Driver',
      render: (row) => row.driverName || <span className="text-slate-400">Unassigned</span>,
    },
    {
      key: 'vehiclePlate',
      header: 'Vehicle',
      render: (row) => row.vehiclePlate || <span className="text-slate-400">-</span>,
    },
    {
      key: 'totalStops',
      header: 'Stops',
      width: '140px',
      render: (row) => (
        <StopsProgress
          completed={row.completedStops || 0}
          total={row.totalStops}
        />
      ),
    },
    {
      key: 'exceptions',
      header: 'Issues',
      width: '80px',
      className: 'text-center',
      render: (row) => {
        const hasIssue = row.status === 'CANCELLED';
        return hasIssue ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600">
            <ExclamationIcon />
          </span>
        ) : (
          <span className="text-slate-300">-</span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'ASSIGNED' && (
            <Button size="sm" variant="ghost" onClick={(e) => handleQuickStart(row, e)}>
              Start
            </Button>
          )}
          {row.status === 'IN_PROGRESS' && (
            <Button size="sm" variant="ghost" onClick={(e) => handleQuickComplete(row, e)}>
              Complete
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/dispatch/${row.id}`)}
          >
            View
          </Button>
        </div>
      ),
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
          className="h-4 w-4 rounded border-slate-300"
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
          className="h-4 w-4 rounded border-slate-300"
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
        <Badge variant="warning">{formatStatus(row.status)}</Badge>
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
      render: (row) => formatDate(row.createdAt),
    },
  ];

  const handleRowClick = (row: Trip) => {
    setSelectedTripId(row.id);
  };

  const handleViewFullDetails = () => {
    if (selectedTripId) {
      router.push(`/dispatch/${selectedTripId}`);
    }
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
      addToast('Trip created successfully', 'success');
      router.push(`/dispatch/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    }
  };

  // Stats
  const readyCount = readyShipments?.length || 0;
  const plannedTrips = tripsByStatus.PLANNED.length;
  const inProgressTrips = tripsByStatus.IN_PROGRESS.length;
  const completedToday = tripsByStatus.COMPLETE.length;
  const totalTrips = tripsData?.meta?.total || 0;

  // Calculate total weight of selected shipments
  const selectedWeight = useMemo(() => {
    if (!readyShipments) return 0;
    return readyShipments
      .filter(s => selectedShipments.has(s.id))
      .reduce((sum, s) => sum + (s.totalWeightKg || 0), 0);
  }, [readyShipments, selectedShipments]);

  // Computed values for drawer
  const drawerTrip = tripsData?.data?.find(t => t.id === selectedTripId);

  // Undelivered stops for drawer
  const undeliveredStops = useMemo(() => {
    if (!selectedTripStops) return [];
    return selectedTripStops.filter(s => !['DELIVERED'].includes(s.status));
  }, [selectedTripStops]);

  return (
    <PageShell>
      <PageHeader
        title="Dispatch"
        subtitle="Manage delivery trips and routes"
        actions={
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  isLive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {isLive ? 'Live' : 'Paused'}
              </button>
              <button
                onClick={handleRefresh}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Refresh now"
              >
                <RefreshIcon />
              </button>
            </div>
            <Button onClick={() => setActiveTab('ready-shipments')}>
              <PlusIcon />
              Create Trip
            </Button>
          </div>
        }
      />

      {/* Quick stats - now clickable work launchers */}
      <MetricGrid className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Ready for Dispatch"
          value={readyCount}
          icon={<PackageSmIcon />}
          iconColor="orange"
          alert={readyCount > 0}
          href="/dispatch?tab=ready-shipments"
        />
        <StatCard
          title="Planned Trips"
          value={plannedTrips}
          icon={<CalendarIcon />}
          iconColor="blue"
          href="/dispatch?tab=trips&status=PLANNED"
        />
        <StatCard
          title="In Progress"
          value={inProgressTrips}
          icon={<PlayIcon />}
          iconColor="yellow"
          href="/dispatch?tab=trips&status=IN_PROGRESS"
        />
        <StatCard
          title="Completed Today"
          value={completedToday}
          icon={<CheckIcon />}
          iconColor="green"
          href="/dispatch?tab=trips&status=COMPLETE"
        />
        <StatCard
          title="Total Trips"
          value={totalTrips}
          icon={<TruckSmIcon />}
          iconColor="gray"
        />
      </MetricGrid>

      {/* Main content with activity sidebar */}
      <div className="flex gap-6">
        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="border-b border-slate-200 mb-4">
            <div className="flex items-center justify-between">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'trips'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Trips
                </button>
                <button
                  onClick={() => setActiveTab('ready-shipments')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'ready-shipments'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
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

              {/* View mode toggle - only show on trips tab */}
              {activeTab === 'trips' && (
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('board')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'board'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BoardIcon className="h-4 w-4 inline mr-1.5" />
                    Board
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <TableIcon className="h-4 w-4 inline mr-1.5" />
                    Table
                  </button>
                </div>
              )}
            </div>
          </div>

      {activeTab === 'trips' && viewMode === 'table' && (
        <>
          {/* Sticky filter bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 -mx-6 px-6 py-3 mb-4 flex flex-wrap items-center gap-4">
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
                size="sm"
                onClick={() => {
                  setStatus('');
                  setDate('');
                }}
              >
                Clear Filters
              </Button>
            )}
            <div className="flex-1" />
            <span className="text-sm text-slate-500">
              {totalTrips} trip{totalTrips !== 1 ? 's' : ''}
            </span>
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

      {activeTab === 'trips' && viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
          {BOARD_COLUMNS.map((column) => (
            <div key={column.status} className="flex-shrink-0 w-72">
              <div className={`rounded-lg ${column.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-slate-700">{column.label}</h3>
                  <span className="text-sm font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full">
                    {tripsByStatus[column.status].length}
                  </span>
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {tripsByStatus[column.status].map((trip) => (
                      <motion.div
                        key={trip.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => setSelectedTripId(trip.id)}
                        className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-slate-900">{trip.tripNo}</span>
                          {trip.status === 'CANCELLED' && (
                            <span className="w-2 h-2 rounded-full bg-red-500" title="Has issues" />
                          )}
                        </div>

                        <div className="text-sm text-slate-600 mb-2">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                            {trip.driverName || 'Unassigned'}
                          </div>
                          {trip.vehiclePlate && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <TruckSmIcon2 className="h-3.5 w-3.5 text-slate-400" />
                              {trip.vehiclePlate}
                            </div>
                          )}
                        </div>

                        <StopsProgress
                          completed={trip.completedStops || 0}
                          total={trip.totalStops}
                          className="mb-2"
                        />

                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{formatRelativeTime(trip.updatedAt)}</span>

                          {/* Quick actions */}
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {trip.status === 'ASSIGNED' && (
                              <button
                                onClick={(e) => handleQuickStart(trip, e)}
                                className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            {trip.status === 'IN_PROGRESS' && (
                              <button
                                onClick={(e) => handleQuickComplete(trip, e)}
                                className="px-2 py-0.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {tripsByStatus[column.status].length === 0 && (
                    <div className="text-center py-6 text-sm text-slate-400">
                      No trips
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Selected Shipments
                    </label>
                    <div className="text-2xl font-bold text-primary-600">
                      {selectedShipments.size}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Total Weight
                    </label>
                    <div className="text-lg font-medium">
                      {selectedWeight.toFixed(1)} kg
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
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
              <PackageIcon className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">No shipments ready for dispatch</h3>
              <p className="text-slate-500 mt-1">
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
        </div>

        {/* Activity Feed Sidebar */}
        <div className="hidden xl:block w-80 flex-shrink-0">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activityLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : activityData && activityData.length > 0 ? (
                <div className="space-y-3">
                  {activityData.map((entry) => (
                    <ActivityItem key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trip Detail Drawer */}
      <Drawer
        isOpen={!!selectedTripId}
        onClose={() => setSelectedTripId(null)}
        title={drawerTrip?.tripNo || 'Trip Details'}
        subtitle={drawerTrip ? `${formatStatus(drawerTrip.status)} • ${formatDate(drawerTrip.plannedDate)}` : undefined}
        size="xl"
      >
        {drawerTrip && (
          <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Driver</p>
                <p className="font-medium text-slate-900">
                  {drawerTrip.driverName || 'Unassigned'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Vehicle</p>
                <p className="font-medium text-slate-900">
                  {drawerTrip.vehiclePlate || '-'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Total Weight</p>
                <p className="font-medium text-slate-900">
                  {drawerTrip.totalWeight || 0} kg
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">Stops Progress</p>
                <StopsProgress
                  completed={drawerTrip.completedStops || 0}
                  total={drawerTrip.totalStops}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Quick actions */}
            {(drawerTrip.status === 'ASSIGNED' || drawerTrip.status === 'IN_PROGRESS') && (
              <div className="flex gap-2">
                {drawerTrip.status === 'ASSIGNED' && (
                  <Button
                    onClick={(e) => handleQuickStart(drawerTrip, e)}
                    className="flex-1"
                    isLoading={startTrip.isPending}
                  >
                    <PlaySmIcon />
                    Start Trip
                  </Button>
                )}
                {drawerTrip.status === 'IN_PROGRESS' && (
                  <Button
                    onClick={(e) => handleQuickComplete(drawerTrip, e)}
                    className="flex-1"
                    isLoading={completeTrip.isPending}
                  >
                    <CheckSmIcon />
                    Complete Trip
                  </Button>
                )}
              </div>
            )}

            {/* Undelivered stops section */}
            {undeliveredStops.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <ExclamationIcon className="text-amber-600" />
                  Stops Not Delivered ({undeliveredStops.length})
                </h3>
                <div className="space-y-1">
                  {undeliveredStops.slice(0, 3).map((stop) => (
                    <div key={stop.id} className="text-sm text-amber-700">
                      #{stop.sequence} - {stop.customerName || 'Unknown'}
                      <Badge variant={getStopStatusVariant(stop.status)} className="ml-2 text-xs">
                        {stop.status}
                      </Badge>
                    </div>
                  ))}
                  {undeliveredStops.length > 3 && (
                    <div className="text-sm text-amber-600">
                      +{undeliveredStops.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All stops list */}
            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-3">All Delivery Stops</h3>
              {stopsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : selectedTripStops && selectedTripStops.length > 0 ? (
                <div className="space-y-2">
                  {selectedTripStops.map((stop) => (
                    <div
                      key={stop.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        stop.status === 'DELIVERED' ? 'bg-green-50' :
                        ['FAILED', 'SKIPPED'].includes(stop.status) ? 'bg-red-50' :
                        'bg-slate-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        stop.status === 'DELIVERED' ? 'bg-green-200 text-green-700' :
                        ['FAILED', 'SKIPPED'].includes(stop.status) ? 'bg-red-200 text-red-700' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {stop.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {stop.customerName || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {stop.addressLine1}
                          {stop.city && `, ${stop.city}`}
                        </p>
                      </div>
                      <Badge variant={getStopStatusVariant(stop.status)} className="flex-shrink-0">
                        {formatStatus(stop.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No stops in this trip</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200">
              <Button onClick={handleViewFullDetails} className="w-full">
                View Full Details
                <ArrowRightIcon />
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </PageShell>
  );
}

function formatStatus(status: string): string {
  return status?.replace(/_/g, ' ') || status;
}

function getTripStatusVariant(status: TripStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'IN_PROGRESS':
      return 'info';
    case 'LOADING':
      return 'warning';
    case 'ASSIGNED':
      return 'default';
    case 'PLANNED':
      return 'default';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function getStopStatusVariant(status: StopStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'ARRIVED':
    case 'EN_ROUTE':
      return 'info';
    case 'PENDING':
      return 'default';
    case 'FAILED':
    case 'SKIPPED':
      return 'danger';
    case 'PARTIAL':
      return 'warning';
    default:
      return 'default';
  }
}

// Icons
function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function BoardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function TruckSmIcon2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function PlaySmIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function CheckSmIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
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

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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

// Activity Feed Item
function ActivityItem({ entry }: { entry: AuditEntryWithActor }) {
  const getActivityInfo = (entry: AuditEntryWithActor) => {
    const { entityType, action, afterJson } = entry;

    // Determine icon and color based on entity type and action
    let icon: React.ReactNode;
    let color: string;
    let description: string;

    const entityId = afterJson?.tripNo || afterJson?.shipmentNo || afterJson?.orderNo || entry.entityId?.slice(0, 8);

    switch (entityType) {
      case 'Trip':
        switch (action) {
          case 'CREATE':
            icon = <TruckActivityIcon />;
            color = 'bg-blue-100 text-blue-600';
            description = `Trip ${entityId} created`;
            break;
          case 'UPDATE':
            const status = afterJson?.status as string;
            if (status === 'ASSIGNED') {
              icon = <UserActivityIcon />;
              color = 'bg-purple-100 text-purple-600';
              description = `Driver assigned to ${entityId}`;
            } else if (status === 'IN_PROGRESS') {
              icon = <PlayActivityIcon />;
              color = 'bg-yellow-100 text-yellow-600';
              description = `Trip ${entityId} started`;
            } else if (status === 'COMPLETE') {
              icon = <CheckActivityIcon />;
              color = 'bg-green-100 text-green-600';
              description = `Trip ${entityId} completed`;
            } else {
              icon = <EditActivityIcon />;
              color = 'bg-slate-100 text-slate-600';
              description = `Trip ${entityId} updated`;
            }
            break;
          default:
            icon = <TruckActivityIcon />;
            color = 'bg-slate-100 text-slate-600';
            description = `Trip ${entityId} ${action?.toLowerCase()}`;
        }
        break;
      case 'TripStop':
        const stopStatus = afterJson?.status as string;
        if (stopStatus === 'DELIVERED') {
          icon = <CheckActivityIcon />;
          color = 'bg-green-100 text-green-600';
          description = `Stop delivered`;
        } else if (stopStatus === 'FAILED') {
          icon = <ExclamationActivityIcon />;
          color = 'bg-red-100 text-red-600';
          description = `Delivery failed`;
        } else if (stopStatus === 'ARRIVED') {
          icon = <LocationActivityIcon />;
          color = 'bg-blue-100 text-blue-600';
          description = `Driver arrived at stop`;
        } else {
          icon = <LocationActivityIcon />;
          color = 'bg-slate-100 text-slate-600';
          description = `Stop updated`;
        }
        break;
      case 'Shipment':
        icon = <PackageActivityIcon />;
        color = 'bg-orange-100 text-orange-600';
        description = action === 'CREATE'
          ? `Shipment ${entityId} created`
          : `Shipment ${entityId} ${action?.toLowerCase()}`;
        break;
      default:
        icon = <EditActivityIcon />;
        color = 'bg-slate-100 text-slate-600';
        description = `${entityType} ${action?.toLowerCase()}`;
    }

    return { icon, color, description };
  };

  const { icon, color, description } = getActivityInfo(entry);

  return (
    <div className="flex gap-3">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-900 truncate">{description}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{entry.actorName || 'System'}</span>
          <span>•</span>
          <span>{formatRelativeTime(entry.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// Activity icons (smaller)
function TruckActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function UserActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function PlayActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function CheckActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function EditActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function LocationActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function ExclamationActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function PackageActivityIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
