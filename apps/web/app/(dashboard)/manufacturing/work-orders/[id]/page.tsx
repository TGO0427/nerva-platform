'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { DetailPageTemplate } from '@/components/templates';
import {
  useWorkOrder,
  useReleaseWorkOrder,
  useStartWorkOrder,
  useCompleteWorkOrder,
  useCancelWorkOrder,
} from '@/lib/queries/manufacturing';
import type { WorkOrderStatus, WorkOrderOperation, WorkOrderMaterial } from '@nerva/shared';

type OperationWithMeta = WorkOrderOperation & { workstationCode?: string; workstationName?: string; assignedUserName?: string };
type MaterialWithMeta = WorkOrderMaterial & { itemSku?: string; itemDescription?: string };

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: workOrder, isLoading, error } = useWorkOrder(id);
  const [activeTab, setActiveTab] = useState<'operations' | 'materials'>('materials');

  const releaseWorkOrder = useReleaseWorkOrder();
  const startWorkOrder = useStartWorkOrder();
  const completeWorkOrder = useCompleteWorkOrder();
  const cancelWorkOrder = useCancelWorkOrder();

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Work order not found</h2>
          <p className="mt-2 text-slate-500">The work order you're looking for doesn't exist.</p>
          <Link href="/manufacturing/work-orders">
            <Button className="mt-4">Back to Work Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleRelease = async () => {
    if (!id) return;
    await releaseWorkOrder.mutateAsync(id);
  };

  const handleStart = async () => {
    if (!id) return;
    await startWorkOrder.mutateAsync(id);
  };

  const handleComplete = async () => {
    if (!id) return;
    await completeWorkOrder.mutateAsync(id);
  };

  const handleCancel = async () => {
    if (!id || !confirm('Are you sure you want to cancel this work order?')) return;
    await cancelWorkOrder.mutateAsync(id);
  };

  const operationColumns: Column<OperationWithMeta>[] = [
    {
      key: 'operationNo',
      header: 'Op #',
      width: '60px',
      render: (row) => row.operationNo,
    },
    {
      key: 'name',
      header: 'Operation',
      render: (row) => row.name,
    },
    {
      key: 'workstationName',
      header: 'Workstation',
      render: (row) => row.workstationName || row.workstationCode || '-',
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={getOpStatusVariant(row.status)}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'qtyCompleted',
      header: 'Completed',
      width: '100px',
      render: (row) => row.qtyCompleted?.toLocaleString() || '0',
    },
    {
      key: 'assignedUserName',
      header: 'Assigned To',
      render: (row) => row.assignedUserName || '-',
    },
  ];

  const materialColumns: Column<MaterialWithMeta>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => row.itemSku || '-',
    },
    {
      key: 'itemDescription',
      header: 'Description',
      render: (row) => row.itemDescription || '-',
    },
    {
      key: 'qtyRequired',
      header: 'Required',
      width: '100px',
      render: (row) => row.qtyRequired.toLocaleString(),
    },
    {
      key: 'qtyIssued',
      header: 'Issued',
      width: '100px',
      render: (row) => row.qtyIssued.toLocaleString(),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      width: '100px',
      render: (row) => {
        const remaining = row.qtyRequired - row.qtyIssued + row.qtyReturned;
        return (
          <span className={remaining > 0 ? 'text-amber-600' : 'text-green-600'}>
            {remaining.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <Badge variant={row.status === 'ISSUED' ? 'success' : 'default'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  const progressPercentage = workOrder
    ? Math.round((workOrder.qtyCompleted / workOrder.qtyOrdered) * 100)
    : 0;

  return (
    <DetailPageTemplate
      title={workOrder?.workOrderNo || 'Loading...'}
      subtitle="Work Order Details"
      isLoading={isLoading}
      headerActions={
        workOrder && (
          <div className="flex gap-2">
            {workOrder.status === 'DRAFT' && (
              <>
                <Button variant="secondary" onClick={() => router.push(`/manufacturing/work-orders/${id}/edit`)}>
                  Edit
                </Button>
                <Button onClick={handleRelease} disabled={releaseWorkOrder.isPending}>
                  {releaseWorkOrder.isPending ? 'Releasing...' : 'Release'}
                </Button>
              </>
            )}
            {workOrder.status === 'RELEASED' && (
              <Button onClick={handleStart} disabled={startWorkOrder.isPending}>
                {startWorkOrder.isPending ? 'Starting...' : 'Start Production'}
              </Button>
            )}
            {workOrder.status === 'IN_PROGRESS' && (
              <Button onClick={handleComplete} disabled={completeWorkOrder.isPending}>
                {completeWorkOrder.isPending ? 'Completing...' : 'Complete'}
              </Button>
            )}
            {['DRAFT', 'RELEASED', 'ON_HOLD'].includes(workOrder.status) && (
              <Button variant="danger" onClick={handleCancel} disabled={cancelWorkOrder.isPending}>
                Cancel
              </Button>
            )}
          </div>
        )
      }
    >
      {workOrder && (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-500">Status</div>
              <div className="mt-1">
                <Badge variant={getStatusVariant(workOrder.status)} >
                  {workOrder.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Priority</div>
              <div className="mt-1">
                <Badge variant={getPriorityVariant(workOrder.priority)} >
                  {getPriorityLabel(workOrder.priority)}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Progress</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{progressPercentage}%</span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Quantity</div>
              <div className="mt-1 text-lg font-semibold">
                {workOrder.qtyCompleted.toLocaleString()} / {workOrder.qtyOrdered.toLocaleString()}
              </div>
            </Card>
          </div>

          {/* Details Grid */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-slate-500">Product</div>
                <div className="mt-1 font-medium">{(workOrder as any).itemSku || workOrder.itemId.slice(0, 8)}</div>
                {(workOrder as any).itemDescription && (
                  <div className="text-sm text-slate-500">{(workOrder as any).itemDescription}</div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-500">Warehouse</div>
                <div className="mt-1">{(workOrder as any).warehouseName || workOrder.warehouseId.slice(0, 8)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Planned Start</div>
                <div className="mt-1">
                  {workOrder.plannedStart ? new Date(workOrder.plannedStart).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Planned End</div>
                <div className="mt-1">
                  {workOrder.plannedEnd ? new Date(workOrder.plannedEnd).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Actual Start</div>
                <div className="mt-1">
                  {workOrder.actualStart ? new Date(workOrder.actualStart).toLocaleString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Actual End</div>
                <div className="mt-1">
                  {workOrder.actualEnd ? new Date(workOrder.actualEnd).toLocaleString() : '-'}
                </div>
              </div>
              {workOrder.notes && (
                <div className="col-span-full">
                  <div className="text-sm text-slate-500">Notes</div>
                  <div className="mt-1">{workOrder.notes}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Tabs for Operations & Materials */}
          <Card>
            <div className="border-b">
              <nav className="flex gap-4 px-4">
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'materials'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Materials ({workOrder.materials?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('operations')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'operations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Operations ({workOrder.operations?.length || 0})
                </button>
              </nav>
            </div>

            <div className="p-4">
              {activeTab === 'materials' && (
                <DataTable
                  columns={materialColumns}
                  data={workOrder.materials || []}
                  keyField="id"
                  variant="embedded"
                  emptyState={{
                    icon: <BoxIcon />,
                    title: 'No materials',
                    description: 'No materials are required for this work order',
                  }}
                />
              )}
              {activeTab === 'operations' && (
                <DataTable
                  columns={operationColumns}
                  data={workOrder.operations || []}
                  keyField="id"
                  variant="embedded"
                  emptyState={{
                    icon: <OperationIcon />,
                    title: 'No operations',
                    description: 'No operations defined for this work order',
                  }}
                />
              )}
            </div>
          </Card>
        </div>
      )}
    </DetailPageTemplate>
  );
}

function getStatusVariant(status: WorkOrderStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'RELEASED':
      return 'info';
    case 'ON_HOLD':
    case 'CANCELLED':
      return 'danger';
    case 'DRAFT':
    default:
      return 'default';
  }
}

function getOpStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PENDING':
    default:
      return 'default';
  }
}

function getPriorityVariant(priority: number): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (priority >= 8) return 'danger';
  if (priority >= 5) return 'warning';
  return 'default';
}

function getPriorityLabel(priority: number): string {
  if (priority >= 8) return 'Urgent';
  if (priority >= 5) return 'High';
  if (priority >= 3) return 'Normal';
  return 'Low';
}

function BoxIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function OperationIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}
