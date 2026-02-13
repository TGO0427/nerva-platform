'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePortalOrders, useQueryParams } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function getStatusVariant(status: string) {
  switch (status) {
    case 'DELIVERED': return 'success' as const;
    case 'SHIPPED': case 'PICKING': return 'info' as const;
    case 'CANCELLED': return 'danger' as const;
    default: return 'default' as const;
  }
}

export default function PortalOrdersPage() {
  const [status, setStatus] = useState('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = usePortalOrders({ ...params, status: status || undefined });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !data?.data?.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          No orders found
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ship Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/portal/orders/${order.id}`} className="text-primary-600 font-medium hover:underline">
                      {order.order_no}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.requested_ship_date ? new Date(order.requested_ship_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.meta && data.meta.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
              <span>Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} orders)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(data.meta.page - 1)}
                  disabled={data.meta.page <= 1}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(data.meta.page + 1)}
                  disabled={data.meta.page >= data.meta.totalPages}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
