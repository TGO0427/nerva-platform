'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePortalOrder } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

export default function PortalOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = usePortalOrder(id);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  if (!order) {
    return <div className="text-center py-12 text-gray-500">Order not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/portal/orders" className="text-sm text-primary-600 hover:underline">&larr; Back to Orders</Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.order_no}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'danger' : 'info'}>
            {order.status?.replace(/_/g, ' ')}
          </Badge>
        </div>

        {order.requested_ship_date && (
          <p className="text-sm text-gray-600">
            Requested Ship Date: <strong>{new Date(order.requested_ship_date).toLocaleDateString()}</strong>
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Order Lines</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ordered</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shipped</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.lines?.map((line: any) => (
              <tr key={line.id}>
                <td className="px-6 py-4 text-sm text-gray-500">{line.line_no}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{line.item_sku}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{line.item_description}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{line.qty_ordered}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">{line.qty_shipped}</td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  {line.unit_price != null ? `R ${Number(line.unit_price).toFixed(2)}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
