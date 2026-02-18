'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  useCustomerDashboardSummary,
  useCustomerPerformanceStats,
  useSalesOrderTrends,
  type CustomerPerformanceStats,
} from '@/lib/queries/customers';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

export default function CustomerAnalyticsPage() {
  const [performancePage, setPerformancePage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('totalOrderValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: summary, isLoading: summaryLoading } = useCustomerDashboardSummary();
  const { data: performance, isLoading: perfLoading } = useCustomerPerformanceStats({
    page: performancePage,
    limit: 10,
    sortBy,
    sortOrder,
  });
  const { data: salesTrends } = useSalesOrderTrends(12);

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
        <h1 className="text-2xl font-bold text-slate-900">Customer Analytics</h1>
        <p className="text-slate-500 mt-1">Monitor customer performance, sales trends, and order analytics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Total Customers"
          value={summary?.totalCustomers ?? 0}
          subtitle={`${summary?.activeCustomers ?? 0} active`}
          icon={<UsersIcon />}
          color="blue"
        />
        <SummaryCard
          title="Total Sales Value"
          value={`R ${(summary?.totalSalesValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
          subtitle={`Avg: R ${(summary?.avgOrderValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
          icon={<CurrencyIcon />}
          color="green"
        />
        <SummaryCard
          title="Total Orders"
          value={summary?.totalOrders ?? 0}
          subtitle="All time"
          icon={<ClipboardIcon />}
          color="purple"
        />
        <SummaryCard
          title="Pending Orders"
          value={summary?.pendingOrders ?? 0}
          subtitle="Awaiting fulfilment"
          icon={<ClockIcon />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Customers by Sales Value */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Customers by Sales Value</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.topCustomersBySales && summary.topCustomersBySales.length > 0 ? (
              <div className="space-y-4">
                {summary.topCustomersBySales.map((customer, index) => (
                  <div key={customer.id} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-1">
                      <Link
                        href={`/master-data/customers/${customer.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-primary-600"
                      >
                        {customer.name}
                      </Link>
                      <p className="text-xs text-slate-500">{customer.orderCount} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        R {customer.totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No sales data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.recentOrders && summary.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {summary.recentOrders.map((order) => (
                  <div key={order.id} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/sales/${order.id}`}
                          className="text-sm font-medium text-primary-600 hover:underline"
                        >
                          {order.soNo}
                        </Link>
                        <p className="text-xs text-slate-500">{order.customerName}</p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs font-medium text-slate-700">
                        R {order.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No recent orders.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Sales Value Trend" subtitle="Last 12 months">
          {salesTrends && salesTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSalesValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(v: number) => `R ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: unknown) => [`R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 'Sales Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorSalesValue)" name="Sales Value" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No trend data available" />
          )}
        </ChartCard>

        <ChartCard title="Order Count Trend" subtitle="Last 12 months">
          {salesTrends && salesTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No trend data available" />
          )}
        </ChartCard>
      </div>

      {/* Top Customers Breakdown - Pie Chart */}
      {summary?.topCustomersBySales && summary.topCustomersBySales.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Revenue Distribution" subtitle="Top customers">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={summary.topCustomersBySales}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="totalValue"
                  nameKey="name"
                  label={(props: PieLabelRenderProps) => `${props.name ?? ''} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {summary.topCustomersBySales.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: unknown) => [`R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Orders by Customer" subtitle="Top customers">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={summary.topCustomersBySales} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCustOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Area type="monotone" dataKey="orderCount" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorCustOrders)" name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Customer Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Performance</CardTitle>
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
                        Customer
                      </th>
                      <SortableHeader
                        label="Total Orders"
                        column="totalOrders"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Order Value"
                        column="totalOrderValue"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Avg Order"
                        column="avgOrderValue"
                        currentSort={sortBy}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                        Shipped
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                        Cancelled
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Last Order
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {performance.data.map((customer: CustomerPerformanceStats) => (
                      <tr key={customer.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/master-data/customers/${customer.id}`}
                            className="text-sm font-medium text-primary-600 hover:underline"
                          >
                            {customer.code ? `${customer.code} - ` : ''}{customer.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                          {customer.totalOrders}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                          R {customer.totalOrderValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
                          R {customer.avgOrderValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {customer.shippedOrders > 0 ? (
                            <span className="text-green-600">{customer.shippedOrders}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {customer.cancelledOrders > 0 ? (
                            <span className="text-red-600">{customer.cancelledOrders}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                          {customer.lastOrderDate
                            ? new Date(customer.lastOrderDate).toLocaleDateString()
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
            <p className="text-slate-500 text-sm py-8 text-center">No customer performance data available.</p>
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
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
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

// Order Status Badge
function OrderStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    DRAFT: 'default',
    PENDING: 'warning',
    ALLOCATED: 'warning',
    PICKING: 'warning',
    SHIPPED: 'success',
    DELIVERED: 'success',
    CANCELLED: 'danger',
  };
  return <Badge variant={variants[status] || 'default'} className="text-xs">{status}</Badge>;
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
function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
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

function ClipboardIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
