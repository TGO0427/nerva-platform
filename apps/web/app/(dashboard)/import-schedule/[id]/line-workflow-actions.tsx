'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  useUpdateImportShipmentLineStatus,
  useCompleteInspection,
  useStartReceiving,
  useCompleteReceiving,
} from '@/lib/queries';
import { INSPECTION_FAILURE_REASONS } from '@nerva/shared';
import type { ImportShipmentLine } from '@nerva/shared';
import { InspectionModal } from './inspection-modal';
import { StartReceivingModal, CompleteReceivingModal } from './receiving-modals';

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  INSPECTION_FAILURE_REASONS.map((r) => [r.value, r.label])
);

interface LineWorkflowActionsProps {
  shipmentId: string;
  line: ImportShipmentLine;
}

export function LineWorkflowActions({ shipmentId, line }: LineWorkflowActionsProps) {
  const { addToast } = useToast();
  const updateStatus = useUpdateImportShipmentLineStatus();
  const completeInspection = useCompleteInspection();
  const startReceiving = useStartReceiving();
  const completeReceiving = useCompleteReceiving();

  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showStartReceivingModal, setShowStartReceivingModal] = useState(false);
  const [showCompleteReceivingModal, setShowCompleteReceivingModal] = useState(false);

  const setStatus = async (status: string, label: string) => {
    try {
      await updateStatus.mutateAsync({ shipmentId, lineId: line.id, status: status as any });
      addToast(label, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const handleInspection = async (data: { passed: boolean; reason?: string; notes?: string }) => {
    try {
      await completeInspection.mutateAsync({ shipmentId, lineId: line.id, data });
      addToast(data.passed ? 'Inspection passed' : 'Inspection failed — NCR created', data.passed ? 'success' : 'warning');
      setShowInspectionModal(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to record inspection', 'error');
    }
  };

  const handleStartReceiving = async (data: { warehouseId?: string }) => {
    try {
      await startReceiving.mutateAsync({ shipmentId, lineId: line.id, data });
      addToast('Receiving started', 'success');
      setShowStartReceivingModal(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start receiving', 'error');
    }
  };

  const handleCompleteReceiving = async (data: {
    receivedQty?: number;
    binId?: string;
    binLocation?: string;
    batchNo?: string;
    expiryDate?: string;
    discrepancyNotes?: string;
  }) => {
    try {
      await completeReceiving.mutateAsync({ shipmentId, lineId: line.id, data });
      addToast('Receiving complete — stored', 'success');
      setShowCompleteReceivingModal(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to complete receiving', 'error');
    }
  };

  switch (line.status) {
    case 'ARRIVED_PTA':
    case 'ARRIVED_KLM':
    case 'ARRIVED_OFFSITE':
      return (
        <Button size="sm" onClick={() => setStatus('UNLOADING', 'Unloading started')} isLoading={updateStatus.isPending}>
          Start Unloading
        </Button>
      );

    case 'UNLOADING':
      return (
        <Button size="sm" onClick={() => setStatus('INSPECTION_PENDING', 'Unloading complete')} isLoading={updateStatus.isPending}>
          Complete Unloading
        </Button>
      );

    case 'INSPECTION_PENDING':
      return (
        <Button size="sm" onClick={() => setStatus('INSPECTING', 'Inspection started')} isLoading={updateStatus.isPending}>
          Start Inspection
        </Button>
      );

    case 'INSPECTING':
      return (
        <>
          <Button size="sm" onClick={() => setShowInspectionModal(true)}>Record Inspection Result</Button>
          <InspectionModal
            isOpen={showInspectionModal}
            onClose={() => setShowInspectionModal(false)}
            onSubmit={handleInspection}
            isSubmitting={completeInspection.isPending}
          />
        </>
      );

    case 'INSPECTION_FAILED':
      return (
        <div className="space-y-2">
          <div className="text-sm text-slate-600 space-y-0.5">
            {line.inspectedBy && <p><span className="font-medium">Inspected by:</span> {line.inspectedBy}</p>}
            {line.inspectionReason && (
              <p><span className="font-medium">Reason:</span> {REASON_LABELS[line.inspectionReason] || line.inspectionReason}</p>
            )}
            {line.inspectionNotes && <p><span className="font-medium">Notes:</span> {line.inspectionNotes}</p>}
            {line.ncrId && <p className="text-amber-700">NCR created for this failure.</p>}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setStatus('INSPECTING', 'Ready to re-inspect')} isLoading={updateStatus.isPending}>
            Re-inspect
          </Button>
        </div>
      );

    case 'INSPECTION_PASSED':
      return (
        <>
          <Button size="sm" onClick={() => setShowStartReceivingModal(true)}>Start Receiving</Button>
          <StartReceivingModal
            isOpen={showStartReceivingModal}
            onClose={() => setShowStartReceivingModal(false)}
            onSubmit={handleStartReceiving}
            requiresWarehouse={!!line.itemId}
            isSubmitting={startReceiving.isPending}
          />
        </>
      );

    case 'RECEIVING':
      return (
        <>
          <Button size="sm" onClick={() => setShowCompleteReceivingModal(true)}>Complete Receiving</Button>
          <CompleteReceivingModal
            isOpen={showCompleteReceivingModal}
            onClose={() => setShowCompleteReceivingModal(false)}
            onSubmit={handleCompleteReceiving}
            grnId={line.grnId}
            isSubmitting={completeReceiving.isPending}
          />
        </>
      );

    case 'RECEIVED':
    case 'STORED':
      return (
        <div className="space-y-2">
          <div className="text-sm text-slate-600 space-y-0.5">
            {line.receivedBy && <p><span className="font-medium">Received by:</span> {line.receivedBy}</p>}
            {line.receivedQty != null && <p><span className="font-medium">Qty received:</span> {line.receivedQty}</p>}
            {line.receivingBinLocation && <p><span className="font-medium">Bin:</span> {line.receivingBinLocation}</p>}
            {line.discrepancyNotes && <p><span className="font-medium">Discrepancies:</span> {line.discrepancyNotes}</p>}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setStatus('ARCHIVED', 'Shipment line archived')} isLoading={updateStatus.isPending}>
            Archive
          </Button>
        </div>
      );

    case 'ARCHIVED':
      return <p className="text-sm text-slate-500">Archived.</p>;

    default:
      return null;
  }
}
