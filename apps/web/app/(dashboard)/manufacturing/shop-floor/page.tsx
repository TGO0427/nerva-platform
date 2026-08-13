'use client';

import { useState, useMemo } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  useWorkOrders,
  useWorkOrder,
  useStartWorkOrder,
  useStartOperation,
  useCompleteOperation,
  useIssueMaterial,
  useRecordOutput,
  useNextOutputBatch,
  useItem,
} from '@/lib/queries';
import { useBins } from '@/lib/queries/warehouses';
import { formatNumber, formatPercent, formatQuantity } from '@/lib/format';
import type { WorkOrder, WorkOrderOperationStatus } from '@nerva/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveModal =
  | null
  | 'startWorkOrder'
  | 'startOperation'
  | 'completeOperation'
  | 'issueMaterial'
  | 'recordOutput';

type ActiveOrderRow = WorkOrder & { itemSku?: string; itemDescription?: string };

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ShopFloorPage() {
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Fetch work orders (limit 100 and filter client-side)
  const { data: woData, isLoading: woLoading } = useWorkOrders({ page: 1, limit: 100 });
  const activeOrders = useMemo(() => {
    if (!woData?.data) return [];
    return woData.data.filter(
      (wo) => wo.status === 'RELEASED' || wo.status === 'IN_PROGRESS'
    );
  }, [woData]);

  // Fetch selected work order detail
  const {
    data: workOrder,
    isLoading: woDetailLoading,
  } = useWorkOrder(selectedWoId ?? undefined);

  const handleSelectWo = (id: string) => {
    setSelectedWoId(id);
    setMobileShowDetail(true);
  };

  const handleBack = () => {
    setMobileShowDetail(false);
  };

  const columns: Column<ActiveOrderRow>[] = useMemo(() => [
    {
      key: 'workOrderNo',
      header: 'Work Order',
      render: (wo) => (
        <div className="min-w-0">
          <div className="font-bold text-slate-900 truncate">{wo.workOrderNo}</div>
          <div className="text-xs text-slate-500 truncate">{wo.itemSku || 'No SKU'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (wo) => <StatusBadge status={wo.status} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (wo) => {
        const pct = wo.qtyOrdered > 0
          ? Math.round((wo.qtyCompleted / wo.qtyOrdered) * 100)
          : 0;
        return (
          <div className="min-w-[80px]">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{formatQuantity(wo.qtyCompleted)}/{formatQuantity(wo.qtyOrdered)}</span>
              <span>{formatPercent(pct, 0)}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="px-4 pt-3">
        <Breadcrumbs />
      </div>
      <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Work Order List */}
      <div
        className={`w-full md:w-96 md:min-w-[384px] border-r border-slate-200 bg-slate-50 flex flex-col ${
          mobileShowDetail ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200 bg-white">
          <h1 className="text-xl font-bold text-slate-900">Active Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            {formatNumber(activeOrders.length)} order{activeOrders.length !== 1 ? 's' : ''} on floor
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DataTable
            columns={columns}
            data={activeOrders}
            keyField="id"
            isLoading={woLoading}
            variant="embedded"
            density="compact"
            stickyHeader
            onRowClick={(wo) => handleSelectWo(wo.id)}
            rowClassName={(wo) => (selectedWoId === wo.id ? 'bg-blue-50' : undefined)}
            emptyState={{
              title: 'No active work orders',
              description: 'Release a work order to see it here.',
            }}
          />
        </div>
      </div>

      {/* Right Panel - Work Order Detail */}
      <div
        className={`flex-1 flex flex-col bg-white overflow-hidden ${
          mobileShowDetail ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!selectedWoId ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-lg font-medium">Select a work order</p>
              <p className="text-sm mt-1">Choose from the list on the left to view details</p>
            </div>
          </div>
        ) : woDetailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : workOrder ? (
          <WorkOrderDetail
            workOrder={workOrder}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <p>Failed to load work order</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Work Order Detail Panel
// ---------------------------------------------------------------------------

function WorkOrderDetail({
  workOrder,
  onBack,
}: {
  workOrder: any;
  onBack: () => void;
}) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const startWorkOrder = useStartWorkOrder();
  const startOperation = useStartOperation();
  const completeOperation = useCompleteOperation();
  const issueMaterial = useIssueMaterial();
  const recordOutput = useRecordOutput();

  const { data: bins } = useBins(workOrder.warehouseId);
  const { data: nextOutputBatch } = useNextOutputBatch(workOrder.id);
  const { data: producedItem } = useItem(workOrder.itemId);

  const pct = workOrder.qtyOrdered > 0
    ? Math.round((workOrder.qtyCompleted / workOrder.qtyOrdered) * 100)
    : 0;

  // Find the next READY operation and the current IN_PROGRESS operation
  const operations: any[] = workOrder.operations || [];
  const materials: any[] = workOrder.materials || [];

  const nextReadyOp = operations.find((op: any) => op.status === 'READY');
  const currentInProgressOp = operations.find((op: any) => op.status === 'IN_PROGRESS');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="md:hidden -ml-2 px-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {workOrder.workOrderNo}
            </h2>
            <p className="text-sm text-slate-500 truncate">
              {(workOrder as any).itemSku || workOrder.itemId?.slice(0, 8)} &mdash;{' '}
              {(workOrder as any).itemDescription || 'Product'}
            </p>
          </div>
          <Badge variant={getStatusVariant(workOrder.status)} className="text-base px-4 py-2">
            {workOrder.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Progress Bar */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Production Progress</span>
            <span className="text-2xl font-bold text-slate-900">{formatPercent(pct, 0)}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-slate-500">
            <span>
              {formatQuantity(workOrder.qtyCompleted)} completed
            </span>
            <span>
              {formatQuantity(workOrder.qtyOrdered)} ordered
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workOrder.status === 'RELEASED' && (
              <Button
                onClick={() => setActiveModal('startWorkOrder')}
                className="h-14 text-lg rounded-xl w-full bg-green-600 hover:bg-green-700 active:bg-green-800"
              >
                Start Work Order
              </Button>
            )}
            {nextReadyOp && (
              <Button
                onClick={() => setActiveModal('startOperation')}
                className="h-14 text-lg rounded-xl w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
              >
                Start Operation
              </Button>
            )}
            {currentInProgressOp && (
              <Button
                onClick={() => setActiveModal('completeOperation')}
                className="h-14 text-lg rounded-xl w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
              >
                Complete Operation
              </Button>
            )}
            {(workOrder.status === 'RELEASED' || workOrder.status === 'IN_PROGRESS') && (
              <Button
                onClick={() => setActiveModal('issueMaterial')}
                className="h-14 text-lg rounded-xl w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
              >
                Issue Material
              </Button>
            )}
            {workOrder.status === 'IN_PROGRESS' && (
              <Button
                onClick={() => setActiveModal('recordOutput')}
                className="h-14 text-lg rounded-xl w-full bg-green-600 hover:bg-green-700 active:bg-green-800"
              >
                Record Output
              </Button>
            )}
          </div>
        </div>

        {/* Materials Section */}
        {materials.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Materials
            </h3>
            <div className="space-y-2">
              {materials.map((mat: any) => {
                const issued = mat.qtyIssued ?? 0;
                const required = mat.qtyRequired ?? 0;
                const matPct = required > 0 ? Math.round((issued / required) * 100) : 0;
                const fullyIssued = issued >= required;
                const partial = issued > 0 && !fullyIssued;
                const barColor = fullyIssued
                  ? 'bg-emerald-500'
                  : partial
                  ? 'bg-amber-500'
                  : 'bg-slate-300';
                const textColor = fullyIssued
                  ? 'text-emerald-700'
                  : partial
                  ? 'text-amber-700'
                  : 'text-slate-500';

                return (
                  <div
                    key={mat.id}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {mat.itemSku || mat.itemId?.slice(0, 8)}
                      </span>
                      <span className={`text-sm font-semibold ${textColor}`}>
                        {formatQuantity(issued)} / {formatQuantity(required)}
                      </span>
                    </div>
                    {mat.itemDescription && (
                      <p className="text-xs text-slate-500 mb-1 truncate">{mat.itemDescription}</p>
                    )}
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(matPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Operations Section */}
        {operations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Operations
            </h3>
            <div className="relative pl-6">
              {operations.map((op: any, idx: number) => {
                const isLast = idx === operations.length - 1;
                const { circleColor, textColor, label } = getOpStyle(op.status);

                return (
                  <div key={op.id} className="relative pb-6 last:pb-0">
                    {/* Vertical line */}
                    {!isLast && (
                      <div className="absolute left-[-12px] top-8 bottom-0 w-0.5 bg-slate-300" />
                    )}
                    {/* Circle */}
                    <div
                      className={`absolute left-[-20px] top-1 w-4 h-4 rounded-full border-2 ${circleColor}`}
                    />
                    {/* Content */}
                    <div className="ml-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">
                          {op.operationNo}.
                        </span>
                        <span className="text-sm font-medium text-slate-900">
                          {op.name}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${textColor}`}>
                        {label}
                      </span>
                      {op.workstationName && (
                        <span className="text-xs text-slate-400 ml-2">
                          @ {op.workstationName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === 'startWorkOrder' && (
        <Modal
          isOpen
          title="Start Work Order"
          onClose={() => setActiveModal(null)}
        >
          <p className="text-slate-600 mb-6">
            Start production on <span className="font-semibold">{workOrder.workOrderNo}</span>?
            This will change the status to In Progress.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setActiveModal(null)}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              isLoading={startWorkOrder.isPending}
              onClick={async () => {
                try {
                  await startWorkOrder.mutateAsync(workOrder.id);
                  setActiveModal(null);
                } catch {
                  // error handled by query
                }
              }}
              className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800"
            >
              {startWorkOrder.isPending ? 'Starting...' : 'Confirm Start'}
            </Button>
          </div>
        </Modal>
      )}

      {activeModal === 'startOperation' && nextReadyOp && (
        <Modal
          isOpen
          title="Start Operation"
          onClose={() => setActiveModal(null)}
        >
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 font-medium">
              Operation #{nextReadyOp.operationNo}: {nextReadyOp.name}
            </p>
            {nextReadyOp.workstationName && (
              <p className="text-xs text-blue-500 mt-1">
                Workstation: {nextReadyOp.workstationName}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setActiveModal(null)}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              isLoading={startOperation.isPending}
              onClick={async () => {
                try {
                  await startOperation.mutateAsync({
                    workOrderId: workOrder.id,
                    operationId: nextReadyOp.id,
                  });
                  setActiveModal(null);
                } catch {
                  // error handled by query
                }
              }}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            >
              {startOperation.isPending ? 'Starting...' : 'Start Operation'}
            </Button>
          </div>
        </Modal>
      )}

      {activeModal === 'completeOperation' && currentInProgressOp && (
        <CompleteOperationModal
          workOrderId={workOrder.id}
          operation={currentInProgressOp}
          qtyOrdered={workOrder.qtyOrdered}
          completeOperation={completeOperation}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'issueMaterial' && (
        <IssueMaterialModal
          workOrderId={workOrder.id}
          materials={materials}
          bins={bins || []}
          issueMaterial={issueMaterial}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'recordOutput' && (
        <RecordOutputModal
          workOrderId={workOrder.id}
          bins={bins || []}
          recordOutput={recordOutput}
          nextOutputBatch={nextOutputBatch}
          requiresBatchTracking={!!producedItem?.requiresBatchTracking}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Complete Operation Modal
// ---------------------------------------------------------------------------

function CompleteOperationModal({
  workOrderId,
  operation,
  qtyOrdered,
  completeOperation,
  onClose,
}: {
  workOrderId: string;
  operation: any;
  qtyOrdered: number;
  completeOperation: ReturnType<typeof useCompleteOperation>;
  onClose: () => void;
}) {
  const [qtyCompleted, setQtyCompleted] = useState(String(qtyOrdered));
  const [qtyScrapped, setQtyScrapped] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    try {
      await completeOperation.mutateAsync({
        workOrderId,
        operationId: operation.id,
        qtyCompleted: parseFloat(qtyCompleted),
        qtyScrapped: qtyScrapped ? parseFloat(qtyScrapped) : undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch {
      // error handled by query
    }
  };

  return (
    <Modal isOpen title="Complete Operation" onClose={onClose}>
      <div className="bg-emerald-50 rounded-lg p-4 mb-4">
        <p className="text-sm text-emerald-700 font-medium">
          Operation #{operation.operationNo}: {operation.name}
        </p>
      </div>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Qty Completed *
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            value={qtyCompleted}
            onChange={(e) => setQtyCompleted(e.target.value)}
            className="h-12 text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Qty Waste
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            value={qtyScrapped}
            onChange={(e) => setQtyScrapped(e.target.value)}
            placeholder="0"
            className="h-12 text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1 h-12 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          disabled={!qtyCompleted}
          isLoading={completeOperation.isPending}
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
        >
          {completeOperation.isPending ? 'Completing...' : 'Complete'}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Issue Material Modal
// ---------------------------------------------------------------------------

function IssueMaterialModal({
  workOrderId,
  materials,
  bins,
  issueMaterial,
  onClose,
}: {
  workOrderId: string;
  materials: any[];
  bins: any[];
  issueMaterial: ReturnType<typeof useIssueMaterial>;
  onClose: () => void;
}) {
  // Filter to materials that still need issuing
  const pendingMaterials = materials.filter(
    (m: any) => m.qtyIssued < m.qtyRequired
  );

  const [selectedMaterialId, setSelectedMaterialId] = useState(
    pendingMaterials.length > 0 ? pendingMaterials[0].id : ''
  );
  const selectedMaterial = materials.find((m: any) => m.id === selectedMaterialId);
  const remaining = selectedMaterial
    ? selectedMaterial.qtyRequired - selectedMaterial.qtyIssued + (selectedMaterial.qtyReturned || 0)
    : 0;

  const [qty, setQty] = useState(remaining > 0 ? String(remaining) : '');
  const [binId, setBinId] = useState('');
  const [batchNo, setBatchNo] = useState('');

  // Update qty when material selection changes
  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    const mat = materials.find((m: any) => m.id === matId);
    if (mat) {
      const rem = mat.qtyRequired - mat.qtyIssued + (mat.qtyReturned || 0);
      setQty(rem > 0 ? String(rem) : '');
    }
  };

  const handleSubmit = async () => {
    if (!selectedMaterialId || !qty || !binId) return;
    try {
      await issueMaterial.mutateAsync({
        workOrderId,
        materialId: selectedMaterialId,
        qty: parseFloat(qty),
        binId,
        batchNo: batchNo || undefined,
      });
      onClose();
    } catch {
      // error handled by query
    }
  };

  return (
    <Modal isOpen title="Issue Material" onClose={onClose}>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Material *
          </label>
          <select
            value={selectedMaterialId}
            onChange={(e) => handleMaterialChange(e.target.value)}
            className="block w-full h-12 text-lg rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            {pendingMaterials.length === 0 && (
              <option value="">All materials fully issued</option>
            )}
            {pendingMaterials.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.itemSku || m.itemId?.slice(0, 8)} &mdash; need{' '}
                {formatQuantity(m.qtyRequired - m.qtyIssued + (m.qtyReturned || 0))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Quantity *
          </label>
          <Input
            type="number"
            min="0.01"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="h-12 text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bin *
          </label>
          <select
            value={binId}
            onChange={(e) => setBinId(e.target.value)}
            className="block w-full h-12 text-lg rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select bin...</option>
            {bins.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Batch #
          </label>
          <Input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="Optional"
            className="h-12 text-lg"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1 h-12 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          disabled={!selectedMaterialId || !qty || !binId}
          isLoading={issueMaterial.isPending}
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
        >
          {issueMaterial.isPending ? 'Issuing...' : 'Issue Material'}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Record Output Modal
// ---------------------------------------------------------------------------

function RecordOutputModal({
  workOrderId,
  bins,
  recordOutput,
  nextOutputBatch,
  requiresBatchTracking,
  onClose,
}: {
  workOrderId: string;
  bins: any[];
  recordOutput: ReturnType<typeof useRecordOutput>;
  nextOutputBatch?: { runNo?: number; batchNo?: string | null } | null;
  requiresBatchTracking: boolean;
  onClose: () => void;
}) {
  const [qty, setQty] = useState('');
  const [binId, setBinId] = useState('');
  const [batchNo, setBatchNo] = useState(nextOutputBatch?.batchNo || '');
  const [notes, setNotes] = useState('');
  const systemAssignedBatch = !!nextOutputBatch?.batchNo;

  const handleSubmit = async () => {
    if (!qty || !binId) return;
    try {
      await recordOutput.mutateAsync({
        workOrderId,
        qty: parseFloat(qty),
        binId,
        batchNo: batchNo || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch {
      // error handled by query
    }
  };

  return (
    <Modal isOpen title="Record Output" onClose={onClose}>
      {systemAssignedBatch && (
        <div className="bg-green-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-700 font-medium">
            This will be recorded as Run #{nextOutputBatch?.runNo}, batch {nextOutputBatch?.batchNo}
          </p>
        </div>
      )}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Quantity *
          </label>
          <Input
            type="number"
            min="0.01"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Enter output quantity"
            className="h-12 text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bin *
          </label>
          <select
            value={binId}
            onChange={(e) => setBinId(e.target.value)}
            className="block w-full h-12 text-lg rounded-xl border border-slate-300 px-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select bin...</option>
            {bins.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Batch #{requiresBatchTracking && !systemAssignedBatch && <span className="text-red-500"> *</span>}
          </label>
          <Input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder={requiresBatchTracking ? 'Required' : 'Optional'}
            disabled={systemAssignedBatch}
            className="h-12 text-lg"
          />
          {systemAssignedBatch ? (
            <p className="text-xs text-slate-500 mt-1">System-assigned for this run</p>
          ) : requiresBatchTracking && (
            <p className="text-xs text-amber-600 mt-1">This item requires a batch/lot number</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
            className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1 h-12 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          disabled={!qty || !binId || (requiresBatchTracking && !batchNo)}
          isLoading={recordOutput.isPending}
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800"
        >
          {recordOutput.isPending ? 'Recording...' : 'Record Output'}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusVariant(status)} className="whitespace-nowrap">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
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
    default:
      return 'default';
  }
}

function getOpStyle(status: WorkOrderOperationStatus) {
  switch (status) {
    case 'COMPLETED':
      return {
        circleColor: 'bg-emerald-500 border-emerald-500',
        textColor: 'text-emerald-600',
        label: 'Completed',
      };
    case 'IN_PROGRESS':
      return {
        circleColor: 'bg-amber-500 border-amber-500',
        textColor: 'text-amber-600',
        label: 'In Progress',
      };
    case 'READY':
      return {
        circleColor: 'bg-blue-500 border-blue-500',
        textColor: 'text-blue-600',
        label: 'Ready',
      };
    case 'SKIPPED':
      return {
        circleColor: 'bg-slate-300 border-slate-300',
        textColor: 'text-slate-400',
        label: 'Skipped',
      };
    case 'PENDING':
    default:
      return {
        circleColor: 'bg-white border-slate-300',
        textColor: 'text-slate-400',
        label: 'Pending',
      };
  }
}
