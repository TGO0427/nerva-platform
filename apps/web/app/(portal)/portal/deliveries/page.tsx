'use client';

import Link from 'next/link';
import { usePortalDeliveries, useQueryParams } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

function getDeliveryStatusVariant(status: string) {
  switch (status) {
    case 'DELIVERED': return 'success' as const;
    case 'FAILED': return 'danger' as const;
    case 'EN_ROUTE': case 'ARRIVED': return 'info' as const;
    default: return 'default' as const;
  }
}

export default function PortalDeliveriesPage() {
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = usePortalDeliveries(params);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Deliveries</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !data?.data?.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          No deliveries found
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/portal/deliveries/${d.id}`} className="text-primary-600 font-medium hover:underline">
                      {d.trip_no}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {d.address_line1}{d.city ? `, ${d.city}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getDeliveryStatusVariant(d.status)}>
                      {d.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {d.planned_date ? new Date(d.planned_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {d.completed_at ? new Date(d.completed_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.meta && data.meta.totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
              <span>Page {data.meta.page} of {data.meta.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(data.meta.page - 1)} disabled={data.meta.page <= 1} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50">Previous</button>
                <button onClick={() => setPage(data.meta.page + 1)} disabled={data.meta.page >= data.meta.totalPages} className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
