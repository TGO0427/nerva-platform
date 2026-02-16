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
  useCycleCount,
  useCycleCountLines,
  useAddCycleCountLine,
  useAddCycleCountLinesFromBin,
  useRemoveCycleCountLine,
  useStartCycleCount,
  useRecordCount,
  useCompleteCycleCount,
  useGenerateAdjustmentFromCycleCount,
  useCloseCycleCount,
  useCancelCycleCount,
  useDeleteCycleCount,
  type CycleCountLineDetail,
} from '@/lib/queries/inventory';
import { useWarehouses, useBins } from '@/lib/queries/warehouses';
import { useItems } from '@/lib/queries';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  PENDING_APPROVAL: 'default',
  CLOSED: 'success',
  CANCELLED: 'danger',
};

export default function CycleCountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: cc, isLoading } = useCycleCount(id);
  const { data: lines, isLoading: linesLoading } = useCycleCountLines(id);
  const { data: warehouses } = useWarehouses();
  const { data: bins } = useBins(cc?.warehouseId);
  const { data: itemsData } = useItems({ page: 1, limit: 500 });

  const addLine = useAddCycleCountLine(id);
  const addFromBin = useAddCycleCountLinesFromBin(id);
  const removeLine = useRemoveCycleCountLine(id);
  const startCount = useStartCycleCount();
  const recordCount = useRecordCount(id);
  const completeCount = useCompleteCycleCount();
  const generateAdj = useGenerateAdjustmentFromCycleCount();
  const closeCount = useCloseCycleCount();
  const cancelCount = useCancelCycleCount();
  const deleteCycleCount = useDeleteCycleCount();

  const [showAddLine, setShowAddLine] = useState(false);
  const [showAddFromBin, setShowAddFromBin] = useState(false);
  const [newBinId, setNewBinId] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [bulkBinId, setBulkBinId] = useState('');
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});

  const warehouseName = warehouses?.find(w => w.id === cc?.warehouseId)?.name || '';
  const items = itemsData?.data || [];

  const isOpen = cc?.status === 'OPEN';
  const isInProgress = cc?.status === 'IN_PROGRESS';
  const isPendingApproval = cc?.status === 'PENDING_APPROVAL';

  const countedLines = lines?.filter(l => l.countedQty !== null).length || 0;
  const totalLines = lines?.length || 0;
  const varianceLines = lines?.filter(l => l.countedQty !== null && l.varianceQty !== 0) || [];
  const totalVariance = varianceLines.reduce((sum, l) => sum + Math.abs(l.varianceQty), 0);

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBinId || !newItemId) return;
    try {
      await addLine.mutateAsync({ binId: newBinId, itemId: newItemId });
      setNewBinId('');
      setNewItemId('');
      setShowAddLine(false);
    } catch (error) {
      console.error('Failed to add line:', error);
    }
  };

  const handleAddFromBin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkBinId) return;
    try {
      await addFromBin.mutateAsync({ binId: bulkBinId });
      setBulkBinId('');
      setShowAddFromBin(false);
    } catch (error) {
      console.error('Failed to add lines from bin:', error);
    }
  };

  const handleRecordCount = async (lineId: string) => {
    const val = countInputs[lineId];
    if (val === undefined || val === '') return;
    try {
      await recordCount.mutateAsync({ lineId, countedQty: parseFloat(val) });
      setCountInputs((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
    } catch (error) {
      console.error('Failed to record count:', error);
    }
  };

  const handleStart = async () => {
    if (!confirm('Start counting? Lines cannot be added or removed after starting.')) return;
    try {
      await startCount.mutateAsync(id);
    } catch (error) {
      console.error('Failed to start:', error);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Complete counting? All lines must be counted.')) return;
    try {
      await completeCount.mutateAsync(id);
    } catch (error) {
      console.error('Failed to complete:', error);
    }
  };

  const handleGenerateAdjustment = async () => {
    if (!confirm('Generate a stock adjustment from the variances?')) return;
    try {
      const adj = await generateAdj.mutateAsync(id);
      router.push(`/inventory/adjustments/${adj.id}`);
    } catch (error) {
      console.error('Failed to generate adjustment:', error);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this cycle count?')) return;
    try {
      await closeCount.mutateAsync(id);
    } catch (error) {
      console.error('Failed to close:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this cycle count? This cannot be undone.')) return;
    try {
      await cancelCount.mutateAsync(id);
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!cc) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Cycle count not found</p>
        <Link href="/inventory/cycle-counts" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Cycle Counts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{cc.countNo}</h1>
          <Badge variant={statusVariant[cc.status] || 'info'}>
            {cc.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="flex gap-2">
          {isOpen && (
            <>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete this cycle count?')) return;
                  await deleteCycleCount.mutateAsync(id);
                  router.push('/inventory/cycle-counts');
                }}
                disabled={deleteCycleCount.isPending}
              >
                {deleteCycleCount.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button onClick={handleStart} disabled={startCount.isPending || totalLines === 0}>
                {startCount.isPending ? 'Starting...' : 'Start Counting'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleCancel} disabled={cancelCount.isPending}>
                Cancel
              </Button>
            </>
          )}
          {isInProgress && (
            <>
              <Button
                onClick={handleComplete}
                disabled={completeCount.isPending || countedLines < totalLines}
              >
                {completeCount.isPending ? 'Completing...' : 'Complete Count'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleCancel} disabled={cancelCount.isPending}>
                Cancel
              </Button>
            </>
          )}
          {isPendingApproval && (
            <>
              <Button
                onClick={handleGenerateAdjustment}
                disabled={generateAdj.isPending || varianceLines.length === 0}
              >
                {generateAdj.isPending ? 'Generating...' : 'Generate Adjustment'}
              </Button>
              <Button variant="secondary" onClick={handleClose} disabled={closeCount.isPending}>
                {closeCount.isPending ? 'Closing...' : 'Close'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Warehouse</p>
            <p className="text-lg font-semibold">{warehouseName || '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Progress</p>
            <p className="text-lg font-semibold">{countedLines} / {totalLines} lines</p>
            {totalLines > 0 && (
              <div className="mt-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${(countedLines / totalLines) * 100}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Variances</p>
            <p className={`text-lg font-semibold ${varianceLines.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {varianceLines.length} lines
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Abs. Variance</p>
            <p className={`text-lg font-semibold ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalVariance}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lines section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Count Lines ({totalLines})</CardTitle>
            {isOpen && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setShowAddFromBin(!showAddFromBin); setShowAddLine(false); }}>
                  {showAddFromBin ? 'Cancel' : 'Add All from Bin'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { setShowAddLine(!showAddLine); setShowAddFromBin(false); }}>
                  {showAddLine ? 'Cancel' : 'Add Line'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add from bin form */}
          {showAddFromBin && isOpen && (
            <form onSubmit={handleAddFromBin} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Select
                    label="Bin"
                    value={bulkBinId}
                    onChange={(e) => setBulkBinId(e.target.value)}
                    options={bins?.filter(b => b.isActive).map(b => ({
                      value: b.id,
                      label: `${b.code} (${b.binType})`,
                    })) || []}
                    placeholder="Select bin"
                    required
                  />
                </div>
                <Button type="submit" size="sm" disabled={addFromBin.isPending}>
                  {addFromBin.isPending ? 'Adding...' : 'Add All Items'}
                </Button>
              </div>
            </form>
          )}

          {/* Add single line form */}
          {showAddLine && isOpen && (
            <form onSubmit={handleAddLine} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div className="flex justify-end mt-4">
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
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Bin</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Item</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500">System Qty</th>
                    {(isInProgress || isPendingApproval || cc.status === 'CLOSED') && (
                      <>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Counted Qty</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">Variance</th>
                      </>
                    )}
                    {isInProgress && (
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Count</th>
                    )}
                    {isOpen && (
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      status={cc.status}
                      countInput={countInputs[line.id] ?? ''}
                      onCountInputChange={(val) =>
                        setCountInputs((prev) => ({ ...prev, [line.id]: val }))
                      }
                      onRecord={() => handleRecordCount(line.id)}
                      onRemove={() => {
                        if (confirm('Remove this line?')) removeLine.mutate(line.id);
                      }}
                      isRecording={recordCount.isPending}
                    />
                  ))}
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
              {isOpen && (
                <p className="text-sm text-slate-400 mt-1">
                  Use &quot;Add All from Bin&quot; to populate items from a bin
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LineRow({
  line,
  status,
  countInput,
  onCountInputChange,
  onRecord,
  onRemove,
  isRecording,
}: {
  line: CycleCountLineDetail;
  status: string;
  countInput: string;
  onCountInputChange: (val: string) => void;
  onRecord: () => void;
  onRemove: () => void;
  isRecording: boolean;
}) {
  const isOpen = status === 'OPEN';
  const isInProgress = status === 'IN_PROGRESS';
  const showCounted = isInProgress || status === 'PENDING_APPROVAL' || status === 'CLOSED';
  const isCounted = line.countedQty !== null;

  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 ${
      isCounted && line.varianceQty !== 0 ? 'bg-red-50' : ''
    }`}>
      <td className="py-3 px-4">{line.binCode || line.binId}</td>
      <td className="py-3 px-4">
        <div>
          <span className="font-medium">{line.itemSku || line.itemId}</span>
          {line.itemDescription && (
            <span className="text-slate-500 ml-2">{line.itemDescription}</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-right">{line.systemQty}</td>
      {showCounted && (
        <>
          <td className="py-3 px-4 text-right">
            {isCounted ? line.countedQty : '-'}
          </td>
          <td className={`py-3 px-4 text-right font-medium ${
            !isCounted ? 'text-slate-400' :
            line.varianceQty > 0 ? 'text-orange-600' :
            line.varianceQty < 0 ? 'text-red-600' :
            'text-green-600'
          }`}>
            {!isCounted ? '-' : line.varianceQty > 0 ? `+${line.varianceQty}` : line.varianceQty}
          </td>
        </>
      )}
      {isInProgress && (
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              min="0"
              step="1"
              className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-right"
              value={countInput}
              onChange={(e) => onCountInputChange(e.target.value)}
              placeholder={isCounted ? String(line.countedQty) : '0'}
            />
            <Button
              size="sm"
              variant={isCounted ? 'secondary' : 'primary'}
              onClick={onRecord}
              disabled={isRecording || countInput === ''}
            >
              {isCounted ? 'Update' : 'Record'}
            </Button>
          </div>
        </td>
      )}
      {isOpen && (
        <td className="py-3 px-4 text-right">
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </td>
      )}
    </tr>
  );
}
