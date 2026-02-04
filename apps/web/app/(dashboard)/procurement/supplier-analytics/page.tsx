'use client';

import { useState } from 'react';
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
        <h1 className="text-2xl font-bold text-gray-900">Supplier Analytics</h1>
        <p className="text-gray-500 mt-1">Monitor supplier performance, NCRs, and procurement trends.</p>
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
                        className="text-sm font-medium text-gray-900 hover:text-primary-600"
                      >
                        {supplier.name}
                      </Link>
                      <p className="text-xs text-gray-500">{supplier.poCount} purchase orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        R {supplier.totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No purchase order data available.</p>
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
                  <div key={ncr.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ncr.ncrNo}</p>
                        <p className="text-xs text-gray-500">{ncr.supplierName}</p>
                      </div>
                      <NcrStatusBadge status={ncr.status} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ncr.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No NCRs recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>NCR Trend (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {ncrTrends && ncrTrends.length > 0 ? (
              <SimpleBarChart data={ncrTrends} color="red" />
            ) : (
              <p className="text-gray-500 text-sm">No trend data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Trend (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {poTrends && poTrends.length > 0 ? (
              <SimpleBarChart data={poTrends} color="blue" valueKey="value" />
            ) : (
              <p className="text-gray-500 text-sm">No trend data available.</p>
            )}
          </CardContent>
        </Card>
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Contracts
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Last PO
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {performance.data.map((supplier: SupplierPerformanceStats) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/master-data/suppliers/${supplier.id}`}
                            className="text-sm font-medium text-primary-600 hover:underline"
                          >
                            {supplier.code ? `${supplier.code} - ` : ''}{supplier.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {supplier.totalPOs}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          R {supplier.totalPOValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          R {supplier.avgPOValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {supplier.totalNCRs > 0 ? (
                            <span className={supplier.openNCRs > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                              {supplier.openNCRs} open / {supplier.totalNCRs} total
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <NcrRateBadge rate={supplier.ncrRate} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                          {supplier.activeContracts > 0 ? (
                            <Badge variant="success">{supplier.activeContracts}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
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
                  <p className="text-sm text-gray-500">
                    Page {performancePage} of {performance.meta.totalPages ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPerformancePage(p => Math.max(1, p - 1))}
                      disabled={performancePage <= 1}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPerformancePage(p => p + 1)}
                      disabled={performancePage >= (performance.meta.totalPages || 1)}
                      className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">No supplier performance data available.</p>
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
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400">{subtitle}</p>
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
      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
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
  if (rate === 0) return <span className="text-gray-400">-</span>;

  const variant = rate > 10 ? 'danger' : rate > 5 ? 'warning' : 'success';
  return <Badge variant={variant}>{rate.toFixed(1)}%</Badge>;
}

// Simple Bar Chart Component
function SimpleBarChart({
  data,
  color,
  valueKey = 'count',
}: {
  data: Array<{ month: string; count?: number; value?: number }>;
  color: 'blue' | 'red' | 'green';
  valueKey?: 'count' | 'value';
}) {
  const values = data.map(d => d[valueKey] ?? 0);
  const maxValue = Math.max(...values, 1);

  const colorClasses = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
  };

  return (
    <div className="h-48 flex items-end justify-between gap-1">
      {data.map((item, index) => {
        const value = item[valueKey] ?? 0;
        const height = (value / maxValue) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full ${colorClasses[color]} rounded-t transition-all duration-300`}
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${item.month}: ${valueKey === 'value' ? `R ${value.toLocaleString()}` : value}`}
            />
            <span className="text-xs text-gray-400 mt-1 rotate-45 origin-left whitespace-nowrap">
              {item.month.slice(0, 3)}
            </span>
          </div>
        );
      })}
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
