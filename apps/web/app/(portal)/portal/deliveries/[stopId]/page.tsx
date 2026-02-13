'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePortalDelivery, usePortalPod } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export default function PortalDeliveryDetailPage() {
  const { stopId } = useParams<{ stopId: string }>();
  const { data: delivery, isLoading } = usePortalDelivery(stopId);
  const { data: pod } = usePortalPod(
    delivery?.status === 'DELIVERED' || delivery?.status === 'FAILED' ? stopId : undefined
  );

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  if (!delivery) {
    return <div className="text-center py-12 text-gray-500">Delivery not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/portal/deliveries" className="text-sm text-primary-600 hover:underline">&larr; Back to Deliveries</Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery - {delivery.trip_no}</h1>
            <p className="text-sm text-gray-500 mt-1">{delivery.address_line1}{delivery.city ? `, ${delivery.city}` : ''}</p>
          </div>
          <Badge variant={delivery.status === 'DELIVERED' ? 'success' : delivery.status === 'FAILED' ? 'danger' : 'info'}>
            {delivery.status?.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Planned Date</p>
            <p className="font-medium">{delivery.planned_date ? new Date(delivery.planned_date).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Arrived At</p>
            <p className="font-medium">{delivery.arrived_at ? new Date(delivery.arrived_at).toLocaleString() : '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Completed At</p>
            <p className="font-medium">{delivery.completed_at ? new Date(delivery.completed_at).toLocaleString() : '-'}</p>
          </div>
        </div>
      </div>

      {pod && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Proof of Delivery</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Recipient</p>
              <p className="font-medium">{pod.recipient_name || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Captured At</p>
              <p className="font-medium">{new Date(pod.captured_at).toLocaleString()}</p>
            </div>
            {pod.notes && (
              <div className="col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="font-medium">{pod.notes}</p>
              </div>
            )}
            {pod.failure_reason && (
              <div className="col-span-2">
                <p className="text-gray-500">Failure Reason</p>
                <p className="font-medium text-red-600">{pod.failure_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
