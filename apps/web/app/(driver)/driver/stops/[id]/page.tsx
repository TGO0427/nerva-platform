'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDriverStop, useDriverArriveAtStop } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

function getStopStatusVariant(status: string) {
  switch (status) {
    case 'DELIVERED': return 'success' as const;
    case 'FAILED':
    case 'SKIPPED': return 'danger' as const;
    case 'ARRIVED': return 'info' as const;
    case 'EN_ROUTE': return 'warning' as const;
    default: return 'default' as const;
  }
}

export default function DriverStopDetailPage() {
  const { id: stopId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: stop, isLoading } = useDriverStop(stopId);
  const arriveAtStop = useDriverArriveAtStop();

  const handleArrive = async () => {
    await arriveAtStop.mutateAsync(stopId);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  if (!stop) {
    return <div className="p-4 text-center text-gray-500">Stop not found</div>;
  }

  const isClosed = ['DELIVERED', 'FAILED', 'SKIPPED'].includes(stop.status);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Stop {stop.sequence}</p>
            <h1 className="text-xl font-bold text-gray-900">{stop.customerName || 'Unknown Customer'}</h1>
          </div>
          <Badge variant={getStopStatusVariant(stop.status)}>
            {stop.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="text-sm text-gray-600 space-y-2 mb-4">
          {stop.shipmentNo && <p>Shipment: {stop.shipmentNo}</p>}
          <p>{stop.addressLine1}{stop.city ? `, ${stop.city}` : ''}</p>
          {stop.eta && <p>ETA: {new Date(stop.eta).toLocaleString()}</p>}
          {stop.notes && <p>Notes: {stop.notes}</p>}
          {stop.failureReason && <p>Failure: {stop.failureReason}</p>}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleArrive}
            disabled={arriveAtStop.isPending || isClosed || stop.status === 'ARRIVED'}
            variant="secondary"
            className="w-full py-3 text-base"
          >
            {arriveAtStop.isPending ? 'Updating...' : 'Mark Arrived'}
          </Button>

          {isClosed ? (
            <Button disabled className="w-full py-3 text-base">
              Deliver
            </Button>
          ) : (
            <Link href={`/driver/stops/${stopId}/deliver`} className="block">
              <Button className="w-full py-3 text-base">
                Deliver
              </Button>
            </Link>
          )}

          {isClosed ? (
            <Button disabled variant="secondary" className="w-full py-3 text-base text-red-600 border-red-200 hover:bg-red-50">
              Mark Failed
            </Button>
          ) : (
            <Link href={`/driver/stops/${stopId}/fail`} className="block">
              <Button variant="secondary" className="w-full py-3 text-base text-red-600 border-red-200 hover:bg-red-50">
                Mark Failed
              </Button>
            </Link>
          )}

          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="w-full py-3 text-base"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
