'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useBatchTrace, useForwardTrace, useBackwardTrace, useRecentBatches } from '@/lib/queries';

export default function BatchTraceabilityPage() {
  const [batchInput, setBatchInput] = useState('');
  const [searchedBatch, setSearchedBatch] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'forward' | 'backward'>('forward');

  const { data: recentBatches } = useRecentBatches();
  const { data: trace, isLoading: traceLoading } = useBatchTrace(searchedBatch);
  const { data: forwardTrace, isLoading: forwardLoading } = useForwardTrace(searchedBatch);
  const { data: backwardTrace, isLoading: backwardLoading } = useBackwardTrace(searchedBatch);

  function handleSearch() {
    const trimmed = batchInput.trim();
    if (trimmed) {
      setSearchedBatch(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  const isLoading = traceLoading || forwardLoading || backwardLoading;

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Batch Traceability</h1>
        <p className="text-slate-500 mt-1">Trace materials and products through the production chain.</p>
      </div>

      {/* Search Bar */}
      <div className="flex items-end gap-3 mb-8">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Enter batch number..."
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button variant="primary" onClick={handleSearch} disabled={!batchInput.trim()}>
          <SearchIcon />
          <span className="ml-1.5">Search</span>
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* No search yet — show recent batches */}
      {!searchedBatch && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBatches && recentBatches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Batch#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">WO#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {recentBatches.map((b) => (
                      <tr key={b.batchNo} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm font-medium text-slate-800">{b.batchNo}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{b.workOrderNo}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{b.itemSku}</td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${STATUS_COLORS[b.status] || '#94a3b8'}20`,
                              color: STATUS_COLORS[b.status] || '#94a3b8',
                            }}
                          >
                            {b.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => { setBatchInput(b.batchNo); setSearchedBatch(b.batchNo); }}
                            className="text-xs text-primary-600 hover:underline font-medium"
                          >
                            Trace
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <TraceIcon />
                </div>
                <p className="text-slate-500 text-sm">No batches available. Enter a batch number above to trace.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {searchedBatch && !isLoading && (
        <>
          {/* Batch Details Card */}
          {trace?.workOrder && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Batch Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">WO#</p>
                    <Link
                      href={`/manufacturing/work-orders/${trace.workOrder.id}`}
                      className="text-sm text-primary-600 hover:underline font-medium"
                    >
                      {trace.workOrder.workOrderNo}
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Batch#</p>
                    <p className="text-sm text-slate-800 font-medium">{trace.workOrder.batchNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Product</p>
                    <p className="text-sm text-slate-800">{trace.workOrder.itemSku}</p>
                    <p className="text-xs text-slate-500">{trace.workOrder.itemDescription}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Status</p>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${STATUS_COLORS[trace.workOrder.status] || '#94a3b8'}20`,
                        color: STATUS_COLORS[trace.workOrder.status] || '#94a3b8',
                      }}
                    >
                      {trace.workOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Qty Ordered</p>
                    <p className="text-sm text-slate-800 font-medium">{trace.workOrder.qtyOrdered}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Qty Completed</p>
                    <p className="text-sm text-slate-800 font-medium">{trace.workOrder.qtyCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!trace?.workOrder && (
            <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-8 text-center mb-6">
              <p className="text-slate-500 text-sm">No work order found for batch &quot;{searchedBatch}&quot;.</p>
            </div>
          )}

          {/* Materials, Output, Scrap Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Materials Used */}
            <Card>
              <CardHeader>
                <CardTitle>Materials Used</CardTitle>
              </CardHeader>
              <CardContent>
                {trace?.materialsUsed && trace.materialsUsed.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Batch#</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {trace.materialsUsed.map((m, i) => (
                          <tr key={`mat-${i}`} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-sm text-slate-800">{m.itemSku}</td>
                            <td className="px-3 py-2 text-sm text-slate-600">{m.batchNo || '-'}</td>
                            <td className="px-3 py-2 text-sm text-right">{m.qty}</td>
                            <td className="px-3 py-2 text-sm text-right text-slate-500">
                              {new Date(m.createdAt).toLocaleDateString('en-ZA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-sm">No materials recorded.</p>
                )}
              </CardContent>
            </Card>

            {/* Output Produced */}
            <Card>
              <CardHeader>
                <CardTitle>Output Produced</CardTitle>
              </CardHeader>
              <CardContent>
                {trace?.outputProduced && trace.outputProduced.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Batch#</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {trace.outputProduced.map((o, i) => (
                          <tr key={`out-${i}`} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-sm text-slate-800">{o.itemSku}</td>
                            <td className="px-3 py-2 text-sm text-slate-600">{o.batchNo || '-'}</td>
                            <td className="px-3 py-2 text-sm text-right">{o.qty}</td>
                            <td className="px-3 py-2 text-sm text-right text-slate-500">
                              {new Date(o.createdAt).toLocaleDateString('en-ZA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-sm">No output recorded.</p>
                )}
              </CardContent>
            </Card>

            {/* Scrap */}
            <Card>
              <CardHeader>
                <CardTitle>Scrap</CardTitle>
              </CardHeader>
              <CardContent>
                {trace?.scrapEntries && trace.scrapEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Batch#</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Reason</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {trace.scrapEntries.map((s, i) => (
                          <tr key={`scrap-${i}`} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-sm text-slate-800">{s.itemSku}</td>
                            <td className="px-3 py-2 text-sm text-slate-600">{s.batchNo || '-'}</td>
                            <td className="px-3 py-2 text-sm text-right">{s.qty}</td>
                            <td className="px-3 py-2 text-sm text-slate-600">{s.reasonCode || '-'}</td>
                            <td className="px-3 py-2 text-sm text-right text-slate-500">
                              {new Date(s.createdAt).toLocaleDateString('en-ZA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4 text-sm">No scrap recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Forward / Backward Trace Tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('forward')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'forward'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Forward Trace
                </button>
                <button
                  onClick={() => setActiveTab('backward')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'backward'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Backward Trace
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'forward' && (
                <>
                  {forwardTrace?.workOrders && forwardTrace.workOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <p className="text-xs text-slate-500 mb-3">
                        Work orders that consumed material from batch &quot;{searchedBatch}&quot;
                      </p>
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">WO#</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Finished Batch#</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty Consumed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {forwardTrace.workOrders.map((wo) => (
                            <tr key={wo.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm">
                                <Link
                                  href={`/manufacturing/work-orders/${wo.id}`}
                                  className="text-primary-600 hover:underline font-medium"
                                >
                                  {wo.workOrderNo}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-700">{wo.itemSku}</td>
                              <td className="px-4 py-2 text-sm text-slate-600">{wo.finishedBatchNo || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right font-medium">{wo.qtyConsumed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-6 text-sm">
                      No downstream work orders found for this batch.
                    </p>
                  )}
                </>
              )}

              {activeTab === 'backward' && (
                <>
                  {backwardTrace?.materials && backwardTrace.materials.length > 0 ? (
                    <div className="overflow-x-auto">
                      <p className="text-xs text-slate-500 mb-3">
                        Materials used to produce finished goods batch &quot;{searchedBatch}&quot;
                        {backwardTrace.workOrderNo && (
                          <> (WO: <Link href={`/manufacturing/work-orders/${backwardTrace.workOrderId}`} className="text-primary-600 hover:underline">{backwardTrace.workOrderNo}</Link>)</>
                        )}
                      </p>
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item SKU</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Batch#</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {backwardTrace.materials.map((m, i) => (
                            <tr key={`bwd-${i}`} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm font-medium text-slate-800">{m.itemSku}</td>
                              <td className="px-4 py-2 text-sm text-slate-600">{m.itemDescription}</td>
                              <td className="px-4 py-2 text-sm text-slate-600">{m.batchNo || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right font-medium">{m.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-6 text-sm">
                      No upstream materials found for this batch.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  RELEASED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

// --- Inline SVG Icons ---
function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function TraceIcon() {
  return (
    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}
