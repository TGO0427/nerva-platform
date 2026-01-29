'use client';

import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import {
  usePickWave,
  usePickTasks,
  useReleasePickWave,
  useCompletePickWave,
  useCancelPickWave,
  useAssignPickTask,
  useConfirmPickTask,
  PickTask,
} from '@/lib/queries';

export default function PickWaveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const waveId = params.id as string;

  const { data: wave, isLoading: waveLoading } = usePickWave(waveId);
  const { data: tasks, isLoading: tasksLoading } = usePickTasks(waveId);

  const releaseWave = useReleasePickWave();
  const completeWave = useCompletePickWave();
  const cancelWave = useCancelPickWave();
  const assignTask = useAssignPickTask();
  const confirmTask = useConfirmPickTask();

  const taskColumns: Column<PickTask>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => (
        <span className="font-medium">{row.itemSku || row.itemId.slice(0, 8)}</span>
      ),
    },
    {
      key: 'itemDescription',
      header: 'Description',
      render: (row) => row.itemDescription || '-',
    },
    {
      key: 'fromBinCode',
      header: 'Bin',
      render: (row) => (
        <span className="font-mono text-sm">{row.fromBinCode || row.fromBinId.slice(0, 8)}</span>
      ),
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
    {
      key: 'qtyToPick',
      header: 'To Pick',
      className: 'text-right',
    },
    {
      key: 'qtyPicked',
      header: 'Picked',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyPicked >= row.qtyToPick ? 'text-green-600' : 'text-orange-600'}>
          {row.qtyPicked}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={getTaskStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assigned To',
      render: (row) => row.assignedToName || (row.assignedTo ? row.assignedTo.slice(0, 8) : '-'),
    },
  ];

  const handleRelease = async () => {
    if (confirm('Release this wave for picking?')) {
      try {
        await releaseWave.mutateAsync(waveId);
      } catch (error) {
        console.error('Failed to release wave:', error);
      }
    }
  };

  const handleComplete = async () => {
    if (confirm('Complete this pick wave? Ensure all tasks are done.')) {
      try {
        await completeWave.mutateAsync(waveId);
      } catch (error) {
        console.error('Failed to complete wave:', error);
      }
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason) {
      try {
        await cancelWave.mutateAsync({ waveId, reason });
        router.push('/fulfilment');
      } catch (error) {
        console.error('Failed to cancel wave:', error);
      }
    }
  };

  if (waveLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!wave) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Pick wave not found</h2>
      </div>
    );
  }

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'PICKED' || t.status === 'SHORT').length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0;
  const totalToPick = tasks?.reduce((sum, t) => sum + t.qtyToPick, 0) || 0;
  const totalPicked = tasks?.reduce((sum, t) => sum + t.qtyPicked, 0) || 0;
  const progress = totalToPick > 0 ? Math.round((totalPicked / totalToPick) * 100) : 0;

  const canRelease = wave.status === 'PENDING';
  const canComplete = wave.status === 'IN_PROGRESS';
  const canCancel = wave.status !== 'COMPLETE' && wave.status !== 'CANCELLED';

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{wave.waveNo}</h1>
            <Badge variant={getWaveStatusVariant(wave.status)}>{wave.status}</Badge>
          </div>
          <p className="text-gray-500 mt-1">
            Created {new Date(wave.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {canRelease && (
            <Button onClick={handleRelease} isLoading={releaseWave.isPending}>
              <PlayIcon />
              Release Wave
            </Button>
          )}
          {canComplete && (
            <Button onClick={handleComplete} isLoading={completeWave.isPending}>
              <CheckIcon />
              Complete Wave
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} isLoading={cancelWave.isPending}>
              <XIcon />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
            <p className="text-sm text-gray-500">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks}</div>
            <p className="text-sm text-gray-500">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <p className="text-sm text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{totalPicked}/{totalToPick}</div>
            <p className="text-sm text-gray-500">Qty Picked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary-600">{progress}%</div>
            <p className="text-sm text-gray-500">Progress</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pick tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Pick Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={taskColumns}
            data={tasks || []}
            keyField="id"
            isLoading={tasksLoading}
            emptyState={{
              title: 'No tasks in this wave',
              description: 'Pick tasks will appear here once the wave is created',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function getWaveStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PENDING':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function getTaskStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'PICKED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PENDING':
      return 'info';
    case 'SHORT':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
