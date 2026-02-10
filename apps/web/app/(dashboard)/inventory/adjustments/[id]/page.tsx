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
import {
  useAdjustment,
  useAdjustmentLines,
  useAddAdjustmentLine,
  useDeleteAdjustmentLine,
  useSubmitAdjustment,
  useApproveAdjustment,
  usePostAdjustment,
} from '@/lib/queries/inventory';
import { useWarehouses, useBins } from '@/lib/queries/warehouses';
import { useItems } from '@/lib/queries';
import type { AdjustmentLine } from '@nerva/shared';

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

  const [showLineForm, setShowLineForm] = useState(false);
  const [newBinId, setNewBinId] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [newQtyAfter, setNewQtyAfter] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('');

  const warehouseName = warehouses?.find(w => w.id === adjustment?.warehouseId)?.name || '';
  const items = itemsData?.data || [];
  const itemMap = new Map(items.map(i => [i.id, i]));
  const binMap = new Map(bins?.map(b => [b.id, b]) || []);

  const isDraft = adjustment?.status === 'DRAFT';
  const isSubmitted = adjustment?.status === 'SUBMITTED';
  const isApproved = adjustment?.status === 'APPROVED';

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBinId || !newItemId || newQtyAfter === '') return;
    try {
      await addLine.mutateAsync({
        binId: newBinId,
        itemId: newItemId,
        qtyAfter: parseFloat(newQtyAfter),
        batchNo: newBatchNo || undefined,
      });
      setNewBinId('');
      setNewItemId('');
      setNewQtyAfter('');
      setNewBatchNo('');
      setShowLineForm(false);
    } catch (error) {
      console.error('Failed to add line:', error);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!confirm('Remove this line?')) return;
    try {
      await deleteLine.mutateAsync(lineId);
    } catch (error) {
      console.error('Failed to delete line:', error);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Submit this adjustment for approval? Lines cannot be changed after submission.')) return;
    try {
      await submitAdj.mutateAsync(id);
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this adjustment?')) return;
    try {
      await approveAdj.mutateAsync(id);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handlePost = async () => {
    if (!confirm('Post this adjustment? This will update stock levels and cannot be undone.')) return;
    try {
      await postAdj.mutateAsync(id);
    } catch (error) {
      console.error('Failed to post:', error);
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
              {new Date(adjustment.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Net Change</p>
            <p className={`text-lg font-semibold ${
              totalDelta > 0 ? 'text-green-600' : totalDelta < 0 ? 'text-red-600' : 'text-slate-900'
            }`}>
              {totalDelta > 0 ? '+' : ''}{totalDelta}
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

      {/* Lines section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Adjustment Lines ({lines?.length || 0})</CardTitle>
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
                  label="Bin"
                  value={newBinId}
                  onChange={(e) => setNewBinId(e.target.value)}
                  options={bins?.filter(b => b.isActive).map(b => ({
                    value: b.id,
                    label: `${b.code} (${b.binType})`,
                  })) || []}
                  placeholder="Select bin"
                  required
                />
                <Select
                  label="Item"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  options={items.map(i => ({
                    value: i.id,
                    label: `${i.sku} - ${i.description}`,
                  }))}
                  placeholder="Select item"
                  required
                />
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
                <Input
                  label="Batch No (optional)"
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  placeholder="Batch number"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={addLine.isPending}>
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
                        <td className="py-3 px-4 text-right">{line.qtyBefore}</td>
                        <td className="py-3 px-4 text-right">{line.qtyAfter}</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          line.qtyDelta > 0 ? 'text-green-600' : line.qtyDelta < 0 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {line.qtyDelta > 0 ? '+' : ''}{line.qtyDelta}
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
              {adjustment.approvedAt && new Date(adjustment.approvedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
