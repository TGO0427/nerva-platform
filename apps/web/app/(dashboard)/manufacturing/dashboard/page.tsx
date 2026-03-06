'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { StatCard } from '@/components/ui/stat-card';
import { Spinner } from '@/components/ui/spinner';
import { useManufacturingDashboard } from '@/lib/queries';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { useChartTheme, tooltipStyle } from '@/lib/hooks/use-chart-theme';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  RELEASED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

const PIE_FALLBACK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#f97316'];

export default function ProductionDashboardPage() {
  const { data: dashboard, isLoading } = useManufacturingDashboard();
  const ct = useChartTheme();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Production Dashboard</h1>
        <p className="text-slate-500 mt-1">Real-time overview of manufacturing operations.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active Work Orders"
          value={dashboard?.activeWorkOrders ?? 0}
          icon={<ClipboardIcon />}
          iconColor="blue"
        />
        <StatCard
          title="Today's Output"
          value={dashboard?.todayOutput ?? 0}
          icon={<OutputIcon />}
          iconColor="green"
        />
        <StatCard
          title="Yield Rate"
          value={`${(dashboard?.yieldRate ?? 0).toFixed(1)}%`}
          icon={<YieldIcon />}
          iconColor="purple"
        />
        <StatCard
          title="Workstation Utilization"
          value={`${(dashboard?.workstationUtilization ?? 0).toFixed(1)}%`}
          icon={<FactoryIcon />}
          iconColor="orange"
        />
      </div>

      {/* Charts - 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Status Distribution Pie Chart */}
        <ChartCard title="Status Distribution" subtitle="Work orders by status">
          {dashboard?.statusDistribution && dashboard.statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={dashboard.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                  label={(props: PieLabelRenderProps) => `${props.name ?? ''} (${props.value ?? 0})`}
                >
                  {dashboard.statusDistribution.map((entry, index) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || PIE_FALLBACK_COLORS[index % PIE_FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle(ct)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No work orders yet" />
          )}
        </ChartCard>

        {/* Daily Output Trend */}
        <ChartCard title="Daily Output Trend" subtitle="Last 30 days">
          {dashboard?.dailyOutput && dashboard.dailyOutput.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dashboard.dailyOutput} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: ct.tick }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: ct.tick }} />
                <Tooltip contentStyle={tooltipStyle(ct)} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Line type="monotone" dataKey="output" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Output" />
                <Line type="monotone" dataKey="scrap" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Scrap" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No output data yet" />
          )}
        </ChartCard>

        {/* Top Items Bar Chart */}
        <ChartCard title="Top Produced Items" subtitle="By volume">
          {dashboard?.topItems && dashboard.topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={dashboard.topItems}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis type="number" tick={{ fontSize: 12, fill: ct.tick }} />
                <YAxis
                  type="category"
                  dataKey="itemSku"
                  tick={{ fontSize: 11, fill: ct.tick }}
                  width={75}
                />
                <Tooltip contentStyle={tooltipStyle(ct)} />
                <Bar dataKey="totalOutput" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Output" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No production data yet" />
          )}
        </ChartCard>

        {/* Active Orders Table */}
        <ChartCard title="Active Orders" subtitle="In progress">
          {dashboard?.activeOrders && dashboard.activeOrders.length > 0 ? (
            <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">WO#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Progress</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Planned End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {dashboard.activeOrders.map((order) => {
                    const progress = order.qtyOrdered > 0
                      ? (order.qtyCompleted / order.qtyOrdered * 100).toFixed(0)
                      : '0';
                    return (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-sm">
                          <Link
                            href={`/manufacturing/work-orders/${order.id}`}
                            className="text-primary-600 hover:underline font-medium"
                          >
                            {order.workOrderNo}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700">{order.itemSku}</td>
                        <td className="px-3 py-2 text-sm">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${STATUS_COLORS[order.status] || '#94a3b8'}20`,
                              color: STATUS_COLORS[order.status] || '#94a3b8',
                            }}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-medium">{progress}%</td>
                        <td className="px-3 py-2 text-sm text-right text-slate-500">
                          {order.plannedEnd
                            ? new Date(order.plannedEnd).toLocaleDateString('en-ZA')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <ChartEmpty label="No active orders" />
          )}
        </ChartCard>
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

// --- Inline SVG Icons ---
function ClipboardIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function OutputIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function YieldIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function FactoryIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}
