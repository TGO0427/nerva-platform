'use client';

import { useState, useMemo } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import {
  useWorkOrders,
  useWorkOrder,
  useStartWorkOrder,
  useStartOperation,
  useCompleteOperation,
  useIssueMaterial,
  useRecordOutput,
} from '@/lib/queries';
import { useBins } from '@/lib/queries/warehouses';
import type { WorkOrderOperationStatus } from '@nerva/shared';

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

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left Panel - Work Order Cards */}
      <div
        className={`w-full md:w-96 md:min-w-[384px] border-r border-slate-200 bg-slate-50 flex flex-col ${
          mobileShowDetail ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-slate-200 bg-white">
          <h1 className="text-xl font-bold text-slate-900">Active Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''} on floor
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {woLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-lg font-medium">No active work orders</p>
              <p className="text-sm mt-1">Release a work order to see it here</p>
            </div>
          ) : (
            activeOrders.map((wo) => {
              const pct = wo.qtyOrdered > 0
                ? Math.round((wo.qtyCompleted / wo.qtyOrdered) * 100)
                : 0;
              const isSelected = selectedWoId === wo.id;
              return (
                <div
                  key={wo.id}
                  onClick={() => handleSelectWo(wo.id)}
                  className={`min-h-[80px] p-4 rounded-xl border cursor-pointer transition-colors bg-white ${
                    isSelected
                      ? 'border-blue-500 border-2 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-bold text-slate-900 truncate">
                        {wo.workOrderNo}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {(wo as any).itemSku || 'No SKU'}
                      </div>
                    </div>
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>
                        {wo.qtyCompleted.toLocaleString()} / {wo.qtyOrdered.toLocaleString()}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
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

  const pct = workOrder.qtyOrdered > 0
    ? Math.round((workOrder.qtyCompleted / workOrder.qtyOrdered) * 100)
    : 0;

  // Find the next READY operation and the current IN_PROGRESS operation
  const operations: any[] = workOrder.operations || [];
  const materials: any[] = workOrder.materials || [];

  const nextReadyOp = operations.find((op: any) => op.status === 'READY');
  const currentInProgressOp = operations.find((op: any) => op.status === 'IN_PROGRESS');

  const statusColor = workOrder.status === 'IN_PROGRESS'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-blue-100 text-blue-800';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 truncate">
              {workOrder.workOrderNo}
            </h2>
            <p className="text-sm text-slate-500 truncate">
              {(workOrder as any).itemSku || workOrder.itemId?.slice(0, 8)} &mdash;{' '}
              {(workOrder as any).itemDescription || 'Product'}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl text-2xl font-bold ${statusColor}`}>
            {workOrder.status.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Progress Bar */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Production Progress</span>
            <span className="text-2xl font-bold text-slate-900">{pct}%</span>
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
              {workOrder.qtyCompleted.toLocaleString()} completed
            </span>
            <span>
              {workOrder.qtyOrdered.toLocaleString()} ordered
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
              <button
                onClick={() => setActiveModal('startWorkOrder')}
                className="h-14 text-lg rounded-xl font-semibold w-full bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50"
              >
                Start Work Order
              </button>
            )}
            {nextReadyOp && (
              <button
                onClick={() => setActiveModal('startOperation')}
                className="h-14 text-lg rounded-xl font-semibold w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                Start Operation
              </button>
            )}
            {currentInProgressOp && (
              <button
                onClick={() => setActiveModal('completeOperation')}
                className="h-14 text-lg rounded-xl font-semibold w-full bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
              >
                Complete Operation
              </button>
            )}
            {(workOrder.status === 'RELEASED' || workOrder.status === 'IN_PROGRESS') && (
              <button
                onClick={() => setActiveModal('issueMaterial')}
                className="h-14 text-lg rounded-xl font-semibold w-full bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors"
              >
                Issue Material
              </button>
            )}
            {workOrder.status === 'IN_PROGRESS' && (
              <button
                onClick={() => setActiveModal('recordOutput')}
                className="h-14 text-lg rounded-xl font-semibold w-full bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                Record Output
              </button>
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
                        {issued.toLocaleString()} / {required.toLocaleString()}
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
          title="Start Work Order"
          onClose={() => setActiveModal(null)}
        >
          <p className="text-slate-600 mb-6">
            Start production on <span className="font-semibold">{workOrder.workOrderNo}</span>?
            This will change the status to In Progress.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveModal(null)}
              className="flex-1 h-12 rounded-xl font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={startWorkOrder.isPending}
              onClick={async () => {
                try {
                  await startWorkOrder.mutateAsync(workOrder.id);
                  setActiveModal(null);
                } catch {
                  // error handled by query
                }
              }}
              className="flex-1 h-12 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50"
            >
              {startWorkOrder.isPending ? 'Starting...' : 'Confirm Start'}
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'startOperation' && nextReadyOp && (
        <Modal
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
            <button
              onClick={() => setActiveModal(null)}
              className="flex-1 h-12 rounded-xl font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={startOperation.isPending}
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
              className="flex-1 h-12 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {startOperation.isPending ? 'Starting...' : 'Start Operation'}
            </button>
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
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Wrapper
// ---------------------------------------------------------------------------

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
        {children}
      </div>
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
    <Modal title="Complete Operation" onClose={onClose}>
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
            Qty Scrapped
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
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-xl font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={!qtyCompleted || completeOperation.isPending}
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
        >
          {completeOperation.isPending ? 'Completing...' : 'Complete'}
        </button>
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
    <Modal title="Issue Material" onClose={onClose}>
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
                {(m.qtyRequired - m.qtyIssued + (m.qtyReturned || 0)).toLocaleString()}
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
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-xl font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={!selectedMaterialId || !qty || !binId || issueMaterial.isPending}
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl font-semibold bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transition-colors disabled:opacity-50"
        >
          {issueMaterial.isPending ? 'Issuing...' : 'Issue Material'}
        </button>
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
  onClose,
}: {
  workOrderId: string;
  bins: any[];
  recordOutput: ReturnType<typeof useRecordOutput>;
  onClose: () => void;
}) {
  const [qty, setQty] = useState('');
  const [binId, setBinId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [notes, setNotes] = useState('');

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
    <Modal title="Record Output" onClose={onClose}>
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
            Batch #
          </label>
          <Input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="Optional"
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
            className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 h-12 rounded-xl font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={!qty || !binId || recordOutput.isPending}
          onClick={handleSubmit}
          className="flex-1 h-12 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50"
        >
          {recordOutput.isPending ? 'Recording...' : 'Record Output'}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'IN_PROGRESS'
      ? 'bg-amber-100 text-amber-800'
      : status === 'RELEASED'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${styles}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
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
