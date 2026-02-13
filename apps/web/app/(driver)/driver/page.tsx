'use client';

import Link from 'next/link';
import { useDriverTrips } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

function getTripStatusVariant(status: string) {
  switch (status) {
    case 'IN_PROGRESS': return 'info' as const;
    case 'COMPLETE': return 'success' as const;
    case 'CANCELLED': return 'danger' as const;
    case 'ASSIGNED': return 'warning' as const;
    default: return 'default' as const;
  }
}

export default function DriverTripsPage() {
  const { data: trips, isLoading } = useDriverTrips();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const active = trips?.filter((t: any) => t.status === 'IN_PROGRESS') || [];
  const upcoming = trips?.filter((t: any) => ['PLANNED', 'ASSIGNED', 'LOADING'].includes(t.status)) || [];
  const completed = trips?.filter((t: any) => ['COMPLETE', 'CANCELLED'].includes(t.status)) || [];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">My Trips</h1>

      {!trips?.length && (
        <div className="bg-white rounded-lg p-8 text-center text-gray-500 shadow-sm">
          No trips assigned
        </div>
      )}

      {active.length > 0 && (
        <Section title="Active">
          {active.map((trip: any) => <TripCard key={trip.id} trip={trip} />)}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Upcoming">
          {upcoming.map((trip: any) => <TripCard key={trip.id} trip={trip} />)}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="Completed">
          {completed.map((trip: any) => <TripCard key={trip.id} trip={trip} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TripCard({ trip }: { trip: any }) {
  return (
    <Link href={`/driver/trips/${trip.id}`}>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 active:bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-gray-900">{trip.tripNo}</span>
          <Badge variant={getTripStatusVariant(trip.status)}>
            {trip.status?.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{trip.totalStops} stop{trip.totalStops !== 1 ? 's' : ''}</span>
          <span>{trip.plannedDate ? new Date(trip.plannedDate).toLocaleDateString() : 'No date'}</span>
        </div>
        {trip.vehiclePlate && (
          <p className="text-xs text-gray-400 mt-1">{trip.vehiclePlate}</p>
        )}
      </div>
    </Link>
  );
}
