'use client';

import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { DownloadIcon } from '@/components/ui/export-actions';
import { downloadPdf } from '@/lib/utils/export';
import {
  useGrn,
  useGrnLines,
  useCompleteGrn,
  useDeleteGrn,
  useGeneratePutawayTasks,
  usePutawayTasksByGrn,
  GrnLine,
  PutawayTaskDetail,
} from '@/lib/queries';

export default function GrnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const grnId = params.id as string;

  const { data: grn, isLoading: grnLoading } = useGrn(grnId);
  const { data: lines, isLoading: linesLoading } = useGrnLines(grnId);
  const { data: putawayTasks, isLoading: putawayLoading } = usePutawayTasksByGrn(
    grn?.status === 'PUTAWAY_PENDING' ? grnId : undefined,
  );
  const completeGrn = useCompleteGrn();
  const deleteGrn = useDeleteGrn();
  const generatePutaway = useGeneratePutawayTasks();

  const lineColumns: Column<GrnLine>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => (
        <span className="font-medium">{row.itemSku || row.itemId.slice(0, 8)}</span>
      ),
    },
    {
      key: 'itemDescription',
      header: 'Description',
      render: (row) => row.itemDescription || '-',
    },
    {
      key: 'qtyExpected',
      header: 'Expected',
      className: 'text-right',
    },
    {
      key: 'qtyReceived',
      header: 'Received',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyReceived >= row.qtyExpected ? 'text-green-600' : 'text-orange-600'}>
          {row.qtyReceived}
        </span>
      ),
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
    {
      key: 'binCode',
      header: 'Bin',
      render: (row) => row.binCode || '-',
    },
  ];

  const putawayColumns: Column<PutawayTaskDetail>[] = [
    {
      key: 'itemSku',
      header: 'Item',
      render: (t) => (
        <div>
          <span className="font-medium">{t.itemSku}</span>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{t.itemDescription}</p>
        </div>
      ),
    },
    {
      key: 'fromBinCode',
      header: 'From Bin',
      render: (t) => <span className="font-mono text-sm">{t.fromBinCode}</span>,
    },
    {
      key: 'toBinCode',
      header: 'To Bin',
      render: (t) =>
        t.toBinCode ? (
          <span className="font-mono text-sm">{t.toBinCode}</span>
        ) : (
          <span className="text-slate-400">Not set</span>
        ),
    },
    { key: 'qty', header: 'Qty' },
    {
      key: 'status',
      header: 'Status',
      render: (t) => {
        const variant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
          PENDING: 'warning',
          ASSIGNED: 'info',
          COMPLETE: 'success',
          CANCELLED: 'danger',
        };
        return <Badge variant={variant[t.status] || 'default'}>{t.status}</Badge>;
      },
    },
    {
      key: 'assignedToName',
      header: 'Assigned To',
      render: (t) => t.assignedToName || <span className="text-slate-400">Unassigned</span>,
    },
  ];

  const handleGeneratePutaway = async () => {
    try {
      await generatePutaway.mutateAsync(grnId);
    } catch (error) {
      console.error('Failed to generate putaway tasks:', error);
    }
  };

  const handleComplete = async () => {
    if (confirm('Are you sure you want to complete this GRN? This action cannot be undone.')) {
      try {
        await completeGrn.mutateAsync(grnId);
        router.push('/inventory/grn');
      } catch (error) {
        console.error('Failed to complete GRN:', error);
      }
    }
  };

  if (grnLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">GRN not found</h2>
      </div>
    );
  }

  const totalExpected = lines?.reduce((sum, l) => sum + l.qtyExpected, 0) || 0;
  const totalReceived = lines?.reduce((sum, l) => sum + l.qtyReceived, 0) || 0;
  const progress = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{grn.grnNo}</h1>
            <Badge variant={getStatusVariant(grn.status)}>{grn.status}</Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Created {new Date(grn.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {grn.status === 'DRAFT' && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm('Are you sure you want to delete this GRN?')) return;
                await deleteGrn.mutateAsync(grnId);
                router.push('/inventory/grn');
              }}
              disabled={deleteGrn.isPending}
            >
              {deleteGrn.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => downloadPdf(`/receiving/grns/${grnId}/pdf`, `GRN-${grn.grnNo}.pdf`)} className="print:hidden">
            <DownloadIcon />
            Download PDF
          </Button>
          {['DRAFT', 'OPEN', 'PARTIAL', 'RECEIVED', 'PUTAWAY_PENDING'].includes(grn.status) && (
            <>
            {grn.status !== 'PUTAWAY_PENDING' && (
              <Button variant="secondary" onClick={() => router.push(`/inventory/grn/${grnId}/receive`)}>
                <ScanIcon />
                Receive Items
              </Button>
            )}
            {grn.status === 'RECEIVED' && (
              <Button onClick={handleGeneratePutaway} isLoading={generatePutaway.isPending}>
                Generate Putaway Tasks
              </Button>
            )}
            {grn.status !== 'RECEIVED' && (
              <Button onClick={handleComplete} isLoading={completeGrn.isPending}>
                Complete GRN
              </Button>
            )}
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{totalExpected}</div>
            <p className="text-sm text-slate-500">Expected Qty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{totalReceived}</div>
            <p className="text-sm text-slate-500">Received Qty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{lines?.length || 0}</div>
            <p className="text-sm text-slate-500">Line Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary-600">{progress}%</div>
            <p className="text-sm text-slate-500">Progress</p>
            <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRN Info */}
      {grn.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{grn.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={lineColumns}
            data={lines || []}
            keyField="id"
            isLoading={linesLoading}
            emptyState={{
              title: 'No items received yet',
              description: 'Start scanning items to receive them into this GRN',
            }}
          />
        </CardContent>
      </Card>

      {/* Putaway Tasks */}
      {grn.status === 'PUTAWAY_PENDING' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Putaway Tasks</CardTitle>
              {putawayTasks && (
                <p className="text-sm text-slate-500">
                  {putawayTasks.filter((t) => t.status === 'COMPLETE').length} / {putawayTasks.length} completed
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={putawayColumns}
              data={putawayTasks || []}
              keyField="id"
              isLoading={putawayLoading}
              emptyState={{
                title: 'No putaway tasks',
                description: 'Putaway tasks will appear here once generated.',
              }}
            />
            {putawayTasks && putawayTasks.length > 0 && (
              <p className="text-sm text-slate-500 mt-4">
                Manage putaway tasks from the{' '}
                <a href="/inventory/putaway" className="text-primary-600 hover:underline">
                  Putaway page
                </a>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'RECEIVED':
      return 'success';
    case 'PUTAWAY_PENDING':
      return 'info';
    case 'PARTIAL':
      return 'warning';
    case 'DRAFT':
      return 'default';
    case 'OPEN':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function ScanIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
    </svg>
  );
}
