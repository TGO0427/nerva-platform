'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { useBoms, useCompareBoms } from '@/lib/queries/manufacturing';

export default function CompareBomPage() {
  const [bom1Id, setBom1Id] = useState('');
  const [bom2Id, setBom2Id] = useState('');

  const { data: bomsData } = useBoms({ page: 1, limit: 100 });
  const { data: comparison, isLoading: isComparing } = useCompareBoms(
    bom1Id || undefined,
    bom2Id || undefined
  );

  const boms = bomsData?.data || [];

  const getBomLabel = (bom: typeof boms[0]) =>
    `${(bom as any).itemSku || 'Unknown'} - V${bom.version} Rev ${bom.revision} (${bom.status})`;

  const added = comparison?.differences?.added || [];
  const removed = comparison?.differences?.removed || [];
  const changed = comparison?.differences?.changed || [];

  return (
    <PageShell>
      <PageHeader
        title="Compare BOMs"
        subtitle="Compare two bill of materials versions side-by-side"
      />
      <Card className="p-6 mb-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              First BOM
            </label>
            <Select
              value={bom1Id}
              onChange={(e) => setBom1Id(e.target.value)}
              options={[
                { value: '', label: 'Select BOM...' },
                ...boms.filter((b) => b.id !== bom2Id).map((bom) => ({
                  value: bom.id,
                  label: getBomLabel(bom),
                })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Second BOM
            </label>
            <Select
              value={bom2Id}
              onChange={(e) => setBom2Id(e.target.value)}
              options={[
                { value: '', label: 'Select BOM...' },
                ...boms.filter((b) => b.id !== bom1Id).map((bom) => ({
                  value: bom.id,
                  label: getBomLabel(bom),
                })),
              ]}
            />
          </div>
        </div>
      </Card>

      {isComparing && (
        <Card className="p-12">
          <div className="text-center text-slate-500">
            Loading comparison...
          </div>
        </Card>
      )}

      {comparison && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="text-sm text-green-600 font-medium">Added</div>
              <div className="mt-1 text-2xl font-bold text-green-700">
                {added.length}
              </div>
              <div className="text-sm text-green-600">components</div>
            </Card>
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="text-sm text-red-600 font-medium">Removed</div>
              <div className="mt-1 text-2xl font-bold text-red-700">
                {removed.length}
              </div>
              <div className="text-sm text-red-600">components</div>
            </Card>
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="text-sm text-yellow-600 font-medium">Changed</div>
              <div className="mt-1 text-2xl font-bold text-yellow-700">
                {changed.length}
              </div>
              <div className="text-sm text-yellow-600">components</div>
            </Card>
          </div>

          {/* Added Components */}
          {added.length > 0 && (
            <Card>
              <div className="p-4 border-b bg-green-50">
                <h3 className="text-lg font-medium text-green-800">Added Components</h3>
                <p className="text-sm text-green-600">Components in the second BOM but not in the first</p>
              </div>
              <div className="divide-y">
                {added.map((item, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.itemId.slice(0, 8)}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">+ {item.qtyPer} {item.uom}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Removed Components */}
          {removed.length > 0 && (
            <Card>
              <div className="p-4 border-b bg-red-50">
                <h3 className="text-lg font-medium text-red-800">Removed Components</h3>
                <p className="text-sm text-red-600">Components in the first BOM but not in the second</p>
              </div>
              <div className="divide-y">
                {removed.map((item, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.itemId.slice(0, 8)}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="danger">- {item.qtyPer} {item.uom}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Changed Components */}
          {changed.length > 0 && (
            <Card>
              <div className="p-4 border-b bg-yellow-50">
                <h3 className="text-lg font-medium text-yellow-800">Changed Components</h3>
                <p className="text-sm text-yellow-600">Components with quantity or attribute changes</p>
              </div>
              <div className="divide-y">
                {changed.map((item, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{item.left.itemId.slice(0, 8)}</div>
                        <div className="text-sm text-slate-500">Changed: {item.changedFields.join(', ')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-50 p-3 rounded">
                        <div className="text-slate-500 mb-1">Before</div>
                        <div>Qty: {item.left.qtyPer} {item.left.uom}</div>
                        {item.left.scrapPct !== undefined && (
                          <div>Scrap: {item.left.scrapPct}%</div>
                        )}
                      </div>
                      <div className="bg-yellow-50 p-3 rounded">
                        <div className="text-slate-500 mb-1">After</div>
                        <div className="flex items-center gap-2">
                          Qty: {item.right.qtyPer} {item.right.uom}
                          {item.left.qtyPer !== item.right.qtyPer && (
                            <span className={item.right.qtyPer > item.left.qtyPer ? 'text-green-600' : 'text-red-600'}>
                              ({item.right.qtyPer > item.left.qtyPer ? '+' : ''}{(item.right.qtyPer - item.left.qtyPer).toFixed(4)})
                            </span>
                          )}
                        </div>
                        {item.right.scrapPct !== undefined && (
                          <div>Scrap: {item.right.scrapPct}%</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No Changes */}
          {added.length === 0 && removed.length === 0 && changed.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-slate-500">
                <CheckIcon className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium text-slate-900">No Differences</h3>
                <p className="mt-1">The two BOMs have identical components.</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {!bom1Id || !bom2Id ? (
        <Card className="p-12">
          <div className="text-center text-slate-500">
            <CompareIcon className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Select BOMs to Compare</h3>
            <p className="mt-1">Choose two BOMs above to see the differences.</p>
          </div>
        </Card>
      ) : null}
    </PageShell>
  );
}

function CompareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
