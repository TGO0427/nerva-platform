'use client';

import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { EntityHistory } from '@/components/ui/entity-history';
import { RecordDocumentsPanel, RelatedRecordsPanel } from '@/components/ui/record-panels';
import { DownloadIcon } from '@/components/ui/export-actions';
import { downloadPdf } from '@/lib/utils/export';
import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { formatDate } from '@/lib/format';
import {
  useRma,
  useRmaLines,
  useDeleteRma,
  useReceiveRmaLine,
  useSetRmaLineDisposition,
  useCompleteRmaDisposition,
  useCreateCreditNoteFromRma,
  useCloseRma,
  useCancelRma,
  useBins,
  useItem,
  RmaLine,
} from '@/lib/queries';
import type { RmaStatus, Disposition } from '@nerva/shared';

const DISPOSITION_OPTIONS: { value: Disposition; label: string }[] = [
  { value: 'RESTOCK', label: 'Restock (return to sellable stock)' },
  { value: 'QUARANTINE', label: 'Quarantine (hold for review)' },
  { value: 'SCRAP', label: 'Scrap (remove from inventory)' },
  { value: 'RETURN_TO_SUPPLIER', label: 'Return to Supplier' },
];

export default function RmaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rmaId = params.id as string;

  const { data: rma, isLoading: rmaLoading } = useRma(rmaId);
  const { data: lines, isLoading: linesLoading } = useRmaLines(rmaId);
  const { data: bins } = useBins(rma?.warehouseId);
  const binOptions = (bins || []).map((b) => ({ value: b.id, label: b.code }));

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [receiveModalLine, setReceiveModalLine] = useState<RmaLine | null>(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveBinId, setReceiveBinId] = useState('');
  const [receiveBatchNo, setReceiveBatchNo] = useState('');
  const { data: receiveModalItem } = useItem(receiveModalLine?.itemId);
  const [dispositionModalLine, setDispositionModalLine] = useState<RmaLine | null>(null);
  const [dispositionValue, setDispositionValue] = useState<Disposition>('RESTOCK');
  const [dispositionBinId, setDispositionBinId] = useState('');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [modalError, setModalError] = useState('');

  const deleteRma = useDeleteRma();
  const receiveLine = useReceiveRmaLine();
  const setDisposition = useSetRmaLineDisposition();
  const completeDisposition = useCompleteRmaDisposition();
  const createCreditNote = useCreateCreditNoteFromRma();
  const closeRma = useCloseRma();
  const cancelRma = useCancelRma();

  const openReceiveModal = (line: RmaLine) => {
    setReceiveModalLine(line);
    setReceiveQty(String(line.qtyExpected - line.qtyReceived));
    setReceiveBinId('');
    setReceiveBatchNo(line.batchNo || '');
    setModalError('');
  };

  const handleReceiveSubmit = async () => {
    if (!receiveModalLine) return;
    const qty = parseFloat(receiveQty);
    if (isNaN(qty) || qty <= 0) {
      setModalError('Enter a valid quantity');
      return;
    }
    if (!receiveBinId) {
      setModalError('Select a receiving bin');
      return;
    }
    if (receiveModalItem?.requiresBatchTracking && !receiveBatchNo.trim()) {
      setModalError('This item requires a batch/lot number');
      return;
    }
    try {
      await receiveLine.mutateAsync({
        rmaId,
        lineId: receiveModalLine.id,
        qtyReceived: qty,
        receivingBinId: receiveBinId,
        batchNo: receiveBatchNo || undefined,
      });
      setReceiveModalLine(null);
      addToast('Return line received', 'success');
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Failed to receive line');
    }
  };

  const openDispositionModal = (line: RmaLine) => {
    setDispositionModalLine(line);
    setDispositionValue('RESTOCK');
    setDispositionBinId('');
    setDispositionNotes('');
    setModalError('');
  };

  const handleDispositionSubmit = async () => {
    if (!dispositionModalLine) return;
    if (!dispositionBinId) {
      setModalError('Select a disposition bin');
      return;
    }
    try {
      await setDisposition.mutateAsync({
        rmaId,
        lineId: dispositionModalLine.id,
        disposition: dispositionValue,
        dispositionBinId,
        inspectionNotes: dispositionNotes || undefined,
      });
      setDispositionModalLine(null);
      addToast('Disposition set', 'success');
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Failed to set disposition');
    }
  };

  const handleCreateCreditNote = async () => {
    const confirmed = await confirm({
      title: 'Create Credit Note',
      message: 'Create a credit note from this RMA\'s received lines?',
      confirmLabel: 'Create',
    });
    if (!confirmed) return;
    try {
      const creditNote = await createCreditNote.mutateAsync(rmaId);
      addToast('Credit note created', 'success');
      router.push(`/returns/credit-notes/${creditNote.id}`);
    } catch (error) {
      console.error('Failed to create credit note:', error);
      addToast('Failed to create credit note', 'error');
    }
  };

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
      key: 'reasonCode',
      header: 'Reason',
      render: (row) => row.reasonCode?.replace(/_/g, ' ') || '-',
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
      key: 'receivingBinCode',
      header: 'Received Into',
      render: (row) => row.receivingBinCode || '-',
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
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
      key: 'dispositionBinCode',
      header: 'Disposition Bin',
      render: (row) => row.dispositionBinCode || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const canReceive = row.qtyReceived < row.qtyExpected;
        const canDispose = row.qtyReceived > 0 && row.disposition === 'PENDING';
        return (
          <div className="flex gap-2">
            {canReceive && (
              <button
                onClick={() => openReceiveModal(row)}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Receive
              </button>
            )}
            {canDispose && (
              <button
                onClick={() => openDispositionModal(row)}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Set Disposition
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete RMA',
      message: 'Are you sure you want to delete this RMA? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteRma.mutateAsync(rmaId);
      addToast('RMA deleted', 'success');
      router.push('/returns');
    } catch (error) {
      console.error('Failed to delete RMA:', error);
      addToast('Failed to delete RMA', 'error');
    }
  };

  const handleCompleteDisposition = async () => {
    const confirmed = await confirm({
      title: 'Complete Disposition',
      message: 'Mark disposition as complete? Ensure all items are inspected.',
      confirmLabel: 'Complete',
    });
    if (!confirmed) return;
    try {
      await completeDisposition.mutateAsync(rmaId);
      addToast('Disposition completed', 'success');
    } catch (error) {
      console.error('Failed to complete disposition:', error);
      addToast('Failed to complete disposition', 'error');
    }
  };

  const handleClose = async () => {
    const confirmed = await confirm({
      title: 'Close RMA',
      message: 'Close this RMA?',
      confirmLabel: 'Close',
    });
    if (!confirmed) return;
    try {
      await closeRma.mutateAsync(rmaId);
      addToast('RMA closed', 'success');
    } catch (error) {
      console.error('Failed to close RMA:', error);
      addToast('Failed to close RMA', 'error');
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      addToast('Please provide a cancellation reason', 'warning');
      return;
    }
    try {
      await cancelRma.mutateAsync({ rmaId, reason: cancelReason });
      addToast('RMA cancelled', 'success');
      setShowCancelModal(false);
      router.push('/returns');
    } catch (error) {
      console.error('Failed to cancel RMA:', error);
      addToast('Failed to cancel RMA', 'error');
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

  const totalExpected = lines?.reduce((sum, l) => sum + l.qtyExpected, 0) || 0;
  const totalReceived = lines?.reduce((sum, l) => sum + l.qtyReceived, 0) || 0;
  const totalDisposed = lines?.filter((l) => l.disposition !== 'PENDING').length || 0;

  const canDelete = rma.status === 'OPEN';
  const canCompleteDisposition = rma.status === 'INSPECTING';
  const canCreateCreditNote = rma.status === 'DISPOSITION_COMPLETE';
  const canClose = ['CREDIT_APPROVED', 'DISPOSITION_COMPLETE'].includes(rma.status);
  const canCancel = !['CLOSED', 'CANCELLED'].includes(rma.status);
  const relatedRecords = [
    {
      label: rma.customerName || 'Customer',
      description: rma.customerCode ? `Customer ${rma.customerCode}` : rma.customerId,
      href: `/master-data/customers/${rma.customerId}`,
      badge: 'Customer',
    },
    ...(rma.salesOrderId ? [{
      label: rma.orderNo || 'Sales order',
      description: 'Original order',
      href: `/sales/${rma.salesOrderId}`,
      badge: 'Sales',
    }] : []),
  ];

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
            Created {formatDate(rma.createdAt)}
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
          {canCreateCreditNote && (
            <Button onClick={handleCreateCreditNote} isLoading={createCreditNote.isPending}>
              <CreditIcon />
              Create Credit Note
            </Button>
          )}
          {canClose && (
            <Button onClick={handleClose} isLoading={closeRma.isPending}>
              <ArchiveIcon />
              Close RMA
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" onClick={handleDelete} isLoading={deleteRma.isPending}>
              <TrashIcon />
              Delete
            </Button>
          )}
          {canCancel && !canDelete && (
            <Button variant="danger" onClick={() => { setCancelReason(''); setShowCancelModal(true); }} isLoading={cancelRma.isPending}>
              <XIcon />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Cancel RMA</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason for cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full h-24 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Please provide a reason..."
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Back</Button>
                <Button variant="danger" onClick={handleCancelSubmit} isLoading={cancelRma.isPending}>
                  Cancel RMA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {receiveModalLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Receive Return Line</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-600">
                  <p><span className="font-medium">Item:</span> {receiveModalLine.itemSku || receiveModalLine.itemId.slice(0, 8)}</p>
                  <p><span className="font-medium">Expected:</span> {receiveModalLine.qtyExpected} (already received: {receiveModalLine.qtyReceived})</p>
                </div>

                {modalError && <Alert variant="error">{modalError}</Alert>}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Received</label>
                  <Input
                    type="number"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(e.target.value)}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Receiving Bin</label>
                  <Select
                    value={receiveBinId}
                    onChange={(e) => setReceiveBinId(e.target.value)}
                    options={[{ value: '', label: 'Select a bin...' }, ...binOptions]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Batch/Lot No{receiveModalItem?.requiresBatchTracking && <span className="text-red-500"> *</span>}
                  </label>
                  <Input
                    value={receiveBatchNo}
                    onChange={(e) => setReceiveBatchNo(e.target.value)}
                    placeholder="Batch/lot number on the returned goods"
                  />
                  {receiveModalItem?.requiresBatchTracking && (
                    <p className="text-xs text-amber-600 mt-1">This item requires a batch/lot number</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleReceiveSubmit} isLoading={receiveLine.isPending} className="flex-1">
                    Receive
                  </Button>
                  <Button variant="secondary" onClick={() => setReceiveModalLine(null)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {dispositionModalLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Set Disposition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-600">
                  <p><span className="font-medium">Item:</span> {dispositionModalLine.itemSku || dispositionModalLine.itemId.slice(0, 8)}</p>
                  <p><span className="font-medium">Qty Received:</span> {dispositionModalLine.qtyReceived}</p>
                </div>

                {modalError && <Alert variant="error">{modalError}</Alert>}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Disposition</label>
                  <Select
                    value={dispositionValue}
                    onChange={(e) => setDispositionValue(e.target.value as Disposition)}
                    options={DISPOSITION_OPTIONS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {dispositionValue === 'SCRAP' ? 'Scrap Bin' : 'Destination Bin'}
                  </label>
                  <Select
                    value={dispositionBinId}
                    onChange={(e) => setDispositionBinId(e.target.value)}
                    options={[{ value: '', label: 'Select a bin...' }, ...binOptions]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Notes</label>
                  <Textarea
                    value={dispositionNotes}
                    onChange={(e) => setDispositionNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleDispositionSubmit} isLoading={setDisposition.isPending} className="flex-1">
                    Save Disposition
                  </Button>
                  <Button variant="secondary" onClick={() => setDispositionModalLine(null)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{totalExpected}</div>
            <p className="text-sm text-slate-500">Qty Expected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${totalReceived >= totalExpected ? 'text-green-600' : 'text-orange-600'}`}>
              {totalReceived}
            </div>
            <p className="text-sm text-slate-500">Qty Received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totalDisposed}/{lines?.length || 0}</div>
            <p className="text-sm text-slate-500">Lines Disposed</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RecordDocumentsPanel
          items={[
            {
              label: `RMA ${rma.rmaNo}`,
              description: 'Return authorization PDF',
              onClick: () => downloadPdf(`/returns/rmas/${rmaId}/pdf`, `RMA-${rma.rmaNo}.pdf`),
              badge: 'PDF',
            },
          ]}
        />
        <RelatedRecordsPanel items={relatedRecords} />
      </div>

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

function TrashIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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

function CreditIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}
