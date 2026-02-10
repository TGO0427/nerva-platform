'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import {
  usePickWave,
  usePickTasks,
  useReleasePickWave,
  useCompletePickWave,
  useCancelPickWave,
  useAssignPickTask,
  useConfirmPickTask,
  useCreateShipment,
  PickTask,
} from '@/lib/queries';
import { api } from '@/lib/api';

export default function PickWaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const waveId = params.id as string;

  // Modal state
  const [pickModalTask, setPickModalTask] = useState<PickTask | null>(null);
  const [pickQty, setPickQty] = useState('');
  const [shortReason, setShortReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<'release' | 'complete' | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: wave, isLoading: waveLoading } = usePickWave(waveId);
  const { data: tasks, isLoading: tasksLoading } = usePickTasks(waveId);

  const releaseWave = useReleasePickWave();
  const completeWave = useCompletePickWave();
  const cancelWave = useCancelPickWave();
  const assignTask = useAssignPickTask();
  const confirmTask = useConfirmPickTask();
  const createShipment = useCreateShipment();

  // Get unique order IDs from tasks for shipment creation
  const orderIds = useMemo(() => {
    if (!tasks) return [];
    const ids = new Set(tasks.map(t => t.salesOrderId));
    return Array.from(ids);
  }, [tasks]);

  const handleAssignTask = async (taskId: string) => {
    try {
      await assignTask.mutateAsync(taskId);
      addToast('Task assigned', 'success');
    } catch (error) {
      console.error('Failed to assign task:', error);
      addToast('Failed to assign task', 'error');
    }
  };

  const openPickModal = (task: PickTask) => {
    setPickModalTask(task);
    setPickQty(String(task.qtyToPick));
    setShortReason('');
    setActionError('');
  };

  const handleConfirmPick = async () => {
    if (!pickModalTask) return;

    const qtyPicked = parseInt(pickQty, 10);
    if (isNaN(qtyPicked) || qtyPicked < 0 || qtyPicked > pickModalTask.qtyToPick) {
      setActionError('Invalid quantity');
      return;
    }

    if (qtyPicked < pickModalTask.qtyToPick && !shortReason.trim()) {
      setActionError('Please provide a reason for short pick');
      return;
    }

    try {
      await confirmTask.mutateAsync({
        taskId: pickModalTask.id,
        qtyPicked,
        shortReason: qtyPicked < pickModalTask.qtyToPick ? shortReason : undefined,
      });
      setPickModalTask(null);
      addToast('Pick confirmed', 'success');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to confirm pick');
    }
  };

  const taskColumns: Column<PickTask>[] = [
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
      key: 'fromBinCode',
      header: 'Bin',
      render: (row) => (
        <span className="font-mono text-sm">{row.fromBinCode || row.fromBinId.slice(0, 8)}</span>
      ),
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
    {
      key: 'qtyToPick',
      header: 'To Pick',
      className: 'text-right',
    },
    {
      key: 'qtyPicked',
      header: 'Picked',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyPicked >= row.qtyToPick ? 'text-green-600' : 'text-orange-600'}>
          {row.qtyPicked}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={getTaskStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '180px',
      render: (row) => {
        const canAssign = !row.assignedTo && row.status !== 'PICKED' && row.status !== 'CANCELLED';
        const canPick = row.status !== 'PICKED' && row.status !== 'CANCELLED';

        return (
          <div className="flex gap-2">
            {canAssign && (
              <button
                onClick={() => handleAssignTask(row.id)}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Assign
              </button>
            )}
            {canPick && (
              <button
                onClick={() => openPickModal(row)}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Pick
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const handleRelease = async () => {
    setActionError('');
    try {
      await releaseWave.mutateAsync(waveId);
      setConfirmAction(null);
      addToast('Wave released for picking', 'success');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to release wave');
    }
  };

  const handleComplete = async () => {
    setActionError('');
    try {
      await completeWave.mutateAsync(waveId);
      setConfirmAction(null);
      addToast('Wave completed', 'success');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to complete wave');
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setActionError('Please provide a cancellation reason');
      return;
    }

    setActionError('');
    try {
      await cancelWave.mutateAsync({ waveId, reason: cancelReason });
      setCancelModal(false);
      addToast('Wave cancelled', 'success');
      router.push('/fulfilment');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to cancel wave');
    }
  };

  const handleCreateShipment = async () => {
    if (orderIds.length === 0) return;

    try {
      const shipment = await createShipment.mutateAsync({
        salesOrderId: orderIds[0],
      });
      addToast('Shipment created', 'success');
      router.push(`/fulfilment/shipments/${shipment.id}`);
    } catch (error) {
      console.error('Failed to create shipment:', error);
      addToast('Failed to create shipment', 'error');
    }
  };

  const handlePrintPickSlip = async () => {
    try {
      const response = await api.get(`/fulfilment/pick-waves/${waveId}/pick-slip`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pick-slip-${wave?.waveNo || waveId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download pick slip:', error);
    }
  };

  if (waveLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!wave) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Pick wave not found</h2>
      </div>
    );
  }

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'PICKED' || t.status === 'SHORT').length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0;
  const totalToPick = tasks?.reduce((sum, t) => sum + t.qtyToPick, 0) || 0;
  const totalPicked = tasks?.reduce((sum, t) => sum + t.qtyPicked, 0) || 0;
  const progress = totalToPick > 0 ? Math.round((totalPicked / totalToPick) * 100) : 0;

  const canRelease = wave.status === 'OPEN';
  const canComplete = wave.status === 'IN_PROGRESS';
  const canCancel = wave.status !== 'COMPLETE' && wave.status !== 'CANCELLED';
  const canCreateShipment = wave.status === 'COMPLETE' && orderIds.length > 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{wave.waveNo}</h1>
            <Badge variant={getWaveStatusVariant(wave.status)}>{wave.status}</Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Created {new Date(wave.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handlePrintPickSlip}>
            <PrinterIcon />
            Print Pick Slip
          </Button>
          {canCreateShipment && (
            <Button onClick={handleCreateShipment} isLoading={createShipment.isPending}>
              <ShipIcon />
              Create Shipment
            </Button>
          )}
          {canRelease && (
            <Button onClick={() => setConfirmAction('release')}>
              <PlayIcon />
              Release Wave
            </Button>
          )}
          {canComplete && (
            <Button onClick={() => setConfirmAction('complete')}>
              <CheckIcon />
              Complete Wave
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={() => setCancelModal(true)}>
              <XIcon />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{totalTasks}</div>
            <p className="text-sm text-slate-500">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
            <p className="text-sm text-slate-500">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <p className="text-sm text-slate-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{totalPicked}/{totalToPick}</div>
            <p className="text-sm text-slate-500">Qty Picked</p>
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

      {/* Pick tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Pick Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={taskColumns}
            data={tasks || []}
            keyField="id"
            isLoading={tasksLoading}
            emptyState={{
              title: 'No tasks in this wave',
              description: 'Pick tasks will appear here once the wave is created',
            }}
          />
        </CardContent>
      </Card>

      {/* Pick Confirmation Modal */}
      {pickModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPickModalTask(null)} />
          <Card className="relative z-10 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Confirm Pick</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-600">
                  <p>
                    <span className="font-medium">Item:</span> {pickModalTask.itemSku || pickModalTask.itemId.slice(0, 8)}
                  </p>
                  <p>
                    <span className="font-medium">Bin:</span> {pickModalTask.fromBinCode || pickModalTask.fromBinId.slice(0, 8)}
                  </p>
                  {pickModalTask.batchNo && (
                    <p>
                      <span className="font-medium">Batch:</span> {pickModalTask.batchNo}
                    </p>
                  )}
                </div>

                {actionError && (
                  <Alert variant="error">{actionError}</Alert>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantity Picked (max {pickModalTask.qtyToPick})
                  </label>
                  <Input
                    type="number"
                    value={pickQty}
                    onChange={(e) => setPickQty(e.target.value)}
                    min={0}
                    max={pickModalTask.qtyToPick}
                  />
                </div>

                {parseInt(pickQty, 10) < pickModalTask.qtyToPick && parseInt(pickQty, 10) >= 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reason for short pick *
                    </label>
                    <Textarea
                      value={shortReason}
                      onChange={(e) => setShortReason(e.target.value)}
                      placeholder="Explain why the full quantity could not be picked..."
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleConfirmPick}
                    isLoading={confirmTask.isPending}
                    className="flex-1"
                  >
                    Confirm Pick
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setPickModalTask(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Action Modal (Release/Complete) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmAction(null)} />
          <Card className="relative z-10 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {confirmAction === 'release' ? 'Release Pick Wave' : 'Complete Pick Wave'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {actionError && (
                  <Alert variant="error">{actionError}</Alert>
                )}

                <p className="text-slate-600">
                  {confirmAction === 'release'
                    ? 'Release this wave for picking? Tasks will become available to pickers.'
                    : 'Complete this pick wave? Ensure all tasks are finished.'}
                </p>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={confirmAction === 'release' ? handleRelease : handleComplete}
                    isLoading={confirmAction === 'release' ? releaseWave.isPending : completeWave.isPending}
                    className="flex-1"
                  >
                    {confirmAction === 'release' ? 'Release Wave' : 'Complete Wave'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmAction(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Wave Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCancelModal(false)} />
          <Card className="relative z-10 w-full max-w-md mx-4 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Cancel Pick Wave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert variant="warning">
                  This action cannot be undone. All pending tasks will be cancelled.
                </Alert>

                {actionError && (
                  <Alert variant="error">{actionError}</Alert>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cancellation Reason *
                  </label>
                  <Textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Please provide a reason for cancelling this wave..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="danger"
                    onClick={handleCancel}
                    isLoading={cancelWave.isPending}
                    className="flex-1"
                  >
                    Cancel Wave
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCancelModal(false);
                      setCancelReason('');
                      setActionError('');
                    }}
                    className="flex-1"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function getWaveStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'OPEN':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function getTaskStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'PICKED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'OPEN':
      return 'info';
    case 'SHORT':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

function ShipIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  );
}
