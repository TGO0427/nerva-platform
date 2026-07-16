'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  useStartSupplierNcr,
  useResolveSupplierNcr,
  useCloseSupplierNcr,
  useReopenSupplierNcr,
} from '@/lib/queries/suppliers';
import { ResolveNcrModal, type ResolveNcrFormData } from '@/components/resolve-ncr-modal';
import type { SupplierNcr } from '@nerva/shared';

interface NcrStatusActionsProps {
  ncr: SupplierNcr;
}

export function NcrStatusActions({ ncr }: NcrStatusActionsProps) {
  const { addToast } = useToast();
  const start = useStartSupplierNcr();
  const resolve = useResolveSupplierNcr();
  const close = useCloseSupplierNcr();
  const reopen = useReopenSupplierNcr();
  const [showResolveModal, setShowResolveModal] = useState(false);

  const args = { ncrId: ncr.id, supplierId: ncr.supplierId };

  const handleStart = async () => {
    try {
      await start.mutateAsync(args);
      addToast('NCR started', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start NCR', 'error');
    }
  };

  const handleResolve = async (data: ResolveNcrFormData) => {
    try {
      await resolve.mutateAsync({ ncrId: ncr.id, supplierId: ncr.supplierId, ...data });
      addToast('NCR resolved', 'success');
      setShowResolveModal(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to resolve NCR', 'error');
    }
  };

  const handleClose = async () => {
    try {
      await close.mutateAsync(args);
      addToast('NCR closed', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to close NCR', 'error');
    }
  };

  const handleReopen = async () => {
    try {
      await reopen.mutateAsync(args);
      addToast('NCR reopened', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to reopen NCR', 'error');
    }
  };

  switch (ncr.status) {
    case 'OPEN':
      return (
        <Button size="sm" onClick={handleStart} isLoading={start.isPending}>
          Start
        </Button>
      );

    case 'IN_PROGRESS':
      return (
        <>
          <Button size="sm" onClick={() => setShowResolveModal(true)}>
            Resolve
          </Button>
          <ResolveNcrModal
            isOpen={showResolveModal}
            onClose={() => setShowResolveModal(false)}
            onSubmit={handleResolve}
            isSubmitting={resolve.isPending}
          />
        </>
      );

    case 'RESOLVED':
      return (
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={handleClose} isLoading={close.isPending}>Close</Button>
          <Button size="sm" variant="secondary" onClick={handleReopen} isLoading={reopen.isPending}>Reopen</Button>
        </div>
      );

    case 'CLOSED':
      return (
        <Button size="sm" variant="secondary" onClick={handleReopen} isLoading={reopen.isPending}>
          Reopen
        </Button>
      );

    default:
      return null;
  }
}
