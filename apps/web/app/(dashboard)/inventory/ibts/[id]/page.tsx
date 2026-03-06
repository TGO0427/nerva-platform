'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { DetailPageTemplate } from '@/components/templates';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useIbt,
  useIbtLines,
  useAddIbtLine,
  useRemoveIbtLine,
  useSubmitIbt,
  useApproveIbt,
  useStartPickingIbt,
  useShipIbt,
  useReceiveIbt,
  useCancelIbt,
  useDeleteIbt,
  type IbtLineDetail,
} from '@/lib/queries/ibt';
import { useItems } from '@/lib/queries';
import { useBins } from '@/lib/queries/warehouses';
import type { Bin } from '@nerva/shared';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  PICKING: 'info',
  IN_TRANSIT: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PICKING: 'Picking',
  IN_TRANSIT: 'In Transit',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

export default function IbtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: ibt, isLoading } = useIbt(id);
  const { data: lines, isLoading: linesLoading } = useIbtLines(id);
  const { data: itemsData } = useItems({ page: 1, limit: 200 });
  const { data: fromBins } = useBins(ibt?.fromWarehouseId);
  const { data: toBins } = useBins(ibt?.toWarehouseId);

  // Add line form state
  const [showAddLine, setShowAddLine] = useState(false);
  const [newItemId, setNewItemId] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newFromBinId, setNewFromBinId] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('');

  // Ship/receive state
  const [shipQtys, setShipQtys] = useState<Record<string, number>>({});
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiveBins, setReceiveBins] = useState<Record<string, string>>({});

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const addLine = useAddIbtLine();
  const removeLine = useRemoveIbtLine();
  const submitIbt = useSubmitIbt();
  const approveIbt = useApproveIbt();
  const startPicking = useStartPickingIbt();
  const shipIbt = useShipIbt();
  const receiveIbt = useReceiveIbt();
  const cancelIbt = useCancelIbt();
  const deleteIbt = useDeleteIbt();

  const storageBins = (toBins || []).filter(
    (b: Bin) => (b.binType === 'STORAGE' || b.binType === 'PICKING' || b.binType === 'RECEIVING') && b.isActive,
  );

  const handleAddLine = async () => {
    if (!newItemId || !newQty) return;
    try {
      await addLine.mutateAsync({
        ibtId: id,
        itemId: newItemId,
        qtyRequested: Number(newQty),
        fromBinId: newFromBinId || undefined,
        batchNo: newBatchNo || undefined,
      });
      addToast('Line added', 'success');
      setNewItemId(''); setNewQty(''); setNewFromBinId(''); setNewBatchNo('');
      setShowAddLine(false);
    } catch {
      addToast('Failed to add line', 'error');
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    const confirmed = await confirm({
      title: 'Remove Line',
      message: 'Remove this line from the transfer?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await removeLine.mutateAsync({ ibtId: id, lineId });
      addToast('Line removed', 'success');
    } catch {
      addToast('Failed to remove line', 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      await submitIbt.mutateAsync(id);
      addToast('Transfer submitted for approval', 'success');
    } catch {
      addToast('Failed to submit transfer', 'error');
    }
  };

  const handleApprove = async () => {
    try {
      await approveIbt.mutateAsync(id);
      addToast('Transfer approved', 'success');
    } catch {
      addToast('Failed to approve transfer', 'error');
    }
  };

  const handleStartPicking = async () => {
    try {
      await startPicking.mutateAsync(id);
      addToast('Picking started', 'success');
    } catch {
      addToast('Failed to start picking', 'error');
    }
  };

  const handleShip = async () => {
    if (!lines) return;
    const shipLines = lines.map((l) => ({
      lineId: l.id,
      qtyShipped: shipQtys[l.id] ?? l.qtyRequested,
    })).filter((l) => l.qtyShipped > 0);
    if (shipLines.length === 0) return;
    try {
      await shipIbt.mutateAsync({ id, lines: shipLines });
      addToast('Shipment confirmed', 'success');
      setShipQtys({});
    } catch {
      addToast('Failed to confirm shipment', 'error');
    }
  };

  const handleReceive = async () => {
    if (!lines) return;
    const rcvLines = lines
      .filter((l) => (receiveQtys[l.id] ?? l.qtyShipped) > 0 && receiveBins[l.id])
      .map((l) => ({
        lineId: l.id,
        qtyReceived: receiveQtys[l.id] ?? l.qtyShipped,
        toBinId: receiveBins[l.id],
      }));
    if (rcvLines.length === 0) return;
    try {
      await receiveIbt.mutateAsync({ id, lines: rcvLines });
      addToast('Receipt confirmed', 'success');
      setReceiveQtys({}); setReceiveBins({});
    } catch {
      addToast('Failed to confirm receipt', 'error');
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Transfer',
      message: 'Cancel this transfer? This cannot be undone.',
      confirmLabel: 'Cancel Transfer',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await cancelIbt.mutateAsync(id);
      addToast('Transfer cancelled', 'success');
    } catch {
      addToast('Failed to cancel transfer', 'error');
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Transfer',
      message: 'Are you sure you want to delete this transfer?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteIbt.mutateAsync(id);
      addToast('Transfer deleted', 'success');
      router.push('/inventory/ibts');
    } catch {
      addToast('Failed to delete transfer', 'error');
    }
  };

  const initShipQtys = () => {
    if (!lines) return;
    const qtys: Record<string, number> = {};
    lines.forEach((l) => { qtys[l.id] = l.qtyRequested; });
    setShipQtys(qtys);
  };

  const initReceiveQtys = () => {
    if (!lines) return;
    const qtys: Record<string, number> = {};
    lines.forEach((l) => { qtys[l.id] = l.qtyShipped; });
    setReceiveQtys(qtys);
  };

  // Progress calculation
  const totalRequested = lines?.reduce((sum, l) => sum + l.qtyRequested, 0) || 0;
  const totalShipped = lines?.reduce((sum, l) => sum + l.qtyShipped, 0) || 0;
  const totalReceived = lines?.reduce((sum, l) => sum + l.qtyReceived, 0) || 0;

  const progressLabel = ibt?.status === 'RECEIVED' || ibt?.status === 'IN_TRANSIT'
    ? `${totalReceived} / ${totalRequested} received`
    : `${totalShipped} / ${totalRequested} shipped`;

  const progressPct = totalRequested > 0
    ? Math.round(((ibt?.status === 'RECEIVED' || ibt?.status === 'IN_TRANSIT' ? totalReceived : totalShipped) / totalRequested) * 100)
    : 0;

  // Lines columns based on status
  const draftColumns: Column<IbtLineDetail>[] = [
    {
      key: 'itemSku',
      header: 'Item',
      render: (row) => (
        <div>
          <span className="font-medium">{row.itemSku}</span>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.itemDescription}</p>
        </div>
      ),
    },
    {
      key: 'fromBinCode',
      header: 'From Bin',
      render: (row) => row.fromBinCode ? <span className="font-mono text-sm">{row.fromBinCode}</span> : <span className="text-slate-400">Not set</span>,
    },
    { key: 'qtyRequested', header: 'Qty Requested' },
    { key: 'batchNo', header: 'Batch', render: (row) => row.batchNo || '-' },
    ...(ibt?.status === 'DRAFT'
      ? [{
          key: 'actions' as keyof IbtLineDetail,
          header: 'Actions',
          render: (row: IbtLineDetail) => (
            <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRemoveLine(row.id); }}>
              Remove
            </Button>
          ),
        }]
      : []),
  ];

  const pickingColumns: Column<IbtLineDetail>[] = [
    {
      key: 'itemSku',
      header: 'Item',
      render: (row) => (
        <div>
          <span className="font-medium">{row.itemSku}</span>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.itemDescription}</p>
        </div>
      ),
    },
    {
      key: 'fromBinCode',
      header: 'From Bin',
      render: (row) => row.fromBinCode ? <span className="font-mono text-sm">{row.fromBinCode}</span> : '-',
    },
    { key: 'qtyRequested', header: 'Requested' },
    {
      key: 'qtyShipped',
      header: 'Qty to Ship',
      render: (row) => (
        <div className="w-24" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            value={shipQtys[row.id] ?? row.qtyRequested}
            onChange={(e) => setShipQtys({ ...shipQtys, [row.id]: Number(e.target.value) })}
            min={0}
            max={row.qtyRequested}
          />
        </div>
      ),
    },
  ];

  const transitColumns: Column<IbtLineDetail>[] = [
    {
      key: 'itemSku',
      header: 'Item',
      render: (row) => (
        <div>
          <span className="font-medium">{row.itemSku}</span>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.itemDescription}</p>
        </div>
      ),
    },
    { key: 'qtyShipped', header: 'Shipped' },
    {
      key: 'qtyReceived',
      header: 'Qty to Receive',
      render: (row) => (
        <div className="w-24" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            value={receiveQtys[row.id] ?? row.qtyShipped}
            onChange={(e) => setReceiveQtys({ ...receiveQtys, [row.id]: Number(e.target.value) })}
            min={0}
            max={row.qtyShipped}
          />
        </div>
      ),
    },
    {
      key: 'toBinCode',
      header: 'To Bin',
      render: (row) => (
        <div className="w-36" onClick={(e) => e.stopPropagation()}>
          <Select
            value={receiveBins[row.id] || ''}
            onChange={(e) => setReceiveBins({ ...receiveBins, [row.id]: e.target.value })}
            options={storageBins.map((b: Bin) => ({ value: b.id, label: b.code }))}
            placeholder="Select bin"
          />
        </div>
      ),
    },
  ];

  const receivedColumns: Column<IbtLineDetail>[] = [
    {
      key: 'itemSku',
      header: 'Item',
      render: (row) => (
        <div>
          <span className="font-medium">{row.itemSku}</span>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.itemDescription}</p>
        </div>
      ),
    },
    {
      key: 'fromBinCode',
      header: 'From Bin',
      render: (row) => row.fromBinCode ? <span className="font-mono text-sm">{row.fromBinCode}</span> : '-',
    },
    {
      key: 'toBinCode',
      header: 'To Bin',
      render: (row) => row.toBinCode ? <span className="font-mono text-sm">{row.toBinCode}</span> : '-',
    },
    { key: 'qtyRequested', header: 'Requested' },
    { key: 'qtyShipped', header: 'Shipped' },
    { key: 'qtyReceived', header: 'Received' },
    { key: 'batchNo', header: 'Batch', render: (row) => row.batchNo || '-' },
  ];

  const getColumns = (): Column<IbtLineDetail>[] => {
    switch (ibt?.status) {
      case 'PICKING': return pickingColumns;
      case 'IN_TRANSIT': return transitColumns;
      case 'RECEIVED': case 'CANCELLED': return receivedColumns;
      default: return draftColumns;
    }
  };

  return (
    <DetailPageTemplate
      title={ibt?.ibtNo || 'Loading...'}
      subtitle="Inter-Branch Transfer"
      isLoading={isLoading}
      notFound={!isLoading && !ibt}
      notFoundMessage="Transfer not found"
      titleBadges={
        ibt && (
          <div className="flex gap-2">
            <Badge variant={statusVariant[ibt.status] || 'default'}>
              {statusLabel[ibt.status] || ibt.status}
            </Badge>
            <Badge variant="default">{ibt.lineCount} lines</Badge>
          </div>
        )
      }
      headerActions={
        ibt && (
          <div className="flex gap-2">
            {ibt.status === 'DRAFT' && (
              <>
                <Button onClick={handleSubmit} isLoading={submitIbt.isPending}>
                  Submit for Approval
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={deleteIbt.isPending}>
                  {deleteIbt.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
            {ibt.status === 'PENDING_APPROVAL' && (
              <>
                <Button onClick={handleApprove} isLoading={approveIbt.isPending}>
                  Approve
                </Button>
                <Button variant="danger" onClick={handleCancel}>Cancel</Button>
              </>
            )}
            {ibt.status === 'APPROVED' && (
              <Button onClick={handleStartPicking} isLoading={startPicking.isPending}>
                Start Picking
              </Button>
            )}
            {ibt.status === 'PICKING' && (
              <Button onClick={handleShip} isLoading={shipIbt.isPending}>
                Confirm Shipment
              </Button>
            )}
            {ibt.status === 'IN_TRANSIT' && (
              <Button onClick={handleReceive} isLoading={receiveIbt.isPending}>
                Confirm Receipt
              </Button>
            )}
          </div>
        )
      }
      statsColumns={4}
      stats={ibt ? [
        {
          title: 'Status',
          value: statusLabel[ibt.status] || ibt.status,
          icon: <StatusIcon />,
          iconColor: ibt.status === 'RECEIVED' ? 'green' : ibt.status === 'IN_TRANSIT' ? 'yellow' : 'blue',
        },
        {
          title: 'Route',
          value: `${ibt.fromWarehouseName} → ${ibt.toWarehouseName}`,
          icon: <RouteIcon />,
          iconColor: 'gray',
        },
        {
          title: 'Lines',
          value: ibt.lineCount,
          icon: <LinesIcon />,
          iconColor: 'blue',
        },
        {
          title: 'Progress',
          value: progressLabel,
          icon: <ProgressIcon />,
          iconColor: progressPct >= 100 ? 'green' : 'yellow',
        },
      ] : undefined}
    >
      {ibt && (
        <div className="space-y-6">
          {/* Details card */}
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-slate-500">From Warehouse</div>
                  <div className="mt-1 font-medium">{ibt.fromWarehouseName}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">To Warehouse</div>
                  <div className="mt-1 font-medium">{ibt.toWarehouseName}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Created By</div>
                  <div className="mt-1">{ibt.createdByName || 'System'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Created</div>
                  <div className="mt-1">{new Date(ibt.createdAt).toLocaleDateString()}</div>
                </div>
                {ibt.approvedByName && (
                  <div>
                    <div className="text-sm text-slate-500">Approved By</div>
                    <div className="mt-1">{ibt.approvedByName}</div>
                  </div>
                )}
                {(ibt as any).approvedAt && (
                  <div>
                    <div className="text-sm text-slate-500">Approved</div>
                    <div className="mt-1">{new Date((ibt as any).approvedAt).toLocaleDateString()}</div>
                  </div>
                )}
                {(ibt as any).shippedAt && (
                  <div>
                    <div className="text-sm text-slate-500">Shipped</div>
                    <div className="mt-1">{new Date((ibt as any).shippedAt).toLocaleDateString()}</div>
                  </div>
                )}
                {(ibt as any).receivedAt && (
                  <div>
                    <div className="text-sm text-slate-500">Received</div>
                    <div className="mt-1">{new Date((ibt as any).receivedAt).toLocaleDateString()}</div>
                  </div>
                )}
                {ibt.notes && (
                  <div className="col-span-full">
                    <div className="text-sm text-slate-500">Notes</div>
                    <div className="mt-1">{ibt.notes}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lines */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transfer Lines</CardTitle>
                <div className="flex gap-2">
                  {ibt.status === 'DRAFT' && (
                    <Button size="sm" variant="secondary" onClick={() => setShowAddLine(!showAddLine)}>
                      {showAddLine ? 'Cancel' : 'Add Line'}
                    </Button>
                  )}
                  {ibt.status === 'PICKING' && (
                    <Button size="sm" variant="secondary" onClick={initShipQtys}>
                      Fill All Quantities
                    </Button>
                  )}
                  {ibt.status === 'IN_TRANSIT' && (
                    <Button size="sm" variant="secondary" onClick={initReceiveQtys}>
                      Fill All Quantities
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showAddLine && ibt.status === 'DRAFT' && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
                      <Select
                        value={newItemId}
                        onChange={(e) => setNewItemId(e.target.value)}
                        options={
                          itemsData?.data?.map((item) => ({
                            value: item.id,
                            label: `${item.sku} - ${item.description}`,
                          })) || []
                        }
                        placeholder="Select item"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                      <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="Qty" min={1} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">From Bin</label>
                      <Select
                        value={newFromBinId}
                        onChange={(e) => setNewFromBinId(e.target.value)}
                        options={(fromBins || []).filter((b: Bin) => b.isActive).map((b: Bin) => ({ value: b.id, label: b.code }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Batch No</label>
                      <Input value={newBatchNo} onChange={(e) => setNewBatchNo(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={handleAddLine} disabled={!newItemId || !newQty || addLine.isPending} isLoading={addLine.isPending}>
                      Add
                    </Button>
                  </div>
                </div>
              )}

              <DataTable
                data={lines || []}
                columns={getColumns()}
                keyField="id"
                isLoading={linesLoading}
                variant="embedded"
                emptyState={{
                  title: 'No lines added',
                  description: ibt.status === 'DRAFT'
                    ? 'Add items to transfer between warehouses.'
                    : 'This transfer has no line items.',
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </DetailPageTemplate>
  );
}

function StatusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function LinesIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
