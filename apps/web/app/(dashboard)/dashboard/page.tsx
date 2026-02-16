'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth, hasPermission } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedNumber, AnimatedCurrency } from '@/components/ui/animated-number';
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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
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

      {/* Stat Cards - single row with colored left borders */}
      {statsLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.04 } }
          }}
        >
          <StatCard
            label="Pending Orders"
            value={stats?.pendingOrders ?? 0}
            sub={stats?.allocatedOrders ? `${stats.allocatedOrders} allocated` : undefined}
            color="blue"
            href="/sales"
          />
          <StatCard
            label="Weekly Sales"
            value={stats?.weeklySalesValue ?? 0}
            isCurrency
            sub="Last 7 days"
            color="emerald"
            href="/sales"
          />
          <StatCard
            label="Trips Active"
            value={stats?.tripsInProgress ?? 0}
            sub={stats?.tripsCompletedToday ? `${stats.tripsCompletedToday} done today` : undefined}
            color="cyan"
            href="/dispatch"
          />
          <StatCard
            label="Open Returns"
            value={stats?.openReturns ?? 0}
            sub={(stats?.openReturns ?? 0) > 0 ? 'Awaiting processing' : 'All clear'}
            color="amber"
            href="/returns"
          />
          <StatCard
            label="Late Orders"
            value={stats?.lateOrders ?? 0}
            sub={(stats?.lateOrders ?? 0) > 0 ? 'Past ship date' : 'On track'}
            color="red"
            href="/sales?late=true"
          />
          <StatCard
            label="Stock Alerts"
            value={(stats?.lowStockItems ?? 0) + (stats?.expiringItems ?? 0)}
            sub={stats?.lowStockItems ? `${stats.lowStockItems} low stock` : 'Healthy'}
            color="violet"
            href="/inventory/expiry-alerts"
          />
        </motion.div>
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
              <BarChart data={warehouseData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="warehouse" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }} />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
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

// --- Stat Card with colored left border ---
const STAT_COLORS = {
  blue: 'border-l-blue-500',
  emerald: 'border-l-emerald-500',
  cyan: 'border-l-cyan-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  violet: 'border-l-violet-500',
} as const;

function StatCard({
  label,
  value,
  isCurrency,
  sub,
  color,
  href,
}: {
  label: string;
  value: number;
  isCurrency?: boolean;
  sub?: string;
  color: keyof typeof STAT_COLORS;
  href: string;
}) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
      <Link href={href}>
        <div
          className={`rounded-xl bg-white border border-slate-200/70 border-l-[3px] ${STAT_COLORS[color]} shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer`}
        >
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900">
            {isCurrency ? (
              <AnimatedCurrency value={value} duration={500} />
            ) : (
              <AnimatedNumber value={value} duration={400} />
            )}
          </div>
          {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
        </div>
      </Link>
    </motion.div>
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

