'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { DetailPageTemplate } from '@/components/templates';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  usePutawayTask,
  useAssignPutawayTask,
  useCompletePutawayTask,
  useCancelPutawayTask,
} from '@/lib/queries/inventory';
import { useWarehouses, useBins } from '@/lib/queries/warehouses';
import { useUsers } from '@/lib/queries/settings';
import type { Bin } from '@nerva/shared';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  COMPLETE: 'success',
  CANCELLED: 'danger',
};

export default function PutawayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading } = usePutawayTask(id);
  const { data: users } = useUsers({ page: 1, limit: 100 });
  const { data: warehouses } = useWarehouses();
  const [completeWarehouseId, setCompleteWarehouseId] = useState('');
  const { data: bins } = useBins(completeWarehouseId || undefined);

  const [assignUserId, setAssignUserId] = useState('');
  const [completeBinId, setCompleteBinId] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const assignTask = useAssignPutawayTask();
  const completeTask = useCompletePutawayTask();
  const cancelTask = useCancelPutawayTask();

  const storageBins = (bins || []).filter(
    (b: Bin) => (b.binType === 'STORAGE' || b.binType === 'PICKING') && b.isActive,
  );

  const handleAssign = async () => {
    if (!assignUserId) return;
    try {
      await assignTask.mutateAsync({ id, userId: assignUserId });
      addToast('Task assigned', 'success');
      setShowAssign(false);
      setAssignUserId('');
    } catch {
      addToast('Failed to assign task', 'error');
    }
  };

  const handleComplete = async () => {
    if (!completeBinId) return;
    try {
      await completeTask.mutateAsync({ id, toBinId: completeBinId });
      addToast('Task completed', 'success');
      setShowComplete(false);
      setCompleteBinId('');
    } catch {
      addToast('Failed to complete task', 'error');
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel Putaway Task',
      message: 'Cancel this putaway task?',
      confirmLabel: 'Cancel Task',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await cancelTask.mutateAsync(id);
      addToast('Task cancelled', 'success');
    } catch {
      addToast('Failed to cancel task', 'error');
    }
  };

  return (
    <DetailPageTemplate
      title={task?.itemSku || 'Loading...'}
      subtitle="Putaway Task"
      isLoading={isLoading}
      notFound={!isLoading && !task}
      notFoundMessage="Putaway task not found"
      titleBadges={
        task && (
          <Badge variant={statusVariant[task.status] || 'default'}>
            {task.status}
          </Badge>
        )
      }
      headerActions={
        task && (
          <div className="flex gap-2">
            {task.status === 'PENDING' && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => { setShowAssign(!showAssign); setShowComplete(false); }}
                >
                  Assign
                </Button>
                <Button
                  onClick={() => { setShowComplete(!showComplete); setShowAssign(false); }}
                >
                  Complete
                </Button>
                <Button variant="danger" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            )}
            {task.status === 'ASSIGNED' && (
              <>
                <Button onClick={() => { setShowComplete(!showComplete); setShowAssign(false); }}>
                  Complete
                </Button>
                <Button variant="danger" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        )
      }
      statsColumns={4}
      stats={task ? [
        {
          title: 'Status',
          value: task.status,
          icon: <StatusIcon />,
          iconColor: task.status === 'COMPLETE' ? 'green' : task.status === 'ASSIGNED' ? 'blue' : 'yellow',
        },
        {
          title: 'Quantity',
          value: task.qty,
          icon: <QtyIcon />,
          iconColor: 'blue',
        },
        {
          title: 'From Bin',
          value: task.fromBinCode,
          icon: <BinIcon />,
          iconColor: 'gray',
        },
        {
          title: 'To Bin',
          value: task.toBinCode || 'Not assigned',
          icon: <BinIcon />,
          iconColor: task.toBinCode ? 'green' : 'gray',
        },
      ] : undefined}
    >
      {task && (
        <div className="space-y-6">
          {/* Action forms */}
          {showAssign && task.status === 'PENDING' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-blue-800 mb-3">Assign Task</h3>
                <div className="flex items-end gap-3">
                  <div className="w-64">
                    <label className="block text-xs text-slate-600 mb-1">User</label>
                    <Select
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      options={users?.data?.map((u) => ({ value: u.id, label: u.displayName || u.email })) || []}
                      placeholder="Select user"
                    />
                  </div>
                  <Button size="sm" onClick={handleAssign} disabled={!assignUserId || assignTask.isPending} isLoading={assignTask.isPending}>
                    Assign
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAssign(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showComplete && (task.status === 'PENDING' || task.status === 'ASSIGNED') && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <h3 className="text-sm font-medium text-green-800 mb-3">Complete Task</h3>
                <div className="flex items-end gap-3">
                  <div className="w-48">
                    <label className="block text-xs text-slate-600 mb-1">Warehouse</label>
                    <Select
                      value={completeWarehouseId}
                      onChange={(e) => { setCompleteWarehouseId(e.target.value); setCompleteBinId(''); }}
                      options={warehouses?.map((w) => ({ value: w.id, label: w.name })) || []}
                      placeholder="Select warehouse"
                    />
                  </div>
                  <div className="w-48">
                    <label className="block text-xs text-slate-600 mb-1">Destination Bin</label>
                    <Select
                      value={completeBinId}
                      onChange={(e) => setCompleteBinId(e.target.value)}
                      options={storageBins.map((b: Bin) => ({ value: b.id, label: b.code }))}
                      placeholder="Select bin"
                    />
                  </div>
                  <Button size="sm" onClick={handleComplete} disabled={!completeBinId || completeTask.isPending} isLoading={completeTask.isPending}>
                    Complete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowComplete(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Details card */}
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-slate-500">Item SKU</div>
                  <div className="mt-1 font-medium">{task.itemSku}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Item Description</div>
                  <div className="mt-1">{task.itemDescription}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Quantity</div>
                  <div className="mt-1 font-medium">{task.qty}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Batch No</div>
                  <div className="mt-1">{task.batchNo || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">From Bin</div>
                  <div className="mt-1 font-mono">{task.fromBinCode}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">To Bin</div>
                  <div className="mt-1 font-mono">{task.toBinCode || <span className="text-slate-400">Not assigned</span>}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Assigned To</div>
                  <div className="mt-1">{task.assignedToName || <span className="text-slate-400">Unassigned</span>}</div>
                </div>
                {(task as any).completedAt && (
                  <div>
                    <div className="text-sm text-slate-500">Completed At</div>
                    <div className="mt-1">{new Date((task as any).completedAt).toLocaleString()}</div>
                  </div>
                )}
                {task.grnId && (
                  <div>
                    <div className="text-sm text-slate-500">GRN</div>
                    <div className="mt-1">
                      <Link href={`/inventory/grn/${task.grnId}`} className="text-primary-600 hover:underline">
                        View GRN
                      </Link>
                    </div>
                  </div>
                )}
              </div>
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

function QtyIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function BinIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}
