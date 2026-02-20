'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  useSupplierDashboardSummary,
  useSupplierPerformanceStats,
  useNcrTrends,
  usePurchaseOrderTrends,
  type SupplierPerformanceStats,
} from '@/lib/queries/suppliers';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

export default function SupplierAnalyticsPage() {
  const [performancePage, setPerformancePage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('totalPOValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: summary, isLoading: summaryLoading } = useSupplierDashboardSummary();
  const { data: performance, isLoading: perfLoading } = useSupplierPerformanceStats({
    page: performancePage,
    limit: 10,
    sortBy,
    sortOrder,
  });
  const { data: ncrTrends } = useNcrTrends(12);
  const { data: poTrends } = usePurchaseOrderTrends(12);

  const fillMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }, []);

  const ncrData = useMemo(() => {
    if (!ncrTrends) return [];
    const dataMap = new Map(ncrTrends.map((d) => [d.month, d]));
    return fillMonths.map((key) => dataMap.get(key) ?? { month: key, count: 0, value: 0 });
  }, [ncrTrends, fillMonths]);

  const poData = useMemo(() => {
    if (!poTrends) return [];
    const dataMap = new Map(poTrends.map((d) => [d.month, d]));
    return fillMonths.map((key) => dataMap.get(key) ?? { month: key, count: 0, value: 0 });
  }, [poTrends, fillMonths]);

  if (summaryLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPerformancePage(1);
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Supplier Analytics</h1>
        <p className="text-slate-500 mt-1">Monitor supplier performance, NCRs, and procurement trends.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Total Suppliers"
          value={summary?.totalSuppliers ?? 0}
          subtitle={`${summary?.activeSuppliers ?? 0} active`}
          icon={<BuildingIcon />}
          color="blue"
        />
        <SummaryCard
          title="Total PO Value"
          value={`R ${(summary?.totalPOValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
          subtitle={`Avg: R ${(summary?.avgPOValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
          icon={<CurrencyIcon />}
          color="green"
        />
        <SummaryCard
          title="Open NCRs"
          value={summary?.openNCRs ?? 0}
          subtitle="Requires attention"
          icon={<AlertIcon />}
          color="red"
        />
        <SummaryCard
          title="Active Contracts"
          value={summary?.activeContracts ?? 0}
          subtitle="Currently in effect"
          icon={<DocumentIcon />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Suppliers by PO Value */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Suppliers by Purchase Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.topSuppliersByPO && summary.topSuppliersByPO.length > 0 ? (
              <div className="space-y-4">
                {summary.topSuppliersByPO.map((supplier, index) => (
                  <div key={supplier.id} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-1">
                      <Link
                        href={`/master-data/suppliers/${supplier.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-primary-600"
                      >
                        {supplier.name}
                      </Link>
                      <p className="text-xs text-slate-500">{supplier.poCount} purchase orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        R {supplier.totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No purchase order data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent NCRs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent NCRs</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.recentNCRs && summary.recentNCRs.length > 0 ? (
              <div className="space-y-3">
                {summary.recentNCRs.map((ncr) => (
                  <div key={ncr.id} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{ncr.ncrNo}</p>
                        <p className="text-xs text-slate-500">{ncr.supplierName}</p>
                      </div>
                      <NcrStatusBadge status={ncr.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(ncr.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No NCRs recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="NCR Trend" subtitle="Last 12 months">
          {ncrData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={ncrData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <XAxis dataKey="month" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v: string) => { const [y, m] = v.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m, 10) - 1] + ' ' + y.slice(2); }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Line type="natural" dataKey="count" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 5, fill: '#ffffff', stroke: '#ef4444', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} name="NCRs" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No NCR trend data available" />
          )}
        </ChartCard>

        <ChartCard title="Purchase Order Value Trend" subtitle="Last 12 months">
          {poData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={poData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <XAxis dataKey="month" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v: string) => { const [y, m] = v.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m, 10) - 1] + ' ' + y.slice(2); }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v: number) => `R ${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: unknown) => [`R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 'PO Value']} />
                <Line type="natural" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} name="PO Value" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No PO trend data available" />
          )}
        </ChartCard>
      </div>

      {/* Additional Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="PO Count Trend" subtitle="Last 12 months">
          {poData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={poData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <XAxis dataKey="month" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v: string) => { const [y, m] = v.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m, 10) - 1] + ' ' + y.slice(2); }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Line type="natural" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 5, fill: '#ffffff', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} name="Purchase Orders" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No PO trend data available" />
          )}
        </ChartCard>

        {summary?.topSuppliersByPO && summary.topSuppliersByPO.length > 0 && (
          <ChartCard title="Spend Distribution" subtitle="Top suppliers">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={summary.topSuppliersByPO}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="totalValue"
                  nameKey="name"
                  label={(props: PieLabelRenderProps) => `${props.name ?? ''} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {summary.topSuppliersByPO.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: unknown) => [`R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 'Spend']}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Supplier Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {perfLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : performance?.data && performance.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Supplier
                      </th>
                      <SortableHeader
                        label="Total POs"
                        column="totalPOs"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="PO Value"
                        column="totalPOValue"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Avg PO"
                        column="avgPOValue"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="NCRs"
                        column="totalNCRs"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="NCR Rate"
                        column="ncrRate"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Contracts
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Last PO
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {performance.data.map((supplier: SupplierPerformanceStats) => (
                      <tr key={supplier.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/master-data/suppliers/${supplier.id}`}
                            className="text-sm font-medium text-primary-600 hover:underline"
                          >
                            {supplier.code ? `${supplier.code} - ` : ''}{supplier.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                          {supplier.totalPOs}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                          R {supplier.totalPOValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                          R {supplier.avgPOValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {supplier.totalNCRs > 0 ? (
                            <span className={supplier.openNCRs > 0 ? 'text-red-600 font-medium' : 'text-slate-900'}>
                              {supplier.openNCRs} open / {supplier.totalNCRs} total
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <NcrRateBadge rate={supplier.ncrRate} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-center">
                          {supplier.activeContracts > 0 ? (
                            <Badge variant="success">{supplier.activeContracts}</Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {supplier.lastPODate
                            ? new Date(supplier.lastPODate).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {performance.meta && (performance.meta.totalPages ?? 1) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-500">
                    Page {performancePage} of {performance.meta.totalPages ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPerformancePage(p => Math.max(1, p - 1))}
                      disabled={performancePage <= 1}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPerformancePage(p => p + 1)}
                      disabled={performancePage >= (performance.meta.totalPages || 1)}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm py-8 text-center">No supplier performance data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="ml-4">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sortable Header Component
function SortableHeader({
  label,
  column,
  currentSort,
  sortOrder,
  onSort,
}: {
  label: string;
  column: string;
  currentSort: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}) {
  const isActive = currentSort === column;
  return (
    <th
      className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center justify-end gap-1">
        {label}
        {isActive && (
          <span className="text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );
}

// NCR Status Badge
function NcrStatusBadge({ status }: { status: string }) {
  const variant = status === 'OPEN' ? 'danger' : status === 'RESOLVED' ? 'success' : 'default';
  return <Badge variant={variant} className="text-xs">{status}</Badge>;
}

// NCR Rate Badge
function NcrRateBadge({ rate }: { rate: number }) {
  if (rate === 0) return <span className="text-slate-400">-</span>;

  const variant = rate > 10 ? 'danger' : rate > 5 ? 'warning' : 'success';
  return <Badge variant={variant}>{rate.toFixed(1)}%</Badge>;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#f97316'];

// Chart card wrapper
function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5">
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-400">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
      {label}
    </div>
  );
}

// Icons
function BuildingIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
