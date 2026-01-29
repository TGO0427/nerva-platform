'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import {
  useTrip,
  useTripStops,
  useVehicles,
  useDrivers,
  useAssignTrip,
  useStartTrip,
  useCompleteTrip,
  useCancelTrip,
  TripStop,
} from '@/lib/queries';
import type { TripStatus, StopStatus } from '@nerva/shared';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: stops, isLoading: stopsLoading } = useTripStops(tripId);
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  const assignTrip = useAssignTrip();
  const startTrip = useStartTrip();
  const completeTrip = useCompleteTrip();
  const cancelTrip = useCancelTrip();

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);

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
          {row.city && <div className="text-xs text-gray-500">{row.city}</div>}
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
        <Badge variant={getStopStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'arrivedAt',
      header: 'Arrived',
      render: (row) => row.arrivedAt
        ? new Date(row.arrivedAt).toLocaleTimeString()
        : '-',
    },
    {
      key: 'departedAt',
      header: 'Departed',
      render: (row) => row.departedAt
        ? new Date(row.departedAt).toLocaleTimeString()
        : '-',
    },
  ];

  const handleAssign = async () => {
    if (!selectedVehicle || !selectedDriver) {
      alert('Please select both vehicle and driver');
      return;
    }
    try {
      await assignTrip.mutateAsync({
        tripId,
        vehicleId: selectedVehicle,
        driverId: selectedDriver,
      });
      setShowAssignForm(false);
    } catch (error) {
      console.error('Failed to assign trip:', error);
    }
  };

  const handleStart = async () => {
    if (confirm('Start this trip?')) {
      try {
        await startTrip.mutateAsync(tripId);
      } catch (error) {
        console.error('Failed to start trip:', error);
      }
    }
  };

  const handleComplete = async () => {
    if (confirm('Complete this trip?')) {
      try {
        await completeTrip.mutateAsync(tripId);
      } catch (error) {
        console.error('Failed to complete trip:', error);
      }
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      try {
        await cancelTrip.mutateAsync({ tripId, reason });
        router.push('/dispatch');
      } catch (error) {
        console.error('Failed to cancel trip:', error);
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
        <h2 className="text-lg font-medium text-gray-900">Trip not found</h2>
      </div>
    );
  }

  const vehicleOptions = vehicles?.map(v => ({
    value: v.id,
    label: `${v.plateNo} - ${v.type}`,
  })) || [];

  const driverOptions = drivers?.map(d => ({
    value: d.id,
    label: d.name,
  })) || [];

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
            <h1 className="text-2xl font-bold text-gray-900">{trip.tripNo}</h1>
            <Badge variant={getTripStatusVariant(trip.status)}>
              {trip.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">
            {trip.plannedDate
              ? `Planned for ${new Date(trip.plannedDate).toLocaleDateString()}`
              : `Created ${new Date(trip.createdAt).toLocaleDateString()}`}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle *
                </label>
                <Select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  options={[{ value: '', label: 'Select vehicle...' }, ...vehicleOptions]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver *
                </label>
                <Select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  options={[{ value: '', label: 'Select driver...' }, ...driverOptions]}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{trip.totalStops}</div>
            <p className="text-sm text-gray-500">Total Stops</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedStops}</div>
            <p className="text-sm text-gray-500">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingStops}</div>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{failedStops}</div>
            <p className="text-sm text-gray-500">Failed/Skipped</p>
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
                <dt className="text-gray-500">Driver</dt>
                <dd className="font-medium">{trip.driverName || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Vehicle</dt>
                <dd className="font-medium">{trip.vehiclePlate || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total Weight</dt>
                <dd className="font-medium">{trip.totalWeight || 0} kg</dd>
              </div>
              <div>
                <dt className="text-gray-500">Planned Date</dt>
                <dd className="font-medium">
                  {trip.plannedDate ? new Date(trip.plannedDate).toLocaleDateString() : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Started At</dt>
                <dd className="font-medium">
                  {trip.startedAt ? new Date(trip.startedAt).toLocaleString() : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Completed At</dt>
                <dd className="font-medium">
                  {trip.completedAt ? new Date(trip.completedAt).toLocaleString() : '-'}
                </dd>
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
              <p className="text-gray-700">{trip.notes}</p>
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
