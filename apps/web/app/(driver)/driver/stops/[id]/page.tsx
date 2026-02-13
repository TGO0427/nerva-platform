'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDriverTrips, useDriverArriveAtStop } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export default function DriverStopDetailPage() {
  const { id: stopId } = useParams<{ id: string }>();
  const router = useRouter();
  const arriveAtStop = useDriverArriveAtStop();

  // We need to find the stop - find by iterating trips
  // For simplicity, we'll use the stop pod endpoint to check
  // But first, let's get stop info from a custom approach
  // Since there's no direct "get stop" hook, we'll use a simple approach

  // Actually, let's look up the stop from the driver trips
  const { data: trips, isLoading } = useDriverTrips() as any;

  // Find which trip contains this stop - we need trip detail
  // For MVP, just redirect to deliver/fail pages

  const handleArrive = async () => {
    await arriveAtStop.mutateAsync(stopId);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Stop Details</h1>
        <p className="text-sm text-gray-500 mb-4">Stop ID: {stopId}</p>

        <div className="space-y-3">
          <Button
            onClick={handleArrive}
            disabled={arriveAtStop.isPending}
            variant="secondary"
            className="w-full py-3 text-base"
          >
            {arriveAtStop.isPending ? 'Updating...' : 'Mark Arrived'}
          </Button>

          <Link href={`/driver/stops/${stopId}/deliver`} className="block">
            <Button className="w-full py-3 text-base">
              Deliver
            </Button>
          </Link>

          <Link href={`/driver/stops/${stopId}/fail`} className="block">
            <Button variant="secondary" className="w-full py-3 text-base text-red-600 border-red-200 hover:bg-red-50">
              Mark Failed
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
