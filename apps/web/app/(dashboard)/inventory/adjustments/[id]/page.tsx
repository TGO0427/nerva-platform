'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { EntityHistory } from '@/components/ui/entity-history';
import { RecordDocumentsPanel, RelatedRecordsPanel } from '@/components/ui/record-panels';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useAdjustment,
  useAdjustmentLines,
  useAddAdjustmentLine,
  useDeleteAdjustmentLine,
  useSubmitAdjustment,
  useApproveAdjustment,
  usePostAdjustment,
  useDeleteAdjustment,
} from '@/lib/queries/inventory';
import { useWarehouses, useBins } from '@/lib/queries/warehouses';
import { useItems } from '@/lib/queries';
import { useStockOnHand } from '@/lib/queries/inventory';
import { formatDate, formatDateTime, formatNumber, formatQuantity } from '@/lib/format';
import type { AdjustmentLine, Bin } from '@nerva/shared';

// Distinct from the Select's empty/placeholder value, so explicitly picking
// "no batch" is never indistinguishable from not having chosen anything yet.
const NO_BATCH_SENTINEL = '__no_batch__';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'info',
  SUBMITTED: 'warning',
  APPROVED: 'default',
  POSTED: 'success',
  REJECTED: 'danger',
};

export default function AdjustmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: adjustment, isLoading } = useAdjustment(id);
  const { data: lines, isLoading: linesLoading } = useAdjustmentLines(id);
  const { data: warehouses } = useWarehouses();
  const { data: bins } = useBins(adjustment?.warehouseId);
  const { data: itemsData } = useItems({ page: 1, limit: 500 });

  const addLine = useAddAdjustmentLine(id);
  const deleteLine = useDeleteAdjustmentLine(id);
  const submitAdj = useSubmitAdjustment();
  const approveAdj = useApproveAdjustment();
  const postAdj = usePostAdjustment();
  const deleteAdj = useDeleteAdjustment();

  const [showLineForm, setShowLineForm] = useState(false);
  const [newBinId, setNewBinId] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [newQtyAfter, setNewQtyAfter] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('');

  const warehouseName = warehouses?.find(w => w.id === adjustment?.warehouseId)?.name || '';
  const items = itemsData?.data || [];
  const itemMap = new Map(items.map(i => [i.id, i]));
  const binMap = new Map(bins?.map(b => [b.id, b]) || []);

  // Adjustments correct the true physical count, so "available" here means
  // recorded on-hand (not unreserved-for-allocation like a transfer) — a
  // bin can still need correcting even if its stock is fully reserved.
  const { data: stockOnHand } = useStockOnHand(newItemId || undefined);
  const binsWithStock = new Set((stockOnHand || []).filter(s => s.qtyOnHand > 0).map(s => s.binId));
  const binsForItem = newItemId
    ? (bins || []).filter((b: Bin) => b.isActive && binsWithStock.has(b.id))
    : (bins || []).filter((b: Bin) => b.isActive);
  const batchesInBin = (stockOnHand || []).filter(s => s.binId === newBinId && s.qtyOnHand > 0);
  const currentQtyOnHand = newBatchNo
    ? batchesInBin.find(s => (s.batchNo || NO_BATCH_SENTINEL) === newBatchNo)?.qtyOnHand ?? 0
    : batchesInBin.reduce((sum, s) => sum + s.qtyOnHand, 0);
  // Only meaningful once a specific batch is chosen — the backend compares
  // qtyAfter against that exact batch's on-hand qty, not the bin's total.
  const previewDelta = newBatchNo && newQtyAfter !== ''
    ? Number(newQtyAfter) - currentQtyOnHand
    : null;

  const canAddLine = !!newItemId && !!newBinId && !!newBatchNo && newQtyAfter !== '';

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const isDraft = adjustment?.status === 'DRAFT';
  const isSubmitted = adjustment?.status === 'SUBMITTED';
  const isApproved = adjustment?.status === 'APPROVED';

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddLine) return;
    try {
      await addLine.mutateAsync({
        binId: newBinId,
        itemId: newItemId,
        qtyAfter: parseFloat(newQtyAfter),
        batchNo: newBatchNo !== NO_BATCH_SENTINEL ? newBatchNo : undefined,
      });
      addToast('Line added', 'success');
      setNewBinId('');
      setNewItemId('');
      setNewQtyAfter('');
      setNewBatchNo('');
      setShowLineForm(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to add line', 'error');
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    const confirmed = await confirm({
      title: 'Remove Line',
      message: 'Are you sure you want to remove this line?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteLine.mutateAsync(lineId);
      addToast('Line removed', 'success');
    } catch (error) {
      console.error('Failed to delete line:', error);
      addToast('Failed to remove line', 'error');
    }
  };

  const handleSubmit = async () => {
    const confirmed = await confirm({
      title: 'Submit Adjustment',
      message: 'Submit this adjustment for approval? Lines cannot be changed after submission.',
      confirmLabel: 'Submit',
    });
    if (!confirmed) return;
    try {
      await submitAdj.mutateAsync(id);
      addToast('Adjustment submitted for approval', 'success');
    } catch (error) {
      console.error('Failed to submit:', error);
      addToast('Failed to submit adjustment', 'error');
    }
  };

  const handleApprove = async () => {
    const confirmed = await confirm({
      title: 'Approve Adjustment',
      message: 'Approve this adjustment?',
      confirmLabel: 'Approve',
    });
    if (!confirmed) return;
    try {
      await approveAdj.mutateAsync(id);
      addToast('Adjustment approved', 'success');
    } catch (error) {
      console.error('Failed to approve:', error);
      addToast('Failed to approve adjustment', 'error');
    }
  };

  const handlePost = async () => {
    const confirmed = await confirm({
      title: 'Post Adjustment',
      message: 'Post this adjustment? This will update stock levels and cannot be undone.',
      confirmLabel: 'Post',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await postAdj.mutateAsync(id);
      addToast('Adjustment posted to stock', 'success');
    } catch (error) {
      console.error('Failed to post:', error);
      addToast('Failed to post adjustment', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!adjustment) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Adjustment not found</p>
        <Link href="/inventory/adjustments" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Adjustments
        </Link>
      </div>
    );
  }

  const totalDelta = (lines || []).reduce((sum, l) => sum + l.qtyDelta, 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{adjustment.adjustmentNo}</h1>
          <Badge variant={statusVariant[adjustment.status] || 'info'}>
            {adjustment.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button
              variant="danger"
              onClick={async () => {
                const confirmed = await confirm({
                  title: 'Delete Adjustment',
                  message: 'Are you sure you want to delete this adjustment?',
                  confirmLabel: 'Delete',
                  variant: 'danger',
                });
                if (!confirmed) return;
                try {
                  await deleteAdj.mutateAsync(id);
                  addToast('Adjustment deleted', 'success');
                  router.push('/inventory/adjustments');
                } catch (error) {
                  console.error('Failed to delete adjustment:', error);
                  addToast('Failed to delete adjustment', 'error');
                }
              }}
              disabled={deleteAdj.isPending}
            >
              {deleteAdj.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          {isDraft && (
            <Button
              onClick={handleSubmit}
              disabled={submitAdj.isPending || !lines?.length}
            >
              {submitAdj.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
          {isSubmitted && (
            <Button
              onClick={handleApprove}
              disabled={approveAdj.isPending}
            >
              {approveAdj.isPending ? 'Approving...' : 'Approve'}
            </Button>
          )}
          {isApproved && (
            <Button
              onClick={handlePost}
              disabled={postAdj.isPending}
            >
              {postAdj.isPending ? 'Posting...' : 'Post to Stock'}
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Warehouse</p>
            <p className="text-lg font-semibold">{warehouseName || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Reason</p>
            <p className="text-lg font-semibold">{adjustment.reason}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Created</p>
            <p className="text-lg font-semibold">
              {formatDate(adjustment.createdAt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Net Change</p>
            <p className={`text-lg font-semibold ${
              totalDelta > 0 ? 'text-green-600' : totalDelta < 0 ? 'text-red-600' : 'text-slate-900'
            }`}>
              {totalDelta > 0 ? '+' : ''}{formatQuantity(totalDelta)}
            </p>
          </CardContent>
        </Card>
      </div>

      {adjustment.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Notes</p>
            <p className="text-sm mt-1">{adjustment.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecordDocumentsPanel items={[]} />
        <RelatedRecordsPanel
          items={[
            {
              label: warehouseName || 'Warehouse',
              description: 'Warehouse affected by this stock adjustment',
              href: `/master-data/warehouses/${adjustment.warehouseId}`,
            },
            adjustment.cycleCountId ? {
              label: 'Cycle Count',
              description: 'Cycle count that generated this adjustment',
              href: `/inventory/cycle-counts/${adjustment.cycleCountId}`,
            } : null,
          ].filter((item): item is NonNullable<typeof item> => Boolean(item))}
        />
      </div>

      {/* Lines section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Adjustment Lines ({formatNumber(lines?.length || 0)})</CardTitle>
            {isDraft && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowLineForm(!showLineForm)}
              >
                {showLineForm ? 'Cancel' : 'Add Line'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add line form */}
          {showLineForm && isDraft && (
            <form onSubmit={handleAddLine} className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  label="Item"
                  value={newItemId}
                  onChange={(e) => {
                    setNewItemId(e.target.value);
                    setNewBinId('');
                    setNewBatchNo('');
                  }}
                  options={items.map(i => ({
                    value: i.id,
                    label: `${i.sku} - ${i.description}`,
                  }))}
                  placeholder="Select item"
                  required
                />
                <div>
                  <Select
                    label="Bin *"
                    value={newBinId}
                    onChange={(e) => {
                      setNewBinId(e.target.value);
                      setNewBatchNo('');
                    }}
                    options={binsForItem.map((b: Bin) => ({
                      value: b.id,
                      label: `${b.code} (${b.binType})`,
                    }))}
                    placeholder={newItemId ? 'Select bin' : 'Select item first'}
                    disabled={!newItemId}
                  />
                  {newItemId && binsForItem.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No stock of this item in any bin</p>
                  )}
                </div>
                <div>
                  <Input
                    label="Actual Qty"
                    type="number"
                    min="0"
                    step="1"
                    value={newQtyAfter}
                    onChange={(e) => setNewQtyAfter(e.target.value)}
                    placeholder="Counted qty"
                    required
                  />
                  {newBinId && (
                    <p className="text-xs text-slate-500 mt-1">
                      System shows {formatQuantity(currentQtyOnHand)}
                      {newBatchNo ? '' : ' across all batches in this bin'}
                    </p>
                  )}
                  {previewDelta !== null && previewDelta !== 0 && (
                    <p className={`text-xs mt-0.5 font-medium ${previewDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {previewDelta > 0 ? `Adjusting up by ${formatQuantity(previewDelta)}` : `Adjusting down by ${formatQuantity(Math.abs(previewDelta))}`}
                    </p>
                  )}
                  {previewDelta === 0 && (
                    <p className="text-xs mt-0.5 text-slate-400">No change</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Batch No{itemMap.get(newItemId)?.requiresBatchTracking && <span className="text-red-500"> *</span>}
                  </label>
                  {newItemId && newBinId ? (
                    <Select
                      value={newBatchNo}
                      onChange={(e) => setNewBatchNo(e.target.value)}
                      options={batchesInBin.map(s => ({
                        value: s.batchNo || NO_BATCH_SENTINEL,
                        label: `${s.batchNo || 'No batch'} (${formatQuantity(s.qtyOnHand)} on hand)`,
                      }))}
                      placeholder="Select batch"
                    />
                  ) : (
                    <Input value="" disabled placeholder="Select item and bin first" />
                  )}
                  {itemMap.get(newItemId)?.requiresBatchTracking && (
                    <p className="text-xs text-amber-600 mt-1">This item requires a batch/lot number</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={!canAddLine || addLine.isPending}>
                  {addLine.isPending ? 'Adding...' : 'Add Line'}
                </Button>
              </div>
            </form>
          )}

          {/* Lines table */}
          {linesLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : lines && lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Item</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Bin</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Batch</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Qty Before</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Qty After</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">Delta</th>
                    {isDraft && <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const item = itemMap.get(line.itemId);
                    const bin = binMap.get(line.binId);
                    return (
                      <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-medium">{item?.sku || line.itemId}</span>
                            {item?.description && (
                              <span className="text-slate-500 ml-2">{item.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{bin?.code || line.binId}</td>
                        <td className="py-3 px-4">{line.batchNo || '-'}</td>
                        <td className="py-3 px-4 text-right">{formatQuantity(line.qtyBefore)}</td>
                        <td className="py-3 px-4 text-right">{formatQuantity(line.qtyAfter)}</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          line.qtyDelta > 0 ? 'text-green-600' : line.qtyDelta < 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {line.qtyDelta > 0 ? '+' : ''}{formatQuantity(line.qtyDelta)}
                        </td>
                        {isDraft && (
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLine(line.id)}
                              disabled={deleteLine.isPending}
                            >
                              Remove
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-slate-500">No lines added yet</p>
              {isDraft && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowLineForm(true)}
                >
                  Add First Line
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval info */}
      {adjustment.approvedBy && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Approved</p>
            <p className="text-sm mt-1">
              {formatDateTime(adjustment.approvedAt)}
            </p>
          </CardContent>
        </Card>
      )}

      <EntityHistory entityType="Adjustment" entityId={id} />
    </div>
  );
}
