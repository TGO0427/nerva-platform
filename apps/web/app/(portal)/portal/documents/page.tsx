'use client';

import { useState } from 'react';
import { usePortalInvoices, useQueryParams } from '@/lib/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import api from '@/lib/api';

function getInvoiceStatusVariant(status: string) {
  switch (status) {
    case 'PAID': return 'success' as const;
    case 'SENT': return 'info' as const;
    case 'OVERDUE': return 'danger' as const;
    case 'CANCELLED': case 'VOID': return 'danger' as const;
    default: return 'default' as const;
  }
}

export default function PortalDocumentsPage() {
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = usePortalInvoices(params);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (invoiceId: string, invoiceNo: string) => {
    setDownloading(invoiceId);
    try {
      const response = await api.get(`/portal/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNo}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail for now
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Documents</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : !data?.data?.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          No documents found
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inv.invoice_no}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getInvoiceStatusVariant(inv.status)}>{inv.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inv.invoice_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inv.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    R {Number(inv.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(inv.id, inv.invoice_no)}
                      disabled={downloading === inv.id}
                    >
                      {downloading === inv.id ? 'Downloading...' : 'Download PDF'}
                    </Button>
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
