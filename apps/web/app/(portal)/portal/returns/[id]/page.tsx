'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePortalReturn } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

function getRmaStatusVariant(status: string) {
  switch (status) {
    case 'CLOSED': case 'CREDIT_APPROVED': return 'success' as const;
    case 'CANCELLED': return 'danger' as const;
    case 'INSPECTING': case 'CREDIT_PENDING': return 'warning' as const;
    default: return 'info' as const;
  }
}

export default function PortalReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: rma, isLoading } = usePortalReturn(id);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  if (!rma) {
    return <div className="text-center py-12 text-gray-500">Return not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/portal/returns" className="text-sm text-primary-600 hover:underline">&larr; Back to Returns</Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{rma.rma_no}</h1>
            <p className="text-sm text-gray-500 mt-1">Created {new Date(rma.created_at).toLocaleDateString()}</p>
          </div>
          <Badge variant={getRmaStatusVariant(rma.status)}>{rma.status?.replace(/_/g, ' ')}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Return Type</p>
            <p className="font-medium">{rma.return_type}</p>
          </div>
          <div>
            <p className="text-gray-500">Order</p>
            <p className="font-medium">{rma.order_no || '-'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500">Reason</p>
            <p className="font-medium">{rma.reason}</p>
          </div>
          {rma.notes && (
            <div className="col-span-2">
              <p className="text-gray-500">Notes</p>
              <p className="font-medium">{rma.notes}</p>
            </div>
          )}
        </div>
      </div>

      {rma.lines?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Return Lines</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requested</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disposition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rma.lines.map((line: any) => (
                <tr key={line.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{line.item_sku}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{line.item_description}</td>
                  <td className="px-6 py-4 text-sm text-right">{line.qty_requested}</td>
                  <td className="px-6 py-4 text-sm text-right">{line.qty_received}</td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant="default">{line.disposition?.replace(/_/g, ' ')}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
