'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { useBoms, useBomExplosion } from '@/lib/queries/manufacturing';
import type { BomExplodedLine } from '@nerva/shared';

export default function BomCalculatorPage() {
  const router = useRouter();
  const [selectedBomId, setSelectedBomId] = useState('');
  const [requiredKg, setRequiredKg] = useState('');

  const { data: bomsData } = useBoms({ page: 1, limit: 200, status: 'APPROVED' });
  const boms = bomsData?.data || [];

  const qty = parseFloat(requiredKg);
  const { data: explosion, isLoading } = useBomExplosion(
    selectedBomId || undefined,
    qty > 0 ? qty : undefined,
  );

  const ingredientColumns: Column<BomExplodedLine>[] = useMemo(() => [
    { key: 'itemSku', header: 'Code', render: (row) => row.itemSku || '-' },
    { key: 'itemDescription', header: 'Description', render: (row) => row.itemDescription || '-' },
    { key: 'qtyPer', header: 'Qty/kg', width: '90px', render: (row) => row.qtyPer.toFixed(4) },
    { key: 'scaledQty', header: 'Scaled Qty', width: '100px', render: (row) => row.scaledQty.toFixed(3) },
    { key: 'bomPct', header: 'BOM %', width: '80px', render: (row) => row.bomPct.toFixed(1) + '%' },
    { key: 'scrapPct', header: 'Scrap %', width: '80px', render: (row) => row.scrapPct.toFixed(1) + '%' },
  ], []);

  const packagingColumns: Column<BomExplodedLine>[] = useMemo(() => [
    { key: 'itemSku', header: 'Code', render: (row) => row.itemSku || '-' },
    { key: 'itemDescription', header: 'Description', render: (row) => row.itemDescription || '-' },
    { key: 'qtyPer', header: 'Qty/kg', width: '90px', render: (row) => row.qtyPer.toFixed(4) },
    { key: 'scaledQty', header: 'Scaled Qty', width: '100px', render: (row) => Math.ceil(row.scaledQty).toString() },
    { key: 'bomPct', header: 'BOM %', width: '80px', render: (row) => row.bomPct.toFixed(1) + '%' },
    { key: 'scrapPct', header: 'Scrap %', width: '80px', render: (row) => row.scrapPct.toFixed(1) + '%' },
  ], []);

  const selectedBom = boms.find(b => b.id === selectedBomId);

  const handleCreateWorkOrder = () => {
    if (!explosion) return;
    const params = new URLSearchParams();
    params.set('itemId', explosion.bomHeader.itemId);
    params.set('bomHeaderId', explosion.bomHeader.id);
    params.set('qtyOrdered', String(explosion.requiredKg));
    router.push(`/manufacturing/work-orders/new?${params.toString()}`);
  };

  return (
    <PageShell>
      <PageHeader
        title="BOM Calculator"
        subtitle="Calculate scaled quantities for production"
      />

      <Card className="mt-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bill of Materials
            </label>
            <Select
              value={selectedBomId}
              onChange={(e) => setSelectedBomId(e.target.value)}
              options={[
                { value: '', label: 'Select an approved BOM...' },
                ...boms.map((bom) => ({
                  value: bom.id,
                  label: `${(bom as any).itemSku || 'Item'} - V${bom.version} Rev ${bom.revision}${(bom as any).itemDescription ? ` (${(bom as any).itemDescription})` : ''}`,
                })),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Required FG Qty (kg)
            </label>
            <Input
              type="number"
              min="0.001"
              step="any"
              value={requiredKg}
              onChange={(e) => setRequiredKg(e.target.value)}
              placeholder="Enter required kg"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleCreateWorkOrder}
              disabled={!explosion}
            >
              Create Work Order
            </Button>
          </div>
        </div>

        {selectedBom && qty > 0 && (
          <div className="mt-4 flex gap-4 text-sm text-slate-600">
            <span>Base Qty: <strong>{selectedBom.baseQty} {selectedBom.uom}</strong></span>
            {explosion && (
              <span>Scale Factor: <strong>{explosion.scaleFactor.toFixed(4)}</strong></span>
            )}
          </div>
        )}
      </Card>

      {isLoading && (
        <div className="mt-6 text-center py-8 text-slate-500">Calculating...</div>
      )}

      {explosion && (
        <div className="mt-6 space-y-6">
          {/* Ingredients */}
          <Card>
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-medium text-slate-900">
                Ingredients ({explosion.ingredients.length})
              </h3>
            </div>
            <DataTable
              columns={ingredientColumns}
              data={explosion.ingredients}
              keyField="id"
              variant="embedded"
              emptyState={{
                icon: <EmptyIcon />,
                title: 'No ingredients',
                description: 'This BOM has no ingredient lines',
              }}
            />
            {explosion.ingredients.length > 0 && (
              <div className="px-4 py-2 border-t bg-slate-50 text-sm font-medium text-slate-700 text-right">
                Total Ingredient Qty: {explosion.totals.ingredientQty.toFixed(3)}
              </div>
            )}
          </Card>

          {/* Packaging */}
          <Card>
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-medium text-slate-900">
                Packaging ({explosion.packaging.length})
              </h3>
            </div>
            <DataTable
              columns={packagingColumns}
              data={explosion.packaging}
              keyField="id"
              variant="embedded"
              emptyState={{
                icon: <EmptyIcon />,
                title: 'No packaging',
                description: 'This BOM has no packaging lines',
              }}
            />
            {explosion.packaging.length > 0 && (
              <div className="px-4 py-2 border-t bg-slate-50 text-sm font-medium text-slate-700 text-right">
                Total Packaging Qty: {explosion.totals.packagingQty.toFixed(0)}
              </div>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function EmptyIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
