'use client';

import Link from 'next/link';
import { useAuth, hasPermission } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { StatCard } from '@/components/ui/stat-card';
import {
  useDashboardStats,
  useRecentActivity,
  useWeeklyTrend,
  useStatusDistribution,
  useOrdersByWarehouse,
  useTopCustomers,
} from '@/lib/queries';
import { PERMISSIONS } from '@nerva/shared';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  ALLOCATED: '#8b5cf6',
  PICKING: '#6366f1',
  PACKED: '#06b6d4',
  SHIPPED: '#10b981',
  DELIVERED: '#22c55e',
  INVOICED: '#14b8a6',
};

const PIE_FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#f97316'];

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity(8);
  const { data: weeklyTrend } = useWeeklyTrend();
  const { data: statusDist } = useStatusDistribution();
  const { data: warehouseData } = useOrdersByWarehouse();
  const { data: topCustomers } = useTopCustomers();

  const weeklySalesDisplay = `R ${((stats?.weeklySalesValue ?? 0) / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const quickActions = [
    {
      title: 'Create Sales Order',
      description: 'Start a new customer order',
      href: '/sales/new',
      icon: <PlusIcon />,
      permission: PERMISSIONS.SALES_ORDER_CREATE,
      primary: true,
    },
    {
      title: 'View Fulfilment',
      description: 'Manage pick waves and tasks',
      href: '/fulfilment',
      icon: <BoxIcon />,
      permission: PERMISSIONS.PICK_WAVE_CREATE,
    },
    {
      title: 'Create Purchase Order',
      description: 'Order from suppliers',
      href: '/procurement/purchase-orders/new',
      icon: <ShoppingCartIcon />,
      permission: PERMISSIONS.PURCHASE_ORDER_WRITE,
    },
    {
      title: 'View Inventory',
      description: 'Check stock levels',
      href: '/inventory',
      icon: <InventoryIcon />,
      permission: PERMISSIONS.INVENTORY_READ,
    },
  ].filter(action => hasPermission(user, action.permission));

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <p className="text-sm text-slate-500">
            Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Operations Overview
          </h1>
        </div>
        {/* Quick action buttons inline */}
        <div className="flex gap-2">
          {quickActions.slice(0, 2).map((action) => (
            <Link key={action.title} href={action.href}>
              <Button variant={action.primary ? 'primary' : 'secondary'} size="sm">
                {action.icon}
                <span className="ml-1.5">{action.title}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      {statsLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Pending Orders"
            value={stats?.pendingOrders ?? 0}
            subtitle={stats?.allocatedOrders ? `${stats.allocatedOrders} allocated` : undefined}
            icon={<ClipboardIcon />}
            iconColor="blue"
            href="/sales"
          />
          <StatCard
            title="Weekly Sales"
            value={weeklySalesDisplay}
            icon={<CurrencyIcon />}
            iconColor="green"
            subtitle="Last 7 days"
            href="/sales"
          />
          <StatCard
            title="Trips Active"
            value={stats?.tripsInProgress ?? 0}
            subtitle={stats?.tripsCompletedToday ? `${stats.tripsCompletedToday} done today` : undefined}
            icon={<TruckIcon />}
            iconColor="blue"
            href="/dispatch"
          />
          <StatCard
            title="Open Returns"
            value={stats?.openReturns ?? 0}
            subtitle={(stats?.openReturns ?? 0) > 0 ? 'Awaiting processing' : 'All clear'}
            icon={<ReturnIcon />}
            iconColor="yellow"
            href="/returns"
          />
          <StatCard
            title="Late Orders"
            value={stats?.lateOrders ?? 0}
            subtitle={(stats?.lateOrders ?? 0) > 0 ? 'Past ship date' : 'On track'}
            icon={<ClockIcon />}
            iconColor="red"
            href="/sales?late=true"
          />
          <StatCard
            title="Stock Alerts"
            value={(stats?.lowStockItems ?? 0) + (stats?.expiringItems ?? 0)}
            subtitle={stats?.lowStockItems ? `${stats.lowStockItems} low stock` : 'Healthy'}
            icon={<WarningIcon />}
            iconColor="purple"
            href="/inventory/expiry-alerts"
          />
        </div>
      )}

      {/* Charts Section - 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Weekly Trend Line Chart */}
        <ChartCard title="Weekly Trend" subtitle="Orders vs Shipments">
          {weeklyTrend && weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weeklyTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Orders" />
                <Line type="monotone" dataKey="shipments" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Shipments" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No trend data yet" />
          )}
        </ChartCard>

        {/* Status Distribution Pie Chart */}
        <ChartCard title="Order Status" subtitle="Distribution">
          {statusDist && statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                  label={(props: PieLabelRenderProps) => `${props.name ?? ''} (${props.value ?? 0})`}
                >
                  {statusDist.map((entry, index) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || PIE_FALLBACK_COLORS[index % PIE_FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No orders yet" />
          )}
        </ChartCard>

        {/* Orders by Warehouse Bar Chart */}
        <ChartCard title="By Warehouse" subtitle="Order volume">
          {warehouseData && warehouseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={warehouseData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="warehouse" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Area type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorOrders)" name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No warehouse data" />
          )}
        </ChartCard>

        {/* Top Customers */}
        <ChartCard title="Top Customers" subtitle="By order count">
          {topCustomers && topCustomers.length > 0 ? (
            <div className="space-y-3 pt-1">
              {topCustomers.map((c, i) => {
                const maxOrders = topCustomers[0]?.orders || 1;
                const pct = Math.round((c.orders / maxOrders) * 100);
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-cyan-500'];
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 truncate mr-2">{c.name}</span>
                      <span className="text-sm font-semibold text-slate-900">{c.orders}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[i % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ChartEmpty label="No customer data" />
          )}
        </ChartCard>
      </div>

      {/* Bottom section: Performance + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance Metrics */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-tight mb-4">Performance</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="OTIF"
              value={`${stats?.otifPercent ?? 0}%`}
              sub="On-time in-full"
              good={(stats?.otifPercent ?? 0) >= 90}
            />
            <MetricCard
              label="POD Rate"
              value={`${stats?.podCompletionPercent ?? 0}%`}
              sub="Delivery proof"
              good={(stats?.podCompletionPercent ?? 0) >= 90}
            />
            <MetricCard
              label="Returns"
              value={`${(stats?.returnsRate ?? 0).toFixed(1)}%`}
              sub="Return ratio"
              good={(stats?.returnsRate ?? 0) <= 3}
            />
            <MetricCard
              label="Cycle Time"
              value={`${(stats?.avgDispatchCycleHours ?? 0).toFixed(1)}h`}
              sub="Avg dispatch"
              good={(stats?.avgDispatchCycleHours ?? 0) <= 12}
            />
          </div>

          {/* Quick Actions Row */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href}>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm text-slate-700 hover:text-slate-900">
                    <div className="text-slate-500">{action.icon}</div>
                    <span className="font-medium truncate">{action.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-tight">Recent Activity</h3>
          </div>
          <div className="p-4">
            {activityLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ActivityIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-snug">{item.message}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{getTimeAgo(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Chart card wrapper ---
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
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
    <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">
      {label}
    </div>
  );
}

// --- Performance metric card ---
function MetricCard({
  label,
  value,
  sub,
  good,
}: {
  label: string;
  value: string;
  sub: string;
  good: boolean;
}) {
  return (
    <div className="text-center p-3 rounded-xl bg-slate-50">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${good ? 'text-emerald-600' : 'text-amber-600'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    sales_order: 'bg-blue-500',
    purchase_order: 'bg-purple-500',
    grn: 'bg-emerald-500',
    pick_wave: 'bg-amber-500',
    shipment: 'bg-teal-500',
  };
  return (
    <div className={`h-2 w-2 mt-2 rounded-full ${colors[type] || 'bg-slate-400'} flex-shrink-0`} />
  );
}

// Stat card icons
function ClipboardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

// Icons
function BoxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ShoppingCartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

