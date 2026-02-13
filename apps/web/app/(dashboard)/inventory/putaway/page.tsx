'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  usePutawayTasks,
  useAssignPutawayTask,
  useCompletePutawayTask,
  useCancelPutawayTask,
  type PutawayTaskDetail,
} from '@/lib/queries/inventory';
import { useWarehouses, useBins } from '@/lib/queries/warehouses';
import { useUsers } from '@/lib/queries/settings';
import type { Bin } from '@nerva/shared';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'Complete', value: 'COMPLETE' },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  COMPLETE: 'success',
  CANCELLED: 'danger',
};

export default function PutawayPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [completeBinId, setCompleteBinId] = useState('');
  const limit = 25;

  const { data, isLoading } = usePutawayTasks({
    page,
    limit,
    status: statusFilter || undefined,
    warehouseId: warehouseFilter || undefined,
  });
  const { data: warehouses } = useWarehouses();
  const { data: users } = useUsers({ page: 1, limit: 100 });
  const { data: bins } = useBins(warehouseFilter || undefined);

  const assignTask = useAssignPutawayTask();
  const completeTask = useCompletePutawayTask();
  const cancelTask = useCancelPutawayTask();

  const storageBins = (bins || []).filter(
    (b: Bin) => (b.binType === 'STORAGE' || b.binType === 'PICKING') && b.isActive,
  );

  const handleAssign = async (taskId: string) => {
    if (!assignUserId) return;
    try {
      await assignTask.mutateAsync({ id: taskId, userId: assignUserId });
      setActionTaskId(null);
      setAssignUserId('');
    } catch (e) {
      console.error('Failed to assign:', e);
    }
  };

  const handleComplete = async (taskId: string) => {
    if (!completeBinId) return;
    try {
      await completeTask.mutateAsync({ id: taskId, toBinId: completeBinId });
      setActionTaskId(null);
      setCompleteBinId('');
    } catch (e) {
      console.error('Failed to complete:', e);
    }
  };

  const handleCancel = async (taskId: string) => {
    if (!confirm('Cancel this putaway task?')) return;
    try {
      await cancelTask.mutateAsync(taskId);
    } catch (e) {
      console.error('Failed to cancel:', e);
    }
  };

  const columns: Column<PutawayTaskDetail>[] = [
    {
      key: 'itemSku',
      header: 'Item',
      render: (t) => (
        <div>
          <span className="font-medium text-primary-600">{t.itemSku}</span>
          <p className="text-xs text-slate-500 truncate max-w-[200px]">{t.itemDescription}</p>
        </div>
      ),
    },
    {
      key: 'fromBinCode',
      header: 'From Bin',
      render: (t) => <span className="font-mono text-sm">{t.fromBinCode}</span>,
    },
    {
      key: 'toBinCode',
      header: 'To Bin',
      render: (t) =>
        t.toBinCode ? (
          <span className="font-mono text-sm">{t.toBinCode}</span>
        ) : (
          <span className="text-slate-400">Not set</span>
        ),
    },
    {
      key: 'qty',
      header: 'Qty',
      render: (t) => <span className="font-medium">{t.qty}</span>,
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (t) => t.batchNo || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Badge variant={statusVariant[t.status] || 'default'}>{t.status}</Badge>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assigned To',
      render: (t) => t.assignedToName || <span className="text-slate-400">Unassigned</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => {
        if (t.status === 'COMPLETE' || t.status === 'CANCELLED') return null;

        if (actionTaskId === t.id) {
          return (
            <div className="flex items-end gap-2" onClick={(e) => e.stopPropagation()}>
              {t.status === 'PENDING' && (
                <>
                  <div className="w-36">
                    <Select
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      options={users?.data?.map((u) => ({ value: u.id, label: u.displayName || u.email })) || []}
                      placeholder="User"
                    />
                  </div>
                  <Button size="sm" onClick={() => handleAssign(t.id)} disabled={!assignUserId || assignTask.isPending}>
                    Assign
                  </Button>
                </>
              )}
              <div className="w-36">
                <Select
                  value={completeBinId}
                  onChange={(e) => setCompleteBinId(e.target.value)}
                  options={storageBins.map((b: Bin) => ({ value: b.id, label: b.code }))}
                  placeholder="Target bin"
                />
              </div>
              <Button size="sm" onClick={() => handleComplete(t.id)} disabled={!completeBinId || completeTask.isPending}>
                Complete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActionTaskId(null)}>
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActionTaskId(t.id);
                setAssignUserId('');
                setCompleteBinId('');
              }}
            >
              {t.status === 'PENDING' ? 'Assign / Complete' : 'Complete'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleCancel(t.id)}>
              Cancel
            </Button>
          </div>
        );
      },
    },
  ];

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Putaway Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">
          Move received stock from receiving bins to storage locations
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2 border-b border-slate-200 pb-2 flex-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="w-48">
          <Select
            value={warehouseFilter}
            onChange={(e) => {
              setWarehouseFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Warehouses' },
              ...(warehouses?.map((w) => ({ value: w.id, label: w.name })) || []),
            ]}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            data={data?.data || []}
            columns={columns}
            keyField="id"
            isLoading={isLoading}
            emptyState={{
              title: 'No putaway tasks',
              description: statusFilter
                ? 'No tasks match the current filters.'
                : 'Putaway tasks are created from received GRNs.',
            }}
          />
        </CardContent>
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} ({data.total} total)
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
