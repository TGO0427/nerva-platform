'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { DetailPageTemplate } from '@/components/templates';
import { DownloadIcon } from '@/components/ui/export-actions';
import { downloadPdf } from '@/lib/utils/export';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useWorkOrder,
  useDeleteWorkOrder,
  useReleaseWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  useCancelWorkOrder,
  useReopenWorkOrder,
  useIssueMaterial,
  useRecordOutput,
  useStartOperation,
  useCompleteOperation,
  useUpsertWorkOrderChecks,
  useUpsertWorkOrderProcess,
} from '@/lib/queries/manufacturing';
import { useBins } from '@/lib/queries/warehouses';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { WorkOrderStatus, WorkOrderOperation, WorkOrderMaterial } from '@nerva/shared';

type OperationWithMeta = WorkOrderOperation & { workstationCode?: string; workstationName?: string; assignedUserName?: string };
type MaterialWithMeta = WorkOrderMaterial & { itemSku?: string; itemDescription?: string };

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: workOrder, isLoading, error } = useWorkOrder(id);
  const [activeTab, setActiveTab] = useState<'operations' | 'materials' | 'checks' | 'process'>('materials');

  const [issuingMaterialId, setIssuingMaterialId] = useState<string | null>(null);
  const [issueQty, setIssueQty] = useState('');
  const [issueBinId, setIssueBinId] = useState('');
  const [issueBatchNo, setIssueBatchNo] = useState('');

  const [showRecordOutput, setShowRecordOutput] = useState(false);
  const [outputQty, setOutputQty] = useState('');
  const [outputBinId, setOutputBinId] = useState('');
  const [outputBatchNo, setOutputBatchNo] = useState('');
  const [outputNotes, setOutputNotes] = useState('');

  const [completingOpId, setCompletingOpId] = useState<string | null>(null);
  const [opCompletedQty, setOpCompletedQty] = useState('');
  const [opScrappedQty, setOpScrappedQty] = useState('');
  const [opNotes, setOpNotes] = useState('');

  // Checks form state
  const [checksForm, setChecksForm] = useState({
    reworkProduct: '',
    reworkQtyKgs: '',
    theoreticalBoxes: '',
    actualBoxes: '',
    actualOvers: '',
    loaderSignature: '',
    operationsManagerSignature: '',
  });
  const [checksLoaded, setChecksLoaded] = useState(false);

  // Process form state
  const [processForm, setProcessForm] = useState({
    instructions: '',
    operator: '',
    potUsed: '',
    timeStarted: '',
    time85c: '',
    timeFlavourAdded: '',
    timeCompleted: '',
    additions: '',
    reasonForAddition: '',
    comments: '',
  });
  const [processLoaded, setProcessLoaded] = useState(false);

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const upsertChecks = useUpsertWorkOrderChecks();
  const upsertProcess = useUpsertWorkOrderProcess();
  const deleteWorkOrder = useDeleteWorkOrder();
  const releaseWorkOrder = useReleaseWorkOrder();
  const startWorkOrder = useStartWorkOrder();
  const completeWorkOrder = useCompleteWorkOrder();
  const cancelWorkOrder = useCancelWorkOrder();
  const reopenWorkOrder = useReopenWorkOrder();
  const issueMaterial = useIssueMaterial();
  const recordOutput = useRecordOutput();
  const startOperation = useStartOperation();
  const completeOperation = useCompleteOperation();

  const { data: bins } = useBins(workOrder?.warehouseId);

  // Populate checks form when data loads
  useEffect(() => {
    if (workOrder?.checks && !checksLoaded) {
      const c = workOrder.checks;
      setChecksForm({
        reworkProduct: c.reworkProduct || '',
        reworkQtyKgs: c.reworkQtyKgs != null ? String(c.reworkQtyKgs) : '',
        theoreticalBoxes: c.theoreticalBoxes != null ? String(c.theoreticalBoxes) : '',
        actualBoxes: c.actualBoxes != null ? String(c.actualBoxes) : '',
        actualOvers: c.actualOvers != null ? String(c.actualOvers) : '',
        loaderSignature: c.loaderSignature || '',
        operationsManagerSignature: c.operationsManagerSignature || '',
      });
      setChecksLoaded(true);
    }
  }, [workOrder?.checks, checksLoaded]);

  // Populate process form when data loads
  useEffect(() => {
    if (workOrder?.process && !processLoaded) {
      const p = workOrder.process;
      setProcessForm({
        instructions: p.instructions || '',
        operator: p.operator || '',
        potUsed: p.potUsed || '',
        timeStarted: p.timeStarted ? p.timeStarted.slice(0, 16) : '',
        time85c: p.time85c ? p.time85c.slice(0, 16) : '',
        timeFlavourAdded: p.timeFlavourAdded ? p.timeFlavourAdded.slice(0, 16) : '',
        timeCompleted: p.timeCompleted ? p.timeCompleted.slice(0, 16) : '',
        additions: p.additions || '',
        reasonForAddition: p.reasonForAddition || '',
        comments: p.comments || '',
      });
      setProcessLoaded(true);
    }
  }, [workOrder?.process, processLoaded]);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Work order not found</h2>
          <p className="mt-2 text-slate-500">The work order you're looking for doesn't exist.</p>
          <Link href="/manufacturing/work-orders">
            <Button className="mt-4">Back to Work Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Delete Work Order',
      message: 'Are you sure you want to delete this work order? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteWorkOrder.mutateAsync(id);
      addToast('Work order deleted', 'success');
      router.push('/manufacturing/work-orders');
    } catch (error) {
      addToast('Failed to delete work order', 'error');
    }
  };

  const handleRelease = async () => {
    if (!id) return;
    try {
      await releaseWorkOrder.mutateAsync(id);
      addToast('Work order released', 'success');
    } catch (error) {
      addToast('Failed to release work order', 'error');
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await startWorkOrder.mutateAsync(id);
      addToast('Production started', 'success');
    } catch (error) {
      addToast('Failed to start production', 'error');
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      await completeWorkOrder.mutateAsync(id);
      addToast('Work order completed', 'success');
    } catch (error) {
      addToast('Failed to complete work order', 'error');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Cancel Work Order',
      message: 'Are you sure you want to cancel this work order?',
      confirmLabel: 'Cancel Work Order',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await cancelWorkOrder.mutateAsync(id);
      addToast('Work order cancelled', 'success');
    } catch (error) {
      addToast('Failed to cancel work order', 'error');
    }
  };

  const handleReopen = async () => {
    if (!id) return;
    const message = workOrder?.status === 'CANCELLED'
      ? 'Reopen this cancelled work order? It will return to DRAFT status.'
      : 'Reopen this completed work order? It will return to IN PROGRESS status.';
    const confirmed = await confirm({
      title: 'Reopen Work Order',
      message,
      confirmLabel: 'Reopen',
    });
    if (!confirmed) return;
    try {
      await reopenWorkOrder.mutateAsync(id);
      addToast('Work order reopened', 'success');
    } catch (error) {
      addToast('Failed to reopen work order', 'error');
    }
  };

  const operationColumns: Column<OperationWithMeta>[] = [
    {
      key: 'operationNo',
      header: 'Op #',
      width: '60px',
      render: (row) => row.operationNo,
    },
    {
      key: 'name',
      header: 'Operation',
      render: (row) => row.name,
    },
    {
      key: 'workstationName',
      header: 'Workstation',
      render: (row) => row.workstationName || row.workstationCode || '-',
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={getOpStatusVariant(row.status)}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'qtyCompleted',
      header: 'Completed',
      width: '100px',
      render: (row) => row.qtyCompleted?.toLocaleString() || '0',
    },
    {
      key: 'assignedUserName',
      header: 'Assigned To',
      render: (row) => row.assignedUserName || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (row) => {
        if (workOrder?.status !== 'IN_PROGRESS') return null;
        if (row.status === 'PENDING') {
          return (
            <Button variant="secondary" size="sm" onClick={async (e) => { e.stopPropagation(); try { await startOperation.mutateAsync({ workOrderId: id!, operationId: row.id }); addToast('Operation started', 'success'); } catch { addToast('Failed to start operation', 'error'); } }}>
              Start
            </Button>
          );
        }
        if (row.status === 'IN_PROGRESS') {
          return (
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setCompletingOpId(row.id); setOpCompletedQty(String(workOrder.qtyOrdered)); }}>
              Complete
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const materialColumns: Column<MaterialWithMeta>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => row.itemSku || '-',
    },
    {
      key: 'itemDescription',
      header: 'Description',
      render: (row) => row.itemDescription || '-',
    },
    {
      key: 'qtyRequired',
      header: 'Required',
      width: '100px',
      render: (row) => row.qtyRequired.toLocaleString(),
    },
    {
      key: 'qtyIssued',
      header: 'Issued',
      width: '100px',
      render: (row) => row.qtyIssued.toLocaleString(),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      width: '100px',
      render: (row) => {
        const remaining = row.qtyRequired - row.qtyIssued + row.qtyReturned;
        return (
          <span className={remaining > 0 ? 'text-amber-600' : 'text-green-600'}>
            {remaining.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <Badge variant={row.status === 'ISSUED' ? 'success' : 'default'}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      render: (row) => {
        if (workOrder?.status !== 'IN_PROGRESS') return null;
        const remaining = row.qtyRequired - row.qtyIssued + row.qtyReturned;
        if (remaining <= 0) return <span className="text-xs text-green-600">Fully issued</span>;
        return (
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setIssuingMaterialId(row.id); setIssueQty(String(remaining)); }}>
            Issue
          </Button>
        );
      },
    },
  ];

  const progressPercentage = workOrder
    ? Math.round((workOrder.qtyCompleted / workOrder.qtyOrdered) * 100)
    : 0;

  return (
    <DetailPageTemplate
      title={workOrder?.workOrderNo || 'Loading...'}
      subtitle="Work Order Details"
      isLoading={isLoading}
      headerActions={
        workOrder && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => downloadPdf(`/manufacturing/work-orders/${id}/pdf`, `WO-${workOrder.workOrderNo}.pdf`)} className="print:hidden">
              <DownloadIcon />
              Download PDF
            </Button>
            <Button variant="secondary" onClick={() => downloadPdf(`/manufacturing/work-orders/${id}/batch-sheet-pdf`, `BatchSheet-${workOrder.workOrderNo}.pdf`)} className="print:hidden">
              <DownloadIcon />
              Batch Sheet
            </Button>
            <Button variant="secondary" onClick={() => downloadPdf(`/manufacturing/work-orders/${id}/production-ticket-pdf`, `ProductionTicket-${workOrder.workOrderNo}.pdf`)} className="print:hidden">
              <DownloadIcon />
              Production Ticket
            </Button>
            {workOrder.status === 'DRAFT' && (
              <>
                <Button variant="secondary" onClick={() => router.push(`/manufacturing/work-orders/${id}/edit`)}>
                  Edit
                </Button>
                <Button onClick={handleRelease} disabled={releaseWorkOrder.isPending}>
                  {releaseWorkOrder.isPending ? 'Releasing...' : 'Release'}
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={deleteWorkOrder.isPending}>
                  {deleteWorkOrder.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
            {workOrder.status === 'RELEASED' && (
              <Button onClick={handleStart} disabled={startWorkOrder.isPending}>
                {startWorkOrder.isPending ? 'Starting...' : 'Start Production'}
              </Button>
            )}
            {workOrder.status === 'IN_PROGRESS' && (
              <>
                <Button variant="secondary" onClick={() => setShowRecordOutput(!showRecordOutput)}>
                  Record Output
                </Button>
                <Button onClick={handleComplete} disabled={completeWorkOrder.isPending}>
                  {completeWorkOrder.isPending ? 'Completing...' : 'Complete'}
                </Button>
              </>
            )}
            {['COMPLETED', 'CANCELLED'].includes(workOrder.status) && (
              <Button onClick={handleReopen} disabled={reopenWorkOrder.isPending}>
                {reopenWorkOrder.isPending ? 'Reopening...' : 'Reopen'}
              </Button>
            )}
            {['DRAFT', 'RELEASED', 'ON_HOLD'].includes(workOrder.status) && (
              <Button variant="danger" onClick={handleCancel} disabled={cancelWorkOrder.isPending}>
                Cancel
              </Button>
            )}
          </div>
        )
      }
    >
      {workOrder && (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-500">Status</div>
              <div className="mt-1">
                <Badge variant={getStatusVariant(workOrder.status)} >
                  {workOrder.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Priority</div>
              <div className="mt-1">
                <Badge variant={getPriorityVariant(workOrder.priority)} >
                  {getPriorityLabel(workOrder.priority)}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Progress</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{progressPercentage}%</span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Quantity</div>
              <div className="mt-1 text-lg font-semibold">
                {workOrder.qtyCompleted.toLocaleString()} / {workOrder.qtyOrdered.toLocaleString()}
              </div>
            </Card>
          </div>

          {showRecordOutput && workOrder.status === 'IN_PROGRESS' && (
            <Card className="p-4 border-blue-200 bg-blue-50">
              <h3 className="text-sm font-medium text-blue-800 mb-3">Record Production Output</h3>
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Quantity</label>
                  <Input type="number" min="0.01" step="any" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Destination Bin</label>
                  <Select value={outputBinId} onChange={(e) => setOutputBinId(e.target.value)} options={[{ value: '', label: 'Select bin...' }, ...(bins || []).map(b => ({ value: b.id, label: b.code }))]} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Batch No</label>
                  <Input value={outputBatchNo} onChange={(e) => setOutputBatchNo(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Notes</label>
                  <Input value={outputNotes} onChange={(e) => setOutputNotes(e.target.value)} placeholder="Optional" />
                </div>
                <div className="flex items-end gap-2">
                  <Button size="sm" disabled={!outputQty || !outputBinId || recordOutput.isPending} onClick={async () => {
                    try { await recordOutput.mutateAsync({ workOrderId: id!, qty: parseFloat(outputQty), binId: outputBinId, batchNo: outputBatchNo || undefined, notes: outputNotes || undefined });
                    addToast('Output recorded', 'success'); setShowRecordOutput(false); setOutputQty(''); setOutputBinId(''); setOutputBatchNo(''); setOutputNotes('');
                    } catch { addToast('Failed to record output', 'error'); }
                  }}>
                    {recordOutput.isPending ? 'Recording...' : 'Record'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowRecordOutput(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Details Grid */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-slate-500">Product</div>
                <div className="mt-1 font-medium">{(workOrder as any).itemSku || workOrder.itemId.slice(0, 8)}</div>
                {(workOrder as any).itemDescription && (
                  <div className="text-sm text-slate-500">{(workOrder as any).itemDescription}</div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-500">Warehouse</div>
                <div className="mt-1">{(workOrder as any).warehouseName || workOrder.warehouseId.slice(0, 8)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Planned Start</div>
                <div className="mt-1">
                  {workOrder.plannedStart ? new Date(workOrder.plannedStart).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Planned End</div>
                <div className="mt-1">
                  {workOrder.plannedEnd ? new Date(workOrder.plannedEnd).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Actual Start</div>
                <div className="mt-1">
                  {workOrder.actualStart ? new Date(workOrder.actualStart).toLocaleString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Actual End</div>
                <div className="mt-1">
                  {workOrder.actualEnd ? new Date(workOrder.actualEnd).toLocaleString() : '-'}
                </div>
              </div>
              {workOrder.notes && (
                <div className="col-span-full">
                  <div className="text-sm text-slate-500">Notes</div>
                  <div className="mt-1">{workOrder.notes}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Tabs for Operations & Materials */}
          <Card>
            <div className="border-b">
              <nav className="flex gap-4 px-4">
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'materials'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Materials ({workOrder.materials?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('operations')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'operations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Operations ({workOrder.operations?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('checks')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'checks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Checks
                </button>
                <button
                  onClick={() => setActiveTab('process')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'process'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Process
                </button>
              </nav>
            </div>

            <div className="p-4">
              {activeTab === 'materials' && (
                <>
                  <DataTable
                    columns={materialColumns}
                    data={workOrder.materials || []}
                    keyField="id"
                    variant="embedded"
                    emptyState={{
                      icon: <BoxIcon />,
                      title: 'No materials',
                      description: 'No materials are required for this work order',
                    }}
                  />
                  {issuingMaterialId && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-3">Issue Material</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Quantity</label>
                          <Input type="number" min="0.01" step="any" value={issueQty} onChange={(e) => setIssueQty(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Bin</label>
                          <Select value={issueBinId} onChange={(e) => setIssueBinId(e.target.value)} options={[{ value: '', label: 'Select bin...' }, ...(bins || []).map(b => ({ value: b.id, label: b.code }))]} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Batch No</label>
                          <Input value={issueBatchNo} onChange={(e) => setIssueBatchNo(e.target.value)} placeholder="Optional" />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button size="sm" disabled={!issueQty || !issueBinId || issueMaterial.isPending} onClick={async () => {
                            try { await issueMaterial.mutateAsync({ workOrderId: id!, materialId: issuingMaterialId, qty: parseFloat(issueQty), binId: issueBinId, batchNo: issueBatchNo || undefined });
                            addToast('Material issued', 'success'); setIssuingMaterialId(null); setIssueQty(''); setIssueBinId(''); setIssueBatchNo('');
                            } catch { addToast('Failed to issue material', 'error'); }
                          }}>
                            {issueMaterial.isPending ? 'Issuing...' : 'Confirm'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setIssuingMaterialId(null); setIssueQty(''); setIssueBinId(''); setIssueBatchNo(''); }}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'operations' && (
                <>
                  <DataTable
                    columns={operationColumns}
                    data={workOrder.operations || []}
                    keyField="id"
                    variant="embedded"
                    emptyState={{
                      icon: <OperationIcon />,
                      title: 'No operations',
                      description: 'No operations defined for this work order',
                    }}
                  />
                  {completingOpId && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-3">Complete Operation</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Qty Completed</label>
                          <Input type="number" min="0" step="any" value={opCompletedQty} onChange={(e) => setOpCompletedQty(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Qty Scrapped</label>
                          <Input type="number" min="0" step="any" value={opScrappedQty} onChange={(e) => setOpScrappedQty(e.target.value)} placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Notes</label>
                          <Input value={opNotes} onChange={(e) => setOpNotes(e.target.value)} placeholder="Optional" />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button size="sm" disabled={!opCompletedQty || completeOperation.isPending} onClick={async () => {
                            try { await completeOperation.mutateAsync({ workOrderId: id!, operationId: completingOpId, qtyCompleted: parseFloat(opCompletedQty), qtyScrapped: opScrappedQty ? parseFloat(opScrappedQty) : undefined, notes: opNotes || undefined });
                            addToast('Operation completed', 'success'); setCompletingOpId(null); setOpCompletedQty(''); setOpScrappedQty(''); setOpNotes('');
                            } catch { addToast('Failed to complete operation', 'error'); }
                          }}>
                            {completeOperation.isPending ? 'Completing...' : 'Confirm'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setCompletingOpId(null); setOpCompletedQty(''); setOpScrappedQty(''); setOpNotes(''); }}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'checks' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-900">Tipping Check Sheet</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rework Product</label>
                      <Input value={checksForm.reworkProduct} onChange={(e) => setChecksForm(prev => ({ ...prev, reworkProduct: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rework Qty (kgs)</label>
                      <Input type="number" step="any" value={checksForm.reworkQtyKgs} onChange={(e) => setChecksForm(prev => ({ ...prev, reworkQtyKgs: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Theoretical Boxes</label>
                      <Input type="number" step="any" value={checksForm.theoreticalBoxes} onChange={(e) => setChecksForm(prev => ({ ...prev, theoreticalBoxes: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Actual Boxes</label>
                      <Input type="number" step="any" value={checksForm.actualBoxes} onChange={(e) => setChecksForm(prev => ({ ...prev, actualBoxes: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Actual Overs</label>
                      <Input type="number" step="any" value={checksForm.actualOvers} onChange={(e) => setChecksForm(prev => ({ ...prev, actualOvers: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Actual Total</label>
                      <Input
                        type="number"
                        step="any"
                        readOnly
                        value={
                          checksForm.actualBoxes && checksForm.actualOvers
                            ? String(parseFloat(checksForm.actualBoxes) + parseFloat(checksForm.actualOvers))
                            : checksForm.actualBoxes || ''
                        }
                        className="bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Diff to Theoretical</label>
                      <Input
                        type="number"
                        step="any"
                        readOnly
                        value={
                          checksForm.theoreticalBoxes && checksForm.actualBoxes
                            ? String(
                                (parseFloat(checksForm.actualBoxes) + parseFloat(checksForm.actualOvers || '0'))
                                - parseFloat(checksForm.theoreticalBoxes)
                              )
                            : ''
                        }
                        className="bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Loader Signature</label>
                      <Input value={checksForm.loaderSignature} onChange={(e) => setChecksForm(prev => ({ ...prev, loaderSignature: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Operations Manager Signature</label>
                      <Input value={checksForm.operationsManagerSignature} onChange={(e) => setChecksForm(prev => ({ ...prev, operationsManagerSignature: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={upsertChecks.isPending}
                      onClick={async () => {
                        try {
                          const actualTotal = checksForm.actualBoxes
                            ? parseFloat(checksForm.actualBoxes) + parseFloat(checksForm.actualOvers || '0')
                            : undefined;
                          const diffToTheoretical = checksForm.theoreticalBoxes && actualTotal != null
                            ? actualTotal - parseFloat(checksForm.theoreticalBoxes)
                            : undefined;
                          await upsertChecks.mutateAsync({
                            workOrderId: id!,
                            reworkProduct: checksForm.reworkProduct || undefined,
                            reworkQtyKgs: checksForm.reworkQtyKgs ? parseFloat(checksForm.reworkQtyKgs) : undefined,
                            theoreticalBoxes: checksForm.theoreticalBoxes ? parseFloat(checksForm.theoreticalBoxes) : undefined,
                            actualBoxes: checksForm.actualBoxes ? parseFloat(checksForm.actualBoxes) : undefined,
                            actualOvers: checksForm.actualOvers ? parseFloat(checksForm.actualOvers) : undefined,
                            actualTotal,
                            diffToTheoretical,
                            loaderSignature: checksForm.loaderSignature || undefined,
                            operationsManagerSignature: checksForm.operationsManagerSignature || undefined,
                          });
                          addToast('Check sheet saved', 'success');
                        } catch {
                          addToast('Failed to save check sheet', 'error');
                        }
                      }}
                    >
                      {upsertChecks.isPending ? 'Saving...' : 'Save Checks'}
                    </Button>
                  </div>
                </div>
              )}
              {activeTab === 'process' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-900">Production Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Instructions</label>
                      <textarea
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={3}
                        value={processForm.instructions}
                        onChange={(e) => setProcessForm(prev => ({ ...prev, instructions: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                      <Input value={processForm.operator} onChange={(e) => setProcessForm(prev => ({ ...prev, operator: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Pot Used</label>
                      <Input value={processForm.potUsed} onChange={(e) => setProcessForm(prev => ({ ...prev, potUsed: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time Started</label>
                      <Input type="datetime-local" value={processForm.timeStarted} onChange={(e) => setProcessForm(prev => ({ ...prev, timeStarted: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time 85°C</label>
                      <Input type="datetime-local" value={processForm.time85c} onChange={(e) => setProcessForm(prev => ({ ...prev, time85c: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time Flavour Added</label>
                      <Input type="datetime-local" value={processForm.timeFlavourAdded} onChange={(e) => setProcessForm(prev => ({ ...prev, timeFlavourAdded: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time Completed</label>
                      <Input type="datetime-local" value={processForm.timeCompleted} onChange={(e) => setProcessForm(prev => ({ ...prev, timeCompleted: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Additions</label>
                      <Input value={processForm.additions} onChange={(e) => setProcessForm(prev => ({ ...prev, additions: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Reason for Addition</label>
                      <Input value={processForm.reasonForAddition} onChange={(e) => setProcessForm(prev => ({ ...prev, reasonForAddition: e.target.value }))} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Comments</label>
                      <textarea
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={2}
                        value={processForm.comments}
                        onChange={(e) => setProcessForm(prev => ({ ...prev, comments: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={upsertProcess.isPending}
                      onClick={async () => {
                        try {
                          await upsertProcess.mutateAsync({
                            workOrderId: id!,
                            instructions: processForm.instructions || undefined,
                            operator: processForm.operator || undefined,
                            potUsed: processForm.potUsed || undefined,
                            timeStarted: processForm.timeStarted || undefined,
                            time85c: processForm.time85c || undefined,
                            timeFlavourAdded: processForm.timeFlavourAdded || undefined,
                            timeCompleted: processForm.timeCompleted || undefined,
                            additions: processForm.additions || undefined,
                            reasonForAddition: processForm.reasonForAddition || undefined,
                            comments: processForm.comments || undefined,
                          });
                          addToast('Process data saved', 'success');
                        } catch {
                          addToast('Failed to save process data', 'error');
                        }
                      }}
                    >
                      {upsertProcess.isPending ? 'Saving...' : 'Save Process'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </DetailPageTemplate>
  );
}

function getStatusVariant(status: WorkOrderStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'RELEASED':
      return 'info';
    case 'ON_HOLD':
    case 'CANCELLED':
      return 'danger';
    case 'DRAFT':
    default:
      return 'default';
  }
}

function getOpStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PENDING':
    default:
      return 'default';
  }
}

function getPriorityVariant(priority: number): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (priority >= 8) return 'danger';
  if (priority >= 5) return 'warning';
  return 'default';
}

function getPriorityLabel(priority: number): string {
  if (priority >= 8) return 'Urgent';
  if (priority >= 5) return 'High';
  if (priority >= 3) return 'Normal';
  return 'Low';
}

function BoxIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function OperationIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}
