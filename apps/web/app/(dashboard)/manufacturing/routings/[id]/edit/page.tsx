'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { useRouting, useUpdateRouting } from '@/lib/queries/manufacturing';
import type { RoutingOperation } from '@nerva/shared';

type OperationWithMeta = RoutingOperation & { workstationCode?: string; workstationName?: string };

export default function EditRoutingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: routing, isLoading, error } = useRouting(id);
  const updateRouting = useUpdateRouting();

  const [formData, setFormData] = useState({
    effectiveFrom: '',
    effectiveTo: '',
    notes: '',
  });

  const [initialized, setInitialized] = useState(false);

  // Populate form when routing data loads
  useEffect(() => {
    if (routing && !initialized) {
      setFormData({
        effectiveFrom: routing.effectiveFrom
          ? new Date(routing.effectiveFrom).toISOString().split('T')[0]
          : '',
        effectiveTo: routing.effectiveTo
          ? new Date(routing.effectiveTo).toISOString().split('T')[0]
          : '',
        notes: routing.notes || '',
      });
      setInitialized(true);
    }
  }, [routing, initialized]);

  // Redirect away if routing is not in DRAFT status
  useEffect(() => {
    if (routing && routing.status !== 'DRAFT') {
      router.replace(`/manufacturing/routings/${id}`);
    }
  }, [routing, id, router]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateRouting.mutateAsync({
      id,
      effectiveFrom: formData.effectiveFrom || undefined,
      effectiveTo: formData.effectiveTo || undefined,
      notes: formData.notes || undefined,
    });

    router.push(`/manufacturing/routings/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !routing) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Routing not found</h2>
          <p className="mt-2 text-slate-500">
            The routing you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button className="mt-4" onClick={() => router.push('/manufacturing/routings')}>
            Back to Routings
          </Button>
        </div>
      </PageShell>
    );
  }

  // Don't render form if not DRAFT (redirect will happen via useEffect)
  if (routing.status !== 'DRAFT') {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

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
            <div className="text-sm text-slate-500">{row.description}</div>
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
      key: 'isSubcontracted',
      header: 'Subcontract',
      width: '100px',
      render: (row) => row.isSubcontracted ? (
        <Badge variant="info">Yes</Badge>
      ) : (
        <span className="text-slate-400">No</span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title={`Edit Routing V${routing.version}`}
        subtitle="Modify routing details"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6 mb-6">
          {/* Read-only info */}
          <div className="mb-6 rounded-md bg-slate-50 p-4">
            <div>
              <div className="text-sm text-slate-500">Product</div>
              <div className="mt-1 font-medium">
                {(routing as any).itemSku || routing.itemId.slice(0, 8)}
                {(routing as any).itemDescription && (
                  <span className="text-slate-500"> - {(routing as any).itemDescription}</span>
                )}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Effective From
              </label>
              <Input
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => handleChange('effectiveFrom', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Effective To
              </label>
              <Input
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => handleChange('effectiveTo', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </Card>

        {/* Read-only Operations Table */}
        <Card className="mb-6">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Operations</h3>
            <p className="text-sm text-slate-500 mt-1">
              Operations are read-only here. Operation editing is not yet supported.
            </p>
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
                description: 'No operations defined for this routing',
              }}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/manufacturing/routings/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateRouting.isPending}
          >
            {updateRouting.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

function OperationIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}
