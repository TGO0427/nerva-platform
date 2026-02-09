'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { DetailPageTemplate } from '@/components/templates';
import {
  useRouting,
  useApproveRouting,
  useObsoleteRouting,
} from '@/lib/queries/manufacturing';
import type { RoutingStatus, RoutingOperation } from '@nerva/shared';

type OperationWithMeta = RoutingOperation & { workstationCode?: string; workstationName?: string };

export default function RoutingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: routing, isLoading, error } = useRouting(id);

  const approveRouting = useApproveRouting();
  const obsoleteRouting = useObsoleteRouting();

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-gray-900">Routing not found</h2>
          <p className="mt-2 text-gray-500">The routing you're looking for doesn't exist.</p>
          <Link href="/manufacturing/routings">
            <Button className="mt-4">Back to Routings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!id) return;
    await approveRouting.mutateAsync(id);
  };

  const handleObsolete = async () => {
    if (!id || !confirm('Are you sure you want to mark this routing as obsolete?')) return;
    await obsoleteRouting.mutateAsync(id);
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
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          {row.description && (
            <div className="text-sm text-gray-500">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'workstationName',
      header: 'Workstation',
      render: (row) => row.workstationName || row.workstationCode || '-',
    },
    {
      key: 'setupTimeMins',
      header: 'Setup (min)',
      width: '100px',
      render: (row) => row.setupTimeMins || 0,
    },
    {
      key: 'runTimeMins',
      header: 'Run (min)',
      width: '100px',
      render: (row) => row.runTimeMins,
    },
    {
      key: 'queueTimeMins',
      header: 'Queue (min)',
      width: '100px',
      render: (row) => row.queueTimeMins || 0,
    },
    {
      key: 'overlapPct',
      header: 'Overlap %',
      width: '90px',
      render: (row) => row.overlapPct ? `${row.overlapPct}%` : '-',
    },
    {
      key: 'isSubcontracted',
      header: 'Subcontract',
      width: '100px',
      render: (row) => row.isSubcontracted ? (
        <Badge variant="info">Yes</Badge>
      ) : (
        <span className="text-gray-400">No</span>
      ),
    },
  ];

  // Calculate total times
  const totalSetupTime = routing?.operations?.reduce((sum, op) => sum + (op.setupTimeMins || 0), 0) || 0;
  const totalRunTime = routing?.operations?.reduce((sum, op) => sum + op.runTimeMins, 0) || 0;
  const totalQueueTime = routing?.operations?.reduce((sum, op) => sum + (op.queueTimeMins || 0), 0) || 0;
  const totalTime = totalSetupTime + totalRunTime + totalQueueTime;

  return (
    <DetailPageTemplate
      title={routing ? `Routing V${routing.version}` : 'Loading...'}
      subtitle="Routing Details"
      isLoading={isLoading}
      headerActions={
        routing && (
          <div className="flex gap-2">
            {routing.status === 'DRAFT' && (
              <>
                <Button variant="secondary" onClick={() => router.push(`/manufacturing/routings/${id}/edit`)}>
                  Edit
                </Button>
                <Button onClick={handleApprove} disabled={approveRouting.isPending}>
                  {approveRouting.isPending ? 'Approving...' : 'Approve'}
                </Button>
              </>
            )}
            {routing.status === 'APPROVED' && (
              <Button variant="danger" onClick={handleObsolete} disabled={obsoleteRouting.isPending}>
                Mark Obsolete
              </Button>
            )}
          </div>
        )
      }
    >
      {routing && (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-gray-500">Status</div>
              <div className="mt-1">
                <Badge variant={getStatusVariant(routing.status)} >
                  {routing.status}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Version</div>
              <div className="mt-1 text-lg font-semibold">
                V{routing.version}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Operations</div>
              <div className="mt-1 text-lg font-semibold">
                {routing.operations?.length || 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Total Time</div>
              <div className="mt-1 text-lg font-semibold">
                {totalTime} min
              </div>
            </Card>
          </div>

          {/* Product Info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Product</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">SKU</div>
                <div className="mt-1 font-medium">{(routing as any).itemSku || routing.itemId.slice(0, 8)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Description</div>
                <div className="mt-1">{(routing as any).itemDescription || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Effective From</div>
                <div className="mt-1">
                  {routing.effectiveFrom ? new Date(routing.effectiveFrom).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Effective To</div>
                <div className="mt-1">
                  {routing.effectiveTo ? new Date(routing.effectiveTo).toLocaleDateString() : 'Not set'}
                </div>
              </div>
            </div>
            {routing.notes && (
              <div className="mt-4">
                <div className="text-sm text-gray-500">Notes</div>
                <div className="mt-1">{routing.notes}</div>
              </div>
            )}
          </Card>

          {/* Time Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Time Summary</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalSetupTime}</div>
                <div className="text-sm text-gray-500">Setup (min)</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalRunTime}</div>
                <div className="text-sm text-gray-500">Run (min)</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{totalQueueTime}</div>
                <div className="text-sm text-gray-500">Queue (min)</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">{totalTime}</div>
                <div className="text-sm text-gray-500">Total (min)</div>
              </div>
            </div>
          </Card>

          {/* Operations Table */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Operations</h3>
            </div>
            <div className="p-4">
              <DataTable
                columns={operationColumns}
                data={routing.operations || []}
                keyField="id"
                variant="embedded"
                emptyState={{
                  icon: <OperationIcon />,
                  title: 'No operations',
                  description: 'Add operations to this routing',
                }}
              />
            </div>
          </Card>
        </div>
      )}
    </DetailPageTemplate>
  );
}

function getStatusVariant(status: RoutingStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'OBSOLETE':
      return 'danger';
    case 'DRAFT':
    default:
      return 'default';
  }
}

function OperationIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}
