'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDriverTrip, useDriverStartTrip, useDriverCompleteTrip } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

function getStopStatusVariant(status: string) {
  switch (status) {
    case 'DELIVERED': return 'success' as const;
    case 'FAILED': case 'SKIPPED': return 'danger' as const;
    case 'ARRIVED': return 'info' as const;
    case 'EN_ROUTE': return 'warning' as const;
    default: return 'default' as const;
  }
}

export default function DriverTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useDriverTrip(id);
  const startTrip = useDriverStartTrip();
  const completeTrip = useDriverCompleteTrip();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  if (!data) {
    return <div className="p-4 text-center text-gray-500">Trip not found</div>;
  }

  const { trip, stops } = data;

  const handleStart = async () => {
    await startTrip.mutateAsync(trip.id);
  };

  const handleComplete = async () => {
    await completeTrip.mutateAsync(trip.id);
    router.push('/driver');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Trip header */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">{trip.tripNo}</h1>
          <Badge variant={trip.status === 'COMPLETE' ? 'success' : trip.status === 'IN_PROGRESS' ? 'info' : 'default'}>
            {trip.status?.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="text-sm text-gray-500 space-y-1">
          {trip.plannedDate && <p>Date: {new Date(trip.plannedDate).toLocaleDateString()}</p>}
          {trip.vehiclePlate && <p>Vehicle: {trip.vehiclePlate}</p>}
          <p>{stops.length} stop{stops.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="mt-4 flex gap-2">
          {trip.status === 'ASSIGNED' && (
            <Button onClick={handleStart} disabled={startTrip.isPending} className="w-full py-3 text-base">
              {startTrip.isPending ? 'Starting...' : 'Start Trip'}
            </Button>
          )}
          {trip.status === 'IN_PROGRESS' && (
            <Button onClick={handleComplete} disabled={completeTrip.isPending} variant="secondary" className="w-full py-3 text-base">
              {completeTrip.isPending ? 'Completing...' : 'Complete Trip'}
            </Button>
          )}
        </div>
      </div>

      {/* Stops list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Stops</h2>
        {stops.map((stop: any) => (
          <Link key={stop.id} href={`/driver/stops/${stop.id}`}>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 active:bg-gray-50 mb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                    {stop.sequence}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{stop.customerName || 'Unknown Customer'}</p>
                    <p className="text-sm text-gray-500">{stop.addressLine1}{stop.city ? `, ${stop.city}` : ''}</p>
                  </div>
                </div>
                <Badge variant={getStopStatusVariant(stop.status)}>
                  {stop.status?.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
