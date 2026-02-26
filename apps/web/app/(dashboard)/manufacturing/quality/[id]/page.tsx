'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import {
  useNonConformance,
  useUpdateNonConformance,
  useResolveNonConformance,
  useCloseNonConformance,
} from '@/lib/queries';
import type { NonConformanceStatus, NcSeverity, NcDisposition } from '@nerva/shared';

const DISPOSITION_OPTIONS: { value: NcDisposition; label: string }[] = [
  { value: 'USE_AS_IS', label: 'Use As Is' },
  { value: 'REWORK', label: 'Rework' },
  { value: 'SCRAP', label: 'Scrap' },
  { value: 'RETURN_TO_SUPPLIER', label: 'Return to Supplier' },
  { value: 'SORT_AND_INSPECT', label: 'Sort and Inspect' },
];

function getStatusVariant(status: NonConformanceStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'OPEN':
      return 'info';
    case 'UNDER_REVIEW':
      return 'warning';
    case 'RESOLVED':
      return 'success';
    case 'CLOSED':
      return 'default';
    default:
      return 'default';
  }
}

function getSeverityVariant(severity: NcSeverity): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (severity) {
    case 'MINOR':
      return 'default';
    case 'MAJOR':
      return 'warning';
    case 'CRITICAL':
      return 'danger';
    default:
      return 'default';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export default function NcDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();

  const { data: nc, isLoading, error } = useNonConformance(id);
  const updateNc = useUpdateNonConformance();
  const resolveNc = useResolveNonConformance();
  const closeNc = useCloseNonConformance();

  const [showResolveForm, setShowResolveForm] = useState(false);
  const [disposition, setDisposition] = useState<NcDisposition | ''>('');
  const [correctiveAction, setCorrectiveAction] = useState('');

  // Sync existing disposition/corrective action into form
  useEffect(() => {
    if (nc) {
      setDisposition(nc.disposition || '');
      setCorrectiveAction(nc.correctiveAction || '');
    }
  }, [nc]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Breadcrumbs />
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !nc) {
    return (
      <div className="p-6">
        <Breadcrumbs />
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Non-conformance not found</h2>
          <p className="mt-2 text-slate-500">The record you are looking for does not exist.</p>
          <Link href="/manufacturing/quality">
            <Button className="mt-4">Back to Quality</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleBeginReview = async () => {
    try {
      await updateNc.mutateAsync({ id, status: 'UNDER_REVIEW' as NonConformanceStatus });
      addToast('NC moved to Under Review', 'success');
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const handleResolve = async () => {
    if (!disposition) {
      addToast('Please select a disposition', 'error');
      return;
    }
    if (!correctiveAction.trim()) {
      addToast('Please enter a corrective action', 'error');
      return;
    }
    try {
      await resolveNc.mutateAsync({
        id,
        disposition: disposition as string,
        correctiveAction: correctiveAction.trim(),
      });
      addToast('NC resolved successfully', 'success');
      setShowResolveForm(false);
    } catch {
      addToast('Failed to resolve NC', 'error');
    }
  };

  const handleClose = async () => {
    try {
      await closeNc.mutateAsync(id);
      addToast('NC closed successfully', 'success');
    } catch {
      addToast('Failed to close NC', 'error');
    }
  };

  const handleSaveDisposition = async () => {
    try {
      await updateNc.mutateAsync({
        id,
        disposition: disposition || undefined,
        correctiveAction: correctiveAction || undefined,
      } as { id: string; disposition?: string; correctiveAction?: string });
      addToast('Disposition saved', 'success');
    } catch {
      addToast('Failed to save disposition', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{nc.ncNo}</h1>
            <p className="text-sm text-slate-500 mt-1">Non-Conformance Report</p>
          </div>
          <Badge variant={getSeverityVariant(nc.severity)} className="text-sm">
            {nc.severity}
          </Badge>
          <Badge variant={getStatusVariant(nc.status)} className="text-sm">
            {formatStatus(nc.status)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {nc.status === 'OPEN' && (
            <Button
              onClick={handleBeginReview}
              disabled={updateNc.isPending}
            >
              {updateNc.isPending ? 'Updating...' : 'Begin Review'}
            </Button>
          )}
          {nc.status === 'UNDER_REVIEW' && !showResolveForm && (
            <Button onClick={() => setShowResolveForm(true)}>
              Resolve
            </Button>
          )}
          {nc.status === 'RESOLVED' && (
            <Button
              onClick={handleClose}
              disabled={closeNc.isPending}
            >
              {closeNc.isPending ? 'Closing...' : 'Close NC'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => router.push('/manufacturing/quality')}>
            Back to List
          </Button>
        </div>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <Label>Defect Type</Label>
              <p className="mt-1 text-slate-900 font-medium">{nc.defectType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <Label>Reported By</Label>
              <p className="mt-1 text-slate-900">{nc.reportedByName || nc.reportedBy}</p>
            </div>
            <div>
              <Label>Date Reported</Label>
              <p className="mt-1 text-slate-900">{new Date(nc.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <Label>Work Order</Label>
              <p className="mt-1">
                {nc.workOrderId && nc.workOrderNo ? (
                  <Link
                    href={`/manufacturing/work-orders/${nc.workOrderId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {nc.workOrderNo}
                  </Link>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </p>
            </div>
            <div>
              <Label>Product</Label>
              <p className="mt-1 text-slate-900">
                {nc.itemSku || '-'}
                {nc.itemDescription && (
                  <span className="text-slate-500 ml-2 text-sm">{nc.itemDescription}</span>
                )}
              </p>
            </div>
            <div>
              <Label>Qty Affected</Label>
              <p className="mt-1 text-slate-900 font-medium">{nc.qtyAffected.toLocaleString()}</p>
            </div>
            <div className="col-span-full">
              <Label>Description</Label>
              <p className="mt-1 text-slate-900 whitespace-pre-wrap">{nc.description}</p>
            </div>
            {nc.resolvedBy && (
              <>
                <div>
                  <Label>Resolved By</Label>
                  <p className="mt-1 text-slate-900">{nc.resolvedByName || nc.resolvedBy}</p>
                </div>
                <div>
                  <Label>Resolved At</Label>
                  <p className="mt-1 text-slate-900">
                    {nc.resolvedAt ? new Date(nc.resolvedAt).toLocaleString() : '-'}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disposition Section */}
      <Card>
        <CardHeader>
          <CardTitle>Disposition &amp; Corrective Action</CardTitle>
        </CardHeader>
        <CardContent>
          {nc.status === 'CLOSED' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Disposition</Label>
                <p className="mt-1 text-slate-900 font-medium">
                  {nc.disposition ? nc.disposition.replace(/_/g, ' ') : '-'}
                </p>
              </div>
              <div>
                <Label>Corrective Action</Label>
                <p className="mt-1 text-slate-900 whitespace-pre-wrap">
                  {nc.correctiveAction || '-'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="disposition">Disposition Type</Label>
                <select
                  id="disposition"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-primary-500 focus:ring-primary-500"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value as NcDisposition)}
                >
                  <option value="">Select disposition...</option>
                  {DISPOSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="correctiveAction">Corrective Action</Label>
                <textarea
                  id="correctiveAction"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-primary-500 focus:ring-primary-500"
                  rows={4}
                  placeholder="Describe the corrective action taken..."
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                />
              </div>
              {nc.status !== 'RESOLVED' && (
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={handleSaveDisposition}
                    disabled={updateNc.isPending}
                  >
                    {updateNc.isPending ? 'Saving...' : 'Save Draft'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Form (inline modal) */}
      {showResolveForm && nc.status === 'UNDER_REVIEW' && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle>Resolve Non-Conformance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Confirm the disposition and corrective action to resolve this NC.
            </p>
            {!disposition && (
              <p className="text-sm text-red-600 mb-2">
                Please select a disposition above before resolving.
              </p>
            )}
            {!correctiveAction.trim() && (
              <p className="text-sm text-red-600 mb-2">
                Please enter a corrective action above before resolving.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowResolveForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={resolveNc.isPending || !disposition || !correctiveAction.trim()}
              >
                {resolveNc.isPending ? 'Resolving...' : 'Confirm Resolve'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
