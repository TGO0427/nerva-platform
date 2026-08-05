'use client';

import { Badge, BadgeVariant } from './badge';
import { Button } from './button';
import { useSetBatchQualityStatus, useBatchQualityStatus } from '@/lib/queries/manufacturing';
import { useToast } from './toast';
import type { BatchQualityStatus } from '@nerva/shared';

const LABELS: Record<BatchQualityStatus, string> = {
  AWAITING_QC: 'Awaiting QC',
  ON_HOLD: 'On Hold',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RELEASED: 'Released',
};

const VARIANTS: Record<BatchQualityStatus, BadgeVariant> = {
  AWAITING_QC: 'default',
  ON_HOLD: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  RELEASED: 'success',
};

const NEXT_STEPS: Record<BatchQualityStatus, { label: string; status: BatchQualityStatus; variant?: 'primary' | 'secondary' | 'danger' }[]> = {
  AWAITING_QC: [
    { label: 'Approve', status: 'APPROVED', variant: 'primary' },
    { label: 'Hold', status: 'ON_HOLD', variant: 'secondary' },
    { label: 'Reject', status: 'REJECTED', variant: 'danger' },
  ],
  ON_HOLD: [
    { label: 'Approve', status: 'APPROVED', variant: 'primary' },
    { label: 'Reject', status: 'REJECTED', variant: 'danger' },
  ],
  APPROVED: [
    { label: 'Release', status: 'RELEASED', variant: 'primary' },
    { label: 'Put on Hold', status: 'ON_HOLD', variant: 'secondary' },
  ],
  REJECTED: [],
  RELEASED: [],
};

export function BatchQualityBadge({ status }: { status: BatchQualityStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}

/** Table-cell friendly lookup: shows the batch's QC badge, or a muted fallback if untracked/no batch. */
export function BatchQualityCell({ itemId, batchNo }: { itemId: string; batchNo: string | null | undefined }) {
  const { data: batchQuality } = useBatchQualityStatus(itemId, batchNo ?? undefined);
  if (!batchNo) return <span className="text-slate-400">-</span>;
  if (!batchQuality) return <span className="text-slate-400 text-xs">Not tracked</span>;
  return <BatchQualityBadge status={batchQuality.qualityStatus} />;
}

/** Table-cell friendly control: same lookup as BatchQualityCell, but with actionable transition buttons. */
export function BatchQualityActionCell({ itemId, batchNo }: { itemId: string; batchNo: string | null | undefined }) {
  const { data: batchQuality } = useBatchQualityStatus(itemId, batchNo ?? undefined);
  if (!batchNo) return <span className="text-slate-400">-</span>;
  if (!batchQuality) return <span className="text-slate-400 text-xs">Not tracked</span>;
  return <BatchQualityControl itemId={itemId} batchNo={batchNo} status={batchQuality.qualityStatus} />;
}

/** Badge + inline transition buttons for moving a batch through its QC lifecycle. */
export function BatchQualityControl({
  itemId,
  batchNo,
  status,
}: {
  itemId: string;
  batchNo: string;
  status: BatchQualityStatus;
}) {
  const { addToast } = useToast();
  const setStatus = useSetBatchQualityStatus();
  const nextSteps = NEXT_STEPS[status];

  const handleTransition = async (newStatus: BatchQualityStatus) => {
    try {
      await setStatus.mutateAsync({ itemId, batchNo, qualityStatus: newStatus });
      addToast(`Batch ${batchNo} moved to ${LABELS[newStatus]}`, 'success');
    } catch {
      addToast('Failed to update batch quality status', 'error');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <BatchQualityBadge status={status} />
      {nextSteps.map((step) => (
        <Button
          key={step.status}
          size="sm"
          variant={step.variant || 'secondary'}
          isLoading={setStatus.isPending}
          onClick={() => handleTransition(step.status)}
        >
          {step.label}
        </Button>
      ))}
    </div>
  );
}
