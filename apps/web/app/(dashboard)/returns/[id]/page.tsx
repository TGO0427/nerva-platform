'use client';

import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { EntityHistory } from '@/components/ui/entity-history';
import { DownloadIcon } from '@/components/ui/export-actions';
import { downloadPdf } from '@/lib/utils/export';
import {
  useRma,
  useRmaLines,
  useCompleteRmaDisposition,
  useCloseRma,
  useCancelRma,
  RmaLine,
} from '@/lib/queries';
import type { RmaStatus, Disposition } from '@nerva/shared';

export default function RmaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rmaId = params.id as string;

  const { data: rma, isLoading: rmaLoading } = useRma(rmaId);
  const { data: lines, isLoading: linesLoading } = useRmaLines(rmaId);

  const completeDisposition = useCompleteRmaDisposition();
  const closeRma = useCloseRma();
  const cancelRma = useCancelRma();

  const lineColumns: Column<RmaLine>[] = [
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
      key: 'qtyRequested',
      header: 'Requested',
      className: 'text-right',
    },
    {
      key: 'qtyReceived',
      header: 'Received',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyReceived >= row.qtyRequested ? 'text-green-600' : 'text-orange-600'}>
          {row.qtyReceived}
        </span>
      ),
    },
    {
      key: 'qtyInspected',
      header: 'Inspected',
      className: 'text-right',
    },
    {
      key: 'condition',
      header: 'Condition',
      render: (row) => row.condition ? (
        <Badge variant={getConditionVariant(row.condition)}>{row.condition}</Badge>
      ) : '-',
    },
    {
      key: 'disposition',
      header: 'Disposition',
      render: (row) => (
        <Badge variant={getDispositionVariant(row.disposition)}>
          {row.disposition?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'receivingBinCode',
      header: 'Bin',
      render: (row) => row.receivingBinCode || '-',
    },
  ];

  const handleCompleteDisposition = async () => {
    if (confirm('Mark disposition as complete? Ensure all items are inspected.')) {
      try {
        await completeDisposition.mutateAsync(rmaId);
      } catch (error) {
        console.error('Failed to complete disposition:', error);
      }
    }
  };

  const handleClose = async () => {
    if (confirm('Close this RMA?')) {
      try {
        await closeRma.mutateAsync(rmaId);
      } catch (error) {
        console.error('Failed to close RMA:', error);
      }
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      try {
        await cancelRma.mutateAsync({ rmaId, reason });
        router.push('/returns');
      } catch (error) {
        console.error('Failed to cancel RMA:', error);
      }
    }
  };

  if (rmaLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!rma) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">RMA not found</h2>
      </div>
    );
  }

  const totalRequested = lines?.reduce((sum, l) => sum + l.qtyRequested, 0) || 0;
  const totalReceived = lines?.reduce((sum, l) => sum + l.qtyReceived, 0) || 0;
  const totalInspected = lines?.reduce((sum, l) => sum + l.qtyInspected, 0) || 0;

  const canCompleteDisposition = rma.status === 'INSPECTING';
  const canClose = ['CREDIT_APPROVED', 'DISPOSITION_COMPLETE'].includes(rma.status);
  const canCancel = !['CLOSED', 'CANCELLED'].includes(rma.status);

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{rma.rmaNo}</h1>
            <Badge variant={getStatusVariant(rma.status)}>
              {rma.status?.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="default">{rma.returnType}</Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Created {new Date(rma.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadPdf(`/returns/rmas/${rmaId}/pdf`, `RMA-${rma.rmaNo}.pdf`)} className="print:hidden">
            <DownloadIcon />
            Download PDF
          </Button>
          {canCompleteDisposition && (
            <Button onClick={handleCompleteDisposition} isLoading={completeDisposition.isPending}>
              <CheckIcon />
              Complete Disposition
            </Button>
          )}
          {canClose && (
            <Button onClick={handleClose} isLoading={closeRma.isPending}>
              <ArchiveIcon />
              Close RMA
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} isLoading={cancelRma.isPending}>
              <XIcon />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{totalRequested}</div>
            <p className="text-sm text-slate-500">Qty Requested</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${totalReceived >= totalRequested ? 'text-green-600' : 'text-orange-600'}`}>
              {totalReceived}
            </div>
            <p className="text-sm text-slate-500">Qty Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totalInspected}</div>
            <p className="text-sm text-slate-500">Qty Inspected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{lines?.length || 0}</div>
            <p className="text-sm text-slate-500">Line Items</p>
          </CardContent>
        </Card>
      </div>

      {/* RMA details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>RMA Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Customer</dt>
                <dd className="font-medium">{rma.customerName || rma.customerId}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Customer Code</dt>
                <dd className="font-medium">{rma.customerCode || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Original Order</dt>
                <dd className="font-medium">{rma.orderNo || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Return Type</dt>
                <dd className="font-medium">{rma.returnType}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Reason</dt>
                <dd className="font-medium">{rma.reason}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {rma.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">{rma.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status workflow */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Workflow Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto">
            <WorkflowStep label="Open" active={rma.status === 'OPEN'} complete={!['OPEN'].includes(rma.status)} />
            <WorkflowConnector complete={!['OPEN'].includes(rma.status)} />
            <WorkflowStep label="Awaiting" active={rma.status === 'AWAITING_RETURN'} complete={!['OPEN', 'AWAITING_RETURN'].includes(rma.status)} />
            <WorkflowConnector complete={!['OPEN', 'AWAITING_RETURN'].includes(rma.status)} />
            <WorkflowStep label="Received" active={rma.status === 'RECEIVED'} complete={!['OPEN', 'AWAITING_RETURN', 'RECEIVED'].includes(rma.status)} />
            <WorkflowConnector complete={!['OPEN', 'AWAITING_RETURN', 'RECEIVED'].includes(rma.status)} />
            <WorkflowStep label="Inspecting" active={rma.status === 'INSPECTING'} complete={!['OPEN', 'AWAITING_RETURN', 'RECEIVED', 'INSPECTING'].includes(rma.status)} />
            <WorkflowConnector complete={['DISPOSITION_COMPLETE', 'CREDIT_PENDING', 'CREDIT_APPROVED', 'CLOSED'].includes(rma.status)} />
            <WorkflowStep label="Disposition" active={rma.status === 'DISPOSITION_COMPLETE'} complete={['CREDIT_PENDING', 'CREDIT_APPROVED', 'CLOSED'].includes(rma.status)} />
            <WorkflowConnector complete={['CREDIT_APPROVED', 'CLOSED'].includes(rma.status)} />
            <WorkflowStep label="Closed" active={rma.status === 'CLOSED'} complete={false} />
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Return Items</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={lineColumns}
            data={lines || []}
            keyField="id"
            isLoading={linesLoading}
            emptyState={{
              title: 'No items in this RMA',
              description: 'Add items to process returns',
            }}
          />
        </CardContent>
      </Card>

      {/* History */}
      <EntityHistory entityType="Rma" entityId={rmaId} />
    </div>
  );
}

function WorkflowStep({ label, active, complete }: { label: string; active: boolean; complete: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-[60px]">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
          complete
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-primary-600 text-white'
            : 'bg-slate-200 text-slate-400'
        }`}
      >
        {complete ? '✓' : ''}
      </div>
      <span className={`mt-1 text-xs ${active || complete ? 'text-slate-900' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

function WorkflowConnector({ complete }: { complete: boolean }) {
  return (
    <div className={`flex-1 h-0.5 mx-1 ${complete ? 'bg-green-600' : 'bg-slate-200'}`} />
  );
}

function getStatusVariant(status: RmaStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'CLOSED':
    case 'CREDIT_APPROVED':
      return 'success';
    case 'INSPECTING':
    case 'DISPOSITION_COMPLETE':
    case 'CREDIT_PENDING':
      return 'warning';
    case 'OPEN':
    case 'AWAITING_RETURN':
    case 'RECEIVED':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function getConditionVariant(condition: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (condition) {
    case 'NEW':
      return 'success';
    case 'GOOD':
      return 'info';
    case 'DAMAGED':
      return 'warning';
    case 'DEFECTIVE':
      return 'danger';
    default:
      return 'default';
  }
}

function getDispositionVariant(disposition: Disposition): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (disposition) {
    case 'RESTOCK':
      return 'success';
    case 'QUARANTINE':
      return 'warning';
    case 'SCRAP':
      return 'danger';
    case 'RETURN_TO_SUPPLIER':
      return 'info';
    case 'PENDING':
    default:
      return 'default';
  }
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V17.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
