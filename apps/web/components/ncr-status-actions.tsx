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
  const [resolution, setResolution] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  const args = { ncrId: ncr.id, supplierId: ncr.supplierId };

  const handleStart = async () => {
    try {
      await start.mutateAsync(args);
      addToast('NCR started', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to start NCR', 'error');
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) return;
    try {
      await resolve.mutateAsync({ ncrId: ncr.id, supplierId: ncr.supplierId, resolution: resolution.trim() });
      addToast('NCR resolved', 'success');
      setShowResolveForm(false);
      setResolution('');
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
      if (showResolveForm) {
        return (
          <div className="flex items-center gap-1">
            <input
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Resolution..."
              className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={handleResolve} isLoading={resolve.isPending} disabled={!resolution.trim()}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowResolveForm(false)}>Cancel</Button>
          </div>
        );
      }
      return (
        <Button size="sm" onClick={() => setShowResolveForm(true)}>
          Resolve
        </Button>
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
