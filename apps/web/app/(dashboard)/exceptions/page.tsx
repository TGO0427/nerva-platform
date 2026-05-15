'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Breadcrumbs } from '@/components/layout';
import { Spinner } from '@/components/ui/spinner';
import { useDashboardStats } from '@/lib/queries';
import type { DashboardStats } from '@/lib/queries';
import { formatNumber } from '@/lib/format';
import { tooltipStyle, useChartTheme } from '@/lib/hooks/use-chart-theme';

type ExceptionTone = 'danger' | 'warning' | 'success';

interface ExceptionQueue {
  title: string;
  description: string;
  value: number;
  href: string;
  tone: ExceptionTone;
  group: string;
}

const TONE_COLORS: Record<ExceptionTone, string> = {
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
};

export default function ExceptionsPage() {
  const ct = useChartTheme();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div>
        <Breadcrumbs />
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <Breadcrumbs />
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Exceptions unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">Refresh the page to load the latest operational queues.</p>
        </div>
      </div>
    );
  }

  const queues = getExceptionQueues(stats);
  const activeQueues = queues.filter((queue) => queue.value > 0);
  const totalExceptions = queues.reduce((sum, queue) => sum + queue.value, 0);
  const criticalExceptions = queues
    .filter((queue) => queue.tone === 'danger')
    .reduce((sum, queue) => sum + queue.value, 0);
  const warningExceptions = queues
    .filter((queue) => queue.tone === 'warning')
    .reduce((sum, queue) => sum + queue.value, 0);
  const areaData = getAreaData(queues);
  const severityData = [
    { name: 'Critical', value: queues.filter((queue) => queue.tone === 'danger' && queue.value > 0).length, fill: TONE_COLORS.danger },
    { name: 'Warning', value: queues.filter((queue) => queue.tone === 'warning' && queue.value > 0).length, fill: TONE_COLORS.warning },
    { name: 'Clear Queues', value: queues.length - activeQueues.length, fill: TONE_COLORS.success },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary-700">Operations cockpit</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Exceptions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Work the queues that need attention across sales, fulfilment, warehouse, finance, and returns.
          </p>
        </div>
        <Link
          href="/notifications"
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          View notifications
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total exceptions" value={totalExceptions} tone={totalExceptions > 0 ? 'danger' : 'success'} />
        <SummaryCard label="Critical count" value={criticalExceptions} tone={criticalExceptions > 0 ? 'danger' : 'success'} />
        <SummaryCard label="Warning count" value={warningExceptions} tone={warningExceptions > 0 ? 'warning' : 'success'} />
        <SummaryCard label="Active queues" value={activeQueues.length} tone={activeQueues.length > 0 ? 'warning' : 'success'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Exceptions by Area" subtitle="Current open operational load" className="xl:col-span-2">
          {areaData.some((area) => area.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={areaData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: ct.tick }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: ct.tick }} />
                <Tooltip contentStyle={tooltipStyle(ct)} />
                <Bar dataKey="value" name="Exceptions" radius={[6, 6, 0, 0]}>
                  {areaData.map((area) => (
                    <Cell key={area.name} fill={area.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No area exceptions right now" />
          )}
        </ChartCard>

        <ChartCard title="Severity Mix" subtitle="Critical, warning, clear queue count">
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={4}
                >
                  {severityData.map((slice) => (
                    <Cell key={slice.name} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle(ct)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No severity data yet" />
          )}
        </ChartCard>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Queue Detail</h2>
            <p className="text-xs text-slate-500">
              {activeQueues.length > 0
                ? `${formatNumber(activeQueues.length)} queue${activeQueues.length === 1 ? '' : 's'} need action`
                : 'Every queue is clear'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          {queues.map((queue) => (
            <Link
              key={queue.title}
              href={queue.href}
              className="group flex min-h-[108px] items-center justify-between gap-3 border-b border-r border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${getQueueDotClass(queue.tone)}`} />
                  <span className="text-sm font-medium text-slate-800 group-hover:text-primary-700">
                    {queue.title}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{queue.description}</p>
                <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">{queue.group}</p>
              </div>
              <span className={`shrink-0 text-lg font-bold ${getQueueTextClass(queue.tone)}`}>
                {formatNumber(queue.value)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function getExceptionQueues(stats: DashboardStats): ExceptionQueue[] {
  return [
    {
      title: 'Late Orders',
      description: 'Past requested ship date',
      value: stats.lateOrders,
      href: '/sales?late=true',
      tone: stats.lateOrders > 0 ? 'danger' : 'success',
      group: 'Sales',
    },
    {
      title: 'Stuck Pick Waves',
      description: 'Open more than 24 hours',
      value: stats.stuckPickWaves ?? 0,
      href: '/fulfilment?tab=pick-waves&status=IN_PROGRESS',
      tone: (stats.stuckPickWaves ?? 0) > 0 ? 'danger' : 'success',
      group: 'Fulfilment',
    },
    {
      title: 'Ready to Dispatch',
      description: 'Shipments waiting for trips',
      value: stats.readyDispatchShipments ?? 0,
      href: '/dispatch?tab=ready-shipments',
      tone: (stats.readyDispatchShipments ?? 0) > 0 ? 'warning' : 'success',
      group: 'Dispatch',
    },
    {
      title: 'Overdue GRNs',
      description: 'Receipts open more than 2 days',
      value: stats.overdueGrns ?? 0,
      href: '/inventory/grn?overdue=true',
      tone: (stats.overdueGrns ?? 0) > 0 ? 'danger' : 'success',
      group: 'Inventory',
    },
    {
      title: 'Pending Putaway',
      description: 'Tasks waiting in receiving',
      value: stats.pendingPutawayTasks ?? 0,
      href: '/inventory/putaway?status=PENDING',
      tone: (stats.pendingPutawayTasks ?? 0) > 0 ? 'warning' : 'success',
      group: 'Inventory',
    },
    {
      title: 'Stock Alerts',
      description: `${formatNumber(stats.lowStockItems)} low, ${formatNumber(stats.expiringItems)} expiring`,
      value: stats.lowStockItems + stats.expiringItems,
      href: '/inventory/expiry-alerts?status=CRITICAL',
      tone: stats.lowStockItems + stats.expiringItems > 0 ? 'warning' : 'success',
      group: 'Inventory',
    },
    {
      title: 'Open NCRs',
      description: 'Quality issues awaiting disposition',
      value: stats.openNCRs ?? 0,
      href: '/manufacturing/quality?status=OPEN',
      tone: (stats.openNCRs ?? 0) > 0 ? 'warning' : 'success',
      group: 'Manufacturing',
    },
    {
      title: 'Pending Approvals',
      description: 'Adjustments, transfers, counts, BOMs',
      value: stats.pendingApprovals ?? 0,
      href: '/inventory/adjustments?status=SUBMITTED',
      tone: (stats.pendingApprovals ?? 0) > 0 ? 'warning' : 'success',
      group: 'Approvals',
    },
    {
      title: 'Overdue Invoices',
      description: 'Past due and unpaid',
      value: stats.overdueInvoices ?? 0,
      href: '/finance/invoices?status=OVERDUE',
      tone: (stats.overdueInvoices ?? 0) > 0 ? 'danger' : 'success',
      group: 'Finance',
    },
    {
      title: 'Open Returns',
      description: 'Awaiting processing',
      value: stats.openReturns,
      href: '/returns?status=OPEN',
      tone: stats.openReturns > 0 ? 'warning' : 'success',
      group: 'Returns',
    },
    {
      title: 'Open Cycle Counts',
      description: 'Counting in progress',
      value: stats.openCycleCounts,
      href: '/inventory/cycle-counts?status=OPEN',
      tone: stats.openCycleCounts > 0 ? 'warning' : 'success',
      group: 'Inventory',
    },
  ];
}

function getAreaData(queues: ExceptionQueue[]) {
  const areaMap = queues.reduce<Record<string, { name: string; value: number; critical: boolean }>>((acc, queue) => {
    if (!acc[queue.group]) {
      acc[queue.group] = { name: queue.group, value: 0, critical: false };
    }

    acc[queue.group].value += queue.value;
    acc[queue.group].critical = acc[queue.group].critical || (queue.tone === 'danger' && queue.value > 0);
    return acc;
  }, {});

  return Object.values(areaMap)
    .map((area) => ({
      ...area,
      fill: area.value === 0 ? '#10b981' : area.critical ? '#ef4444' : '#f59e0b',
    }))
    .sort((a, b) => b.value - a.value);
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: ExceptionTone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${getQueueDotClass(tone)}`} />
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className={`mt-3 text-3xl font-bold ${getQueueTextClass(tone)}`}>{formatNumber(value)}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-400">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
      {label}
    </div>
  );
}

function getQueueDotClass(tone: ExceptionTone) {
  if (tone === 'danger') return 'bg-red-500';
  if (tone === 'warning') return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getQueueTextClass(tone: ExceptionTone) {
  if (tone === 'danger') return 'text-red-600';
  if (tone === 'warning') return 'text-amber-600';
  return 'text-emerald-600';
}
