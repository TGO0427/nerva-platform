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
import { useBom, useUpdateBom } from '@/lib/queries/manufacturing';
import type { BomLine } from '@nerva/shared';

type BomLineWithMeta = BomLine & { itemSku?: string; itemDescription?: string };

export default function EditBomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: bom, isLoading, error } = useBom(id);
  const updateBom = useUpdateBom();

  const [formData, setFormData] = useState({
    revision: '',
    baseQty: '1',
    uom: 'EA',
    effectiveFrom: '',
    effectiveTo: '',
    notes: '',
  });

  const [initialized, setInitialized] = useState(false);

  // Populate form when BOM data loads
  useEffect(() => {
    if (bom && !initialized) {
      setFormData({
        revision: String(bom.revision),
        baseQty: String(bom.baseQty),
        uom: bom.uom,
        effectiveFrom: bom.effectiveFrom
          ? new Date(bom.effectiveFrom).toISOString().split('T')[0]
          : '',
        effectiveTo: bom.effectiveTo
          ? new Date(bom.effectiveTo).toISOString().split('T')[0]
          : '',
        notes: bom.notes || '',
      });
      setInitialized(true);
    }
  }, [bom, initialized]);

  // Redirect away if BOM is not in DRAFT status
  useEffect(() => {
    if (bom && bom.status !== 'DRAFT') {
      router.replace(`/manufacturing/boms/${id}`);
    }
  }, [bom, id, router]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateBom.mutateAsync({
      id,
      revision: formData.revision,
      baseQty: parseFloat(formData.baseQty),
      uom: formData.uom,
      effectiveFrom: formData.effectiveFrom || undefined,
      effectiveTo: formData.effectiveTo || undefined,
      notes: formData.notes || undefined,
    });

    router.push(`/manufacturing/boms/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !bom) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">BOM not found</h2>
          <p className="mt-2 text-slate-500">
            The BOM you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button className="mt-4" onClick={() => router.push('/manufacturing/boms')}>
            Back to BOMs
          </Button>
        </div>
      </PageShell>
    );
  }

  // Don't render form if not DRAFT (redirect will happen via useEffect)
  if (bom.status !== 'DRAFT') {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const isValid = formData.baseQty && parseFloat(formData.baseQty) > 0 && formData.uom;

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
      key: 'category',
      header: 'Category',
      width: '100px',
      render: (row) => (
        <Badge variant={row.category === 'PACKAGING' ? 'info' : 'default'}>
          {row.category}
        </Badge>
      ),
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
  ];

  return (
    <PageShell>
      <PageHeader
        title={`Edit BOM V${bom.version} Rev ${bom.revision}`}
        subtitle="Modify bill of materials details"
      />
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="p-6 mb-6">
          {/* Read-only info */}
          <div className="mb-6 rounded-md bg-slate-50 p-4">
            <div>
              <div className="text-sm text-slate-500">Product</div>
              <div className="mt-1 font-medium">
                {(bom as any).itemSku || bom.itemId.slice(0, 8)}
                {(bom as any).itemDescription && (
                  <span className="text-slate-500"> - {(bom as any).itemDescription}</span>
                )}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Revision
              </label>
              <Input
                value={formData.revision}
                onChange={(e) => handleChange('revision', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Base Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={formData.baseQty}
                  onChange={(e) => handleChange('baseQty', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  UOM <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.uom}
                  onChange={(e) => handleChange('uom', e.target.value)}
                />
              </div>
            </div>

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

        {/* Read-only Components Table */}
        <Card className="mb-6">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium">Components</h3>
            <p className="text-sm text-slate-500 mt-1">
              Component lines are read-only here. Manage lines from the detail page.
            </p>
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
                description: 'Add components from the detail page',
              }}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/manufacturing/boms/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || updateBom.isPending}
          >
            {updateBom.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

function ComponentIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
    </svg>
  );
}
