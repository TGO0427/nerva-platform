'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
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
import { useItems, useWarehouses } from '@/lib/queries';
import { useBins } from '@/lib/queries/warehouses';
import type { Bin } from '@nerva/shared';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  PICKING: 'warning',
  IN_TRANSIT: 'info',
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
  const params = useParams();
  const router = useRouter();
  const ibtId = params.id as string;

  const { data: ibt, isLoading } = useIbt(ibtId);
  const { data: lines, isLoading: linesLoading } = useIbtLines(ibtId);
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

  const addLine = useAddIbtLine();
  const removeLine = useRemoveIbtLine();
  const submitIbt = useSubmitIbt();
  const approveIbt = useApproveIbt();
  const startPicking = useStartPickingIbt();
  const shipIbt = useShipIbt();
  const receiveIbt = useReceiveIbt();
  const cancelIbt = useCancelIbt();
  const deleteIbt = useDeleteIbt();

  const handleAddLine = async () => {
    if (!newItemId || !newQty) return;
    try {
      await addLine.mutateAsync({
        ibtId,
        itemId: newItemId,
        qtyRequested: Number(newQty),
        fromBinId: newFromBinId || undefined,
        batchNo: newBatchNo || undefined,
      });
      setNewItemId('');
      setNewQty('');
      setNewFromBinId('');
      setNewBatchNo('');
      setShowAddLine(false);
    } catch (e) {
      console.error('Failed to add line:', e);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    try {
      await removeLine.mutateAsync({ ibtId, lineId });
    } catch (e) {
      console.error('Failed to remove line:', e);
    }
  };

  const handleSubmit = async () => {
    try {
      await submitIbt.mutateAsync(ibtId);
    } catch (e) {
      console.error('Failed to submit:', e);
    }
  };

  const handleApprove = async () => {
    try {
      await approveIbt.mutateAsync(ibtId);
    } catch (e) {
      console.error('Failed to approve:', e);
    }
  };

  const handleStartPicking = async () => {
    try {
      await startPicking.mutateAsync(ibtId);
    } catch (e) {
      console.error('Failed to start picking:', e);
    }
  };

  const handleShip = async () => {
    if (!lines) return;
    const shipLines = lines
      .filter((l) => (shipQtys[l.id] || 0) > 0)
      .map((l) => ({ lineId: l.id, qtyShipped: shipQtys[l.id] || l.qtyRequested }));
    if (shipLines.length === 0) return;
    try {
      await shipIbt.mutateAsync({ id: ibtId, lines: shipLines });
      setShipQtys({});
    } catch (e) {
      console.error('Failed to ship:', e);
    }
  };

  const handleReceive = async () => {
    if (!lines) return;
    const rcvLines = lines
      .filter((l) => (receiveQtys[l.id] || 0) > 0 && receiveBins[l.id])
      .map((l) => ({
        lineId: l.id,
        qtyReceived: receiveQtys[l.id] || l.qtyShipped,
        toBinId: receiveBins[l.id],
      }));
    if (rcvLines.length === 0) return;
    try {
      await receiveIbt.mutateAsync({ id: ibtId, lines: rcvLines });
      setReceiveQtys({});
      setReceiveBins({});
    } catch (e) {
      console.error('Failed to receive:', e);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this transfer?')) return;
    try {
      await cancelIbt.mutateAsync(ibtId);
    } catch (e) {
      console.error('Failed to cancel:', e);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!ibt) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Transfer not found</h2>
      </div>
    );
  }

  const storageBins = (toBins || []).filter(
    (b: Bin) => (b.binType === 'STORAGE' || b.binType === 'PICKING' || b.binType === 'RECEIVING') && b.isActive,
  );

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
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
    ...(ibt.status === 'DRAFT'
      ? [{
          key: 'actions' as keyof IbtLineDetail,
          header: 'Actions',
          render: (row: IbtLineDetail) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleRemoveLine(row.id);
              }}
            >
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
  ];

  const getColumns = (): Column<IbtLineDetail>[] => {
    switch (ibt.status) {
      case 'PICKING':
        return pickingColumns;
      case 'IN_TRANSIT':
        return transitColumns;
      case 'RECEIVED':
      case 'CANCELLED':
        return receivedColumns;
      default:
        return draftColumns;
    }
  };

  const keyDate = ibt.receivedAt
    ? `Received ${new Date(ibt.receivedAt).toLocaleDateString()}`
    : ibt.shippedAt
      ? `Shipped ${new Date(ibt.shippedAt).toLocaleDateString()}`
      : ibt.approvedAt
        ? `Approved ${new Date(ibt.approvedAt).toLocaleDateString()}`
        : `Created ${new Date(ibt.createdAt).toLocaleDateString()}`;

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{ibt.ibtNo}</h1>
            <Badge variant={statusVariant[ibt.status] || 'default'}>
              {statusLabel[ibt.status] || ibt.status}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">{keyDate}</p>
        </div>

        <div className="flex gap-2">
          {ibt.status === 'DRAFT' && (
            <>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete this IBT?')) return;
                  await deleteIbt.mutateAsync(ibtId);
                  router.push('/inventory/ibts');
                }}
                disabled={deleteIbt.isPending}
              >
                {deleteIbt.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              <Button onClick={handleSubmit} isLoading={submitIbt.isPending}>
                Submit for Approval
              </Button>
              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
            </>
          )}
          {ibt.status === 'PENDING_APPROVAL' && (
            <>
              <Button onClick={handleApprove} isLoading={approveIbt.isPending}>
                Approve
              </Button>
              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
            </>
          )}
          {ibt.status === 'APPROVED' && (
            <Button onClick={handleStartPicking} isLoading={startPicking.isPending}>
              Start Picking
            </Button>
          )}
          {ibt.status === 'PICKING' && (
            <Button
              onClick={() => {
                initShipQtys();
                handleShip();
              }}
              isLoading={shipIbt.isPending}
            >
              Confirm Shipment
            </Button>
          )}
          {ibt.status === 'IN_TRANSIT' && (
            <Button onClick={handleReceive} isLoading={receiveIbt.isPending}>
              Confirm Receipt
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-lg font-semibold text-slate-900">{ibt.fromWarehouseName}</div>
            <p className="text-sm text-slate-500">From Warehouse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-lg font-semibold text-slate-900">{ibt.toWarehouseName}</div>
            <p className="text-sm text-slate-500">To Warehouse</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{ibt.lineCount}</div>
            <p className="text-sm text-slate-500">Line Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-slate-900">{keyDate}</div>
            <p className="text-sm text-slate-500">
              {ibt.createdByName ? `By ${ibt.createdByName}` : 'System'}
            </p>
            {ibt.approvedByName && (
              <p className="text-xs text-slate-400 mt-1">Approved by {ibt.approvedByName}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {ibt.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-slate-700">{ibt.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Lines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transfer Lines</CardTitle>
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
                  <Input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="Qty"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Bin</label>
                  <Select
                    value={newFromBinId}
                    onChange={(e) => setNewFromBinId(e.target.value)}
                    options={(fromBins || [])
                      .filter((b: Bin) => b.isActive)
                      .map((b: Bin) => ({ value: b.id, label: b.code }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Batch No</label>
                  <Input
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddLine}
                  disabled={!newItemId || !newQty || addLine.isPending}
                  isLoading={addLine.isPending}
                >
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
  );
}
