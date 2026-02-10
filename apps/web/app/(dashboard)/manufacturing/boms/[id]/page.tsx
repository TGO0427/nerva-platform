'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { DetailPageTemplate } from '@/components/templates';
import {
  useBom,
  useSubmitBom,
  useApproveBom,
  useObsoleteBom,
  useCreateBomVersion,
  useDeleteBom,
} from '@/lib/queries/manufacturing';
import type { BomStatus, BomLine } from '@nerva/shared';

type BomLineWithMeta = BomLine & { itemSku?: string; itemDescription?: string };

export default function BomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: bom, isLoading, error } = useBom(id);

  const submitBom = useSubmitBom();
  const approveBom = useApproveBom();
  const obsoleteBom = useObsoleteBom();
  const createVersion = useCreateBomVersion();
  const deleteBom = useDeleteBom();

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">BOM not found</h2>
          <p className="mt-2 text-slate-500">The BOM you're looking for doesn't exist.</p>
          <Link href="/manufacturing/boms">
            <Button className="mt-4">Back to BOMs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!id) return;
    await submitBom.mutateAsync(id);
  };

  const handleApprove = async () => {
    if (!id) return;
    await approveBom.mutateAsync(id);
  };

  const handleObsolete = async () => {
    if (!id || !confirm('Are you sure you want to mark this BOM as obsolete?')) return;
    await obsoleteBom.mutateAsync(id);
  };

  const handleNewVersion = async () => {
    if (!id) return;
    const newBom = await createVersion.mutateAsync(id);
    router.push(`/manufacturing/boms/${newBom.id}`);
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this BOM?')) return;
    await deleteBom.mutateAsync(id);
    router.push('/manufacturing/boms');
  };

  const lineColumns: Column<BomLineWithMeta>[] = [
    {
      key: 'lineNo',
      header: 'Line',
      width: '60px',
      render: (row) => row.lineNo,
    },
    {
      key: 'itemSku',
      header: 'Component SKU',
      render: (row) => (
        <span className="font-medium">{row.itemSku || '-'}</span>
      ),
    },
    {
      key: 'itemDescription',
      header: 'Description',
      render: (row) => row.itemDescription || '-',
    },
    {
      key: 'qtyPer',
      header: 'Qty Per',
      width: '100px',
      render: (row) => `${row.qtyPer} ${row.uom}`,
    },
    {
      key: 'scrapPct',
      header: 'Scrap %',
      width: '80px',
      render: (row) => row.scrapPct ? `${row.scrapPct}%` : '-',
    },
    {
      key: 'isCritical',
      header: 'Critical',
      width: '80px',
      render: (row) => row.isCritical ? (
        <Badge variant="danger">Yes</Badge>
      ) : (
        <span className="text-slate-400">No</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row) => row.notes || '-',
    },
  ];

  return (
    <DetailPageTemplate
      title={bom ? `BOM V${bom.version} Rev ${bom.revision}` : 'Loading...'}
      subtitle="Bill of Materials Details"
      isLoading={isLoading}
      headerActions={
        bom && (
          <div className="flex gap-2">
            {bom.status === 'DRAFT' && (
              <>
                <Button variant="secondary" onClick={() => router.push(`/manufacturing/boms/${id}/edit`)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={deleteBom.isPending}>
                  Delete
                </Button>
                <Button onClick={handleSubmit} disabled={submitBom.isPending}>
                  {submitBom.isPending ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </>
            )}
            {bom.status === 'PENDING_APPROVAL' && (
              <Button onClick={handleApprove} disabled={approveBom.isPending}>
                {approveBom.isPending ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {bom.status === 'APPROVED' && (
              <>
                <Button variant="secondary" onClick={handleNewVersion} disabled={createVersion.isPending}>
                  {createVersion.isPending ? 'Creating...' : 'Create New Version'}
                </Button>
                <Button variant="danger" onClick={handleObsolete} disabled={obsoleteBom.isPending}>
                  Mark Obsolete
                </Button>
              </>
            )}
          </div>
        )
      }
    >
      {bom && (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-slate-500">Status</div>
              <div className="mt-1">
                <Badge variant={getStatusVariant(bom.status)} >
                  {bom.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Version</div>
              <div className="mt-1 text-lg font-semibold">
                V{bom.version} Rev {bom.revision}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Base Quantity</div>
              <div className="mt-1 text-lg font-semibold">
                {bom.baseQty} {bom.uom}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-slate-500">Components</div>
              <div className="mt-1 text-lg font-semibold">
                {bom.lines?.length || 0}
              </div>
            </Card>
          </div>

          {/* Product Info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Product</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-slate-500">SKU</div>
                <div className="mt-1 font-medium">{(bom as any).itemSku || bom.itemId.slice(0, 8)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Description</div>
                <div className="mt-1">{(bom as any).itemDescription || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Effective From</div>
                <div className="mt-1">
                  {bom.effectiveFrom ? new Date(bom.effectiveFrom).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Effective To</div>
                <div className="mt-1">
                  {bom.effectiveTo ? new Date(bom.effectiveTo).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              {bom.approvedBy && (
                <div>
                  <div className="text-sm text-slate-500">Approved At</div>
                  <div className="mt-1">
                    {bom.approvedAt ? new Date(bom.approvedAt).toLocaleString() : '-'}
                  </div>
                </div>
              )}
              {bom.notes && (
                <div className="col-span-full">
                  <div className="text-sm text-slate-500">Notes</div>
                  <div className="mt-1">{bom.notes}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Components Table */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Components</h3>
            </div>
            <div className="p-4">
              <DataTable
                columns={lineColumns}
                data={bom.lines || []}
                keyField="id"
                variant="embedded"
                emptyState={{
                  icon: <ComponentIcon />,
                  title: 'No components',
                  description: 'Add components to this BOM',
                }}
              />
            </div>
          </Card>
        </div>
      )}
    </DetailPageTemplate>
  );
}

function getStatusVariant(status: BomStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'PENDING_APPROVAL':
      return 'warning';
    case 'OBSOLETE':
      return 'danger';
    case 'DRAFT':
    default:
      return 'default';
  }
}

function ComponentIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
    </svg>
  );
}
