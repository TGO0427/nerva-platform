'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useCopy } from '@/lib/hooks/use-copy';
import { Drawer, StopsProgress } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import {
  useTrip,
  useTripStops,
  useAssignTrip,
  useStartTrip,
  useCompleteTrip,
  useCancelTrip,
  useArriveAtStop,
  useCompleteStop,
  useFailStop,
  useSkipStop,
  TripStop,
} from '@/lib/queries';
import type { TripStatus, StopStatus } from '@nerva/shared';

// Exception reason codes for failed deliveries
const FAILURE_REASONS = [
  { value: 'NO_ONE_HOME', label: 'No one home' },
  { value: 'WRONG_ADDRESS', label: 'Wrong address' },
  { value: 'REFUSED_DELIVERY', label: 'Customer refused delivery' },
  { value: 'DAMAGED_GOODS', label: 'Goods damaged' },
  { value: 'ACCESS_DENIED', label: 'Access denied / gate locked' },
  { value: 'WEATHER', label: 'Weather conditions' },
  { value: 'VEHICLE_ISSUE', label: 'Vehicle breakdown' },
  { value: 'OTHER', label: 'Other reason' },
];

// Consistent date formatting
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const { copy } = useCopy();

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: stops, isLoading: stopsLoading } = useTripStops(tripId);

  const assignTrip = useAssignTrip();
  const startTrip = useStartTrip();
  const completeTrip = useCompleteTrip();
  const cancelTrip = useCancelTrip();

  // Stop mutations
  const arriveAtStop = useArriveAtStop();
  const completeStop = useCompleteStop();
  const failStop = useFailStop();
  const skipStop = useSkipStop();

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // POD capture drawer state
  const [selectedStop, setSelectedStop] = useState<TripStop | null>(null);
  const [showPodDrawer, setShowPodDrawer] = useState(false);
  const [podSignature, setPodSignature] = useState('');
  const [podPhoto, setPodPhoto] = useState('');
  const [podNotes, setPodNotes] = useState('');

  // Fail stop modal state
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [failCustomReason, setFailCustomReason] = useState('');

  // Stop action handlers
  const handleArriveAtStop = async (stop: TripStop) => {
    try {
      await arriveAtStop.mutateAsync({ tripId, stopId: stop.id });
      addToast('Marked as arrived', 'success');
    } catch (error) {
      addToast('Failed to update stop', 'error');
    }
  };

  const openPodDrawer = (stop: TripStop) => {
    setSelectedStop(stop);
    setPodSignature('');
    setPodPhoto('');
    setPodNotes('');
    setShowPodDrawer(true);
  };

  const handleCompleteStop = async () => {
    if (!selectedStop) return;
    try {
      await completeStop.mutateAsync({
        tripId,
        stopId: selectedStop.id,
        podSignature: podSignature || undefined,
        podPhoto: podPhoto || undefined,
        podNotes: podNotes || undefined,
      });
      setShowPodDrawer(false);
      setSelectedStop(null);
      addToast('Stop delivered successfully', 'success');
    } catch (error) {
      addToast('Failed to complete stop', 'error');
    }
  };

  const openFailModal = (stop: TripStop) => {
    setSelectedStop(stop);
    setFailReason('');
    setFailCustomReason('');
    setShowFailModal(true);
  };

  const handleFailStop = async () => {
    if (!selectedStop || !failReason) {
      addToast('Please select a reason', 'error');
      return;
    }
    const reason = failReason === 'OTHER' ? failCustomReason : FAILURE_REASONS.find(r => r.value === failReason)?.label || failReason;
    try {
      await failStop.mutateAsync({ tripId, stopId: selectedStop.id, reason });
      setShowFailModal(false);
      setSelectedStop(null);
      addToast('Stop marked as failed', 'success');
    } catch (error) {
      addToast('Failed to update stop', 'error');
    }
  };

  const handleSkipStop = async (stop: TripStop) => {
    const confirmed = await confirm({
      title: 'Skip Stop',
      message: `Are you sure you want to skip the delivery to ${stop.customerName || 'this customer'}?`,
      confirmLabel: 'Skip Stop',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await skipStop.mutateAsync({ tripId, stopId: stop.id, reason: 'Skipped by dispatcher' });
        addToast('Stop skipped', 'success');
      } catch (error) {
        addToast('Failed to skip stop', 'error');
      }
    }
  };

  const isTripActive = trip?.status === 'IN_PROGRESS';

  const stopColumns: Column<TripStop>[] = [
    {
      key: 'sequence',
      header: '#',
      width: '60px',
      render: (row) => (
        <span className="font-medium">{row.sequence}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => row.customerName || (row.customerId ? row.customerId.slice(0, 8) : '-'),
    },
    {
      key: 'addressLine1',
      header: 'Address',
      render: (row) => (
        <div>
          <div>{row.addressLine1}</div>
          {row.city && <div className="text-xs text-slate-500">{row.city}</div>}
        </div>
      ),
    },
    {
      key: 'shipmentNo',
      header: 'Shipment',
      render: (row) => row.shipmentNo || '-',
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={getStopStatusVariant(row.status)}>{row.status}</Badge>
          {row.status === 'FAILED' && row.failureReason && (
            <span className="text-xs text-red-600" title={row.failureReason}>
              <ExclamationIcon />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'pod',
      header: 'POD',
      width: '80px',
      render: (row) => {
        const hasPod = row.podSignature || row.podPhoto;
        if (row.status === 'DELIVERED' && hasPod) {
          return (
            <span className="text-green-600" title="POD captured">
              <DocumentCheckIcon />
            </span>
          );
        }
        if (row.status === 'DELIVERED' && !hasPod) {
          return (
            <span className="text-yellow-600" title="No POD">
              <DocumentIcon />
            </span>
          );
        }
        return <span className="text-slate-300">-</span>;
      },
    },
    {
      key: 'arrivedAt',
      header: 'Arrived',
      render: (row) => row.arrivedAt
        ? new Date(row.arrivedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
        : '-',
    },
    {
      key: 'departedAt',
      header: 'Departed',
      render: (row) => row.departedAt
        ? new Date(row.departedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
        : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '180px',
      render: (row) => {
        if (!isTripActive) return <span className="text-slate-400 text-xs">Trip not active</span>;

        const isPending = row.status === 'PENDING';
        const isArrived = row.status === 'ARRIVED';
        const isCompleted = ['DELIVERED', 'FAILED', 'SKIPPED'].includes(row.status);

        if (isCompleted) {
          return <span className="text-slate-400 text-xs">Completed</span>;
        }

        return (
          <div className="flex items-center gap-1">
            {isPending && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleArriveAtStop(row)}
                isLoading={arriveAtStop.isPending}
              >
                Arrived
              </Button>
            )}
            {isArrived && (
              <>
                <Button
                  size="sm"
                  onClick={() => openPodDrawer(row)}
                >
                  Deliver
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => openFailModal(row)}
                >
                  Fail
                </Button>
              </>
            )}
            {(isPending || isArrived) && (
              <button
                onClick={() => handleSkipStop(row)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                title="Skip stop"
              >
                <SkipIcon />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const handleAssign = async () => {
    if (!selectedVehicle || !selectedDriver) {
      addToast('Please enter both vehicle and driver', 'error');
      return;
    }
    try {
      await assignTrip.mutateAsync({
        tripId,
        vehiclePlate: selectedVehicle,
        driverName: selectedDriver,
      });
      setShowAssignForm(false);
      addToast('Trip assigned successfully', 'success');
    } catch (error) {
      addToast('Failed to assign trip', 'error');
    }
  };

  const handleStart = async () => {
    const confirmed = await confirm({
      title: 'Start Trip',
      message: 'Are you sure you want to start this trip? The driver will be notified.',
      confirmLabel: 'Start Trip',
    });
    if (confirmed) {
      try {
        await startTrip.mutateAsync(tripId);
        addToast('Trip started', 'success');
      } catch (error) {
        addToast('Failed to start trip', 'error');
      }
    }
  };

  const handleComplete = async () => {
    // Check for pending stops first
    const pendingCount = stops?.filter(s => ['PENDING', 'EN_ROUTE', 'ARRIVED'].includes(s.status)).length || 0;

    const message = pendingCount > 0
      ? `This trip has ${pendingCount} undelivered stop(s). Are you sure you want to complete it?`
      : 'Are you sure you want to mark this trip as complete?';

    const confirmed = await confirm({
      title: 'Complete Trip',
      message,
      confirmLabel: pendingCount > 0 ? 'Complete Anyway' : 'Complete',
      variant: pendingCount > 0 ? 'danger' : undefined,
    });

    if (confirmed) {
      try {
        // If there are pending stops, use forceComplete
        await completeTrip.mutateAsync({ tripId, forceComplete: pendingCount > 0 });
        addToast(
          pendingCount > 0
            ? `Trip completed (${pendingCount} stop(s) auto-skipped)`
            : 'Trip completed',
          'success'
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to complete trip';
        addToast(errorMsg, 'error');
      }
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Trip',
      message: 'Are you sure you want to cancel this trip? This action cannot be undone.',
      confirmLabel: 'Cancel Trip',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await cancelTrip.mutateAsync({ tripId, reason: 'Cancelled by user' });
        addToast('Trip cancelled', 'success');
        router.push('/dispatch');
      } catch (error) {
        addToast('Failed to cancel trip', 'error');
      }
    }
  };

  if (tripLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Trip not found</h2>
      </div>
    );
  }

  const canAssign = trip.status === 'PLANNED';
  const canStart = trip.status === 'ASSIGNED' || trip.status === 'LOADING';
  const canComplete = trip.status === 'IN_PROGRESS';
  const canCancel = !['COMPLETE', 'CANCELLED'].includes(trip.status);

  const completedStops = stops?.filter(s => s.status === 'DELIVERED').length || 0;
  const failedStops = stops?.filter(s => ['FAILED', 'SKIPPED'].includes(s.status)).length || 0;
  const pendingStops = stops?.filter(s => ['PENDING', 'EN_ROUTE', 'ARRIVED'].includes(s.status)).length || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => copy(trip.tripNo, 'Trip number copied')}
              className="text-2xl font-bold text-slate-900 hover:text-primary-600 transition-colors"
            >
              {trip.tripNo}
            </button>
            <Badge variant={getTripStatusVariant(trip.status)}>
              {trip.status?.replace(/_/g, ' ') || trip.status}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            {trip.plannedDate
              ? `Planned for ${formatDate(trip.plannedDate)}`
              : `Created ${formatDate(trip.createdAt)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canAssign && !showAssignForm && (
            <Button onClick={() => setShowAssignForm(true)}>
              <UserIcon />
              Assign
            </Button>
          )}
          {canStart && (
            <Button onClick={handleStart} isLoading={startTrip.isPending}>
              <PlayIcon />
              Start Trip
            </Button>
          )}
          {canComplete && (
            <Button onClick={handleComplete} isLoading={completeTrip.isPending}>
              <CheckIcon />
              Complete
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} isLoading={cancelTrip.isPending}>
              <XIcon />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Assign form */}
      {showAssignForm && (
        <Card className="mb-6 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Assign Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle *
                </label>
                <Input
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  placeholder="Enter vehicle plate number..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Driver *
                </label>
                <Input
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  placeholder="Enter driver name..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAssign} isLoading={assignTrip.isPending}>
                Confirm Assignment
              </Button>
              <Button variant="secondary" onClick={() => setShowAssignForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 mb-2">Delivery Progress</p>
            <StopsProgress
              completed={completedStops}
              total={trip.totalStops}
              failed={failedStops}
              className="mb-2"
            />
            <p className="text-xs text-slate-400">
              {completedStops} delivered, {pendingStops} pending, {failedStops} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedStops}</div>
            <p className="text-sm text-slate-500">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingStops}</div>
            <p className="text-sm text-slate-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{failedStops}</div>
            <p className="text-sm text-slate-500">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Trip details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Driver</dt>
                <dd className="font-medium">{trip.driverName || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Vehicle</dt>
                <dd className="font-medium">{trip.vehiclePlate || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total Weight</dt>
                <dd className="font-medium">{trip.totalWeight || 0} kg</dd>
              </div>
              <div>
                <dt className="text-slate-500">Planned Date</dt>
                <dd className="font-medium">{formatDate(trip.plannedDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Started At</dt>
                <dd className="font-medium">{formatDateTime(trip.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Completed At</dt>
                <dd className="font-medium">{formatDateTime(trip.completedAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {trip.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">{trip.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Stops</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={stopColumns}
            data={stops || []}
            keyField="id"
            isLoading={stopsLoading}
            emptyState={{
              title: 'No stops in this trip',
              description: 'Add shipments to create delivery stops',
            }}
          />
        </CardContent>
      </Card>

      {/* POD Capture Drawer */}
      <Drawer
        isOpen={showPodDrawer}
        onClose={() => setShowPodDrawer(false)}
        title="Proof of Delivery"
        subtitle={selectedStop?.customerName || selectedStop?.addressLine1}
        size="md"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Delivery Details</h3>
            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Customer:</span>
                  <span className="ml-2 font-medium">{selectedStop?.customerName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Shipment:</span>
                  <span className="ml-2 font-medium">{selectedStop?.shipmentNo || '-'}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-slate-500">Address:</span>
                <span className="ml-2">{selectedStop?.addressLine1}</span>
                {selectedStop?.city && <span>, {selectedStop.city}</span>}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Recipient Name / Signature
            </label>
            <Input
              value={podSignature}
              onChange={(e) => setPodSignature(e.target.value)}
              placeholder="Enter recipient name or signature reference"
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter the name of the person who received the delivery
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Photo Reference
            </label>
            <Input
              value={podPhoto}
              onChange={(e) => setPodPhoto(e.target.value)}
              placeholder="Photo URL or reference"
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter a reference to the delivery photo (URL or file reference)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Delivery Notes
            </label>
            <textarea
              value={podNotes}
              onChange={(e) => setPodNotes(e.target.value)}
              placeholder="Any additional notes about the delivery..."
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleCompleteStop}
              isLoading={completeStop.isPending}
              className="flex-1"
            >
              <CheckIcon />
              Confirm Delivery
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowPodDrawer(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Fail Stop Modal */}
      <Drawer
        isOpen={showFailModal}
        onClose={() => setShowFailModal(false)}
        title="Mark Delivery Failed"
        subtitle={selectedStop?.customerName || selectedStop?.addressLine1}
        size="sm"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-600 mt-0.5">
                <ExclamationIcon />
              </span>
              <div>
                <p className="text-sm font-medium text-red-800">
                  This will mark the stop as failed
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Please select a reason for the failed delivery attempt.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Failure Reason *
            </label>
            <div className="space-y-2">
              {FAILURE_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    failReason === reason.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="failReason"
                    value={reason.value}
                    checked={failReason === reason.value}
                    onChange={(e) => setFailReason(e.target.value)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {failReason === 'OTHER' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Custom Reason *
              </label>
              <Input
                value={failCustomReason}
                onChange={(e) => setFailCustomReason(e.target.value)}
                placeholder="Enter custom reason..."
              />
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="danger"
              onClick={handleFailStop}
              isLoading={failStop.isPending}
              disabled={!failReason || (failReason === 'OTHER' && !failCustomReason)}
              className="flex-1"
            >
              Mark as Failed
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowFailModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
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

function getStopStatusVariant(status: StopStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'ARRIVED':
    case 'EN_ROUTE':
      return 'warning';
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

function UserIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function DocumentCheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25A9 9 0 0119.5 11.25M9 15l2.25 2.25L15 12" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.81V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
    </svg>
  );
}
