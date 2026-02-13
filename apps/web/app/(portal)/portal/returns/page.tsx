'use client';

import Link from 'next/link';
import { usePortalReturns, useQueryParams } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

function getRmaStatusVariant(status: string) {
  switch (status) {
    case 'CLOSED': case 'CREDIT_APPROVED': return 'success' as const;
    case 'CANCELLED': return 'danger' as const;
    case 'INSPECTING': case 'CREDIT_PENDING': return 'warning' as const;
    default: return 'info' as const;
  }
}

export default function PortalReturnsPage() {
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = usePortalReturns(params);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
        <Link href="/portal/returns/new">
          <Button>Request Return</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !data?.data?.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          No returns found
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RMA No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((rma: any) => (
                <tr key={rma.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/portal/returns/${rma.id}`} className="text-primary-600 font-medium hover:underline">
                      {rma.rma_no}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getRmaStatusVariant(rma.status)}>{rma.status?.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rma.return_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rma.order_no || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(rma.created_at).toLocaleDateString()}</td>
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
