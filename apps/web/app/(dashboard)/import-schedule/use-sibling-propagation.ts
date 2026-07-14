'use client';

import { useCallback } from 'react';
import api from '@/lib/api';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { SHIPPING_EXCLUDED_STATUSES } from '@nerva/shared';
import type { ImportShipmentDetail } from '@nerva/shared';
import {
  useUpdateImportShipmentLine,
  type UpdateImportShipmentLineData,
} from '@/lib/queries';

interface PropagateOptions {
  excludeShippingExcluded?: boolean;
}

export function useSiblingPropagation() {
  const { confirm } = useConfirm();
  const { addToast } = useToast();
  const updateLine = useUpdateImportShipmentLine();

  const propagate = useCallback(
    async (
      shipmentId: string,
      lineId: string,
      reference: string,
      changedFields: UpdateImportShipmentLineData,
      fieldLabel: string,
      options: PropagateOptions = {}
    ) => {
      const detailRes = await api.get<ImportShipmentDetail>(`/import-shipments/${shipmentId}`);
      let siblings = detailRes.data.lines.filter((l) => l.id !== lineId);
      if (options.excludeShippingExcluded) {
        siblings = siblings.filter((l) => !SHIPPING_EXCLUDED_STATUSES.includes(l.status));
      }
      if (siblings.length === 0) return;

      const confirmed = await confirm({
        title: `Apply ${fieldLabel} to all lines on ${reference}?`,
        message: `This order has ${siblings.length} other line${siblings.length > 1 ? 's' : ''} in the Shipping Schedule. Would you like to set ${siblings.length > 1 ? 'them all' : 'it'} to the same ${fieldLabel.toLowerCase()} too?`,
        confirmLabel: `Apply to all ${siblings.length + 1} lines`,
        cancelLabel: 'Just this line',
      });
      if (!confirmed) return;

      try {
        await Promise.all(
          siblings.map((s) =>
            updateLine.mutateAsync({ shipmentId, lineId: s.id, data: changedFields })
          )
        );
        addToast(`${fieldLabel} applied to ${siblings.length + 1} lines on ${reference}`, 'success');
      } catch {
        addToast('Updated this line, but failed to update some siblings', 'error');
      }
    },
    [confirm, addToast, updateLine]
  );

  return { propagate };
}
