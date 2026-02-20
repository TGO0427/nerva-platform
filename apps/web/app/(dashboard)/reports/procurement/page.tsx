'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useProcurementReport } from '@/lib/queries';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

export default function ProcurementReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: report, isLoading } = useProcurementReport(startDate, endDate);

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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Procurement Report</h1>
          <p className="text-slate-500 mt-1">Analyze purchase orders and supplier activity.</p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="startDate" className="text-xs">From</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="endDate" className="text-xs">To</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Total POs"
          value={report?.summary.totalPOs ?? 0}
          icon={<OrderIcon />}
        />
        <SummaryCard
          title="Total Value"
          value={`R ${(report?.summary.totalValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
          icon={<CurrencyIcon />}
        />
        <SummaryCard
          title="Avg PO Value"
          value={`R ${(report?.summary.avgPOValue ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
          icon={<TrendIcon />}
        />
        <SummaryCard
          title="Suppliers Used"
          value={report?.summary.uniqueSuppliers ?? 0}
          icon={<BuildingIcon />}
        />
      </div>

      {/* Monthly Trend Chart + Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Monthly Purchase Order Value" subtitle="Selected period">
          {report?.byMonth && report.byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={report.byMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(v: number) => `R ${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: unknown) => [`R ${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, 'PO Value']}
                />
                <Line type="monotone" dataKey="monthlyValue" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="PO Value" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No purchase order data for this period" />
          )}
        </ChartCard>

        <ChartCard title="PO Status Distribution" subtitle="By count">
          {report?.byStatus && report.byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={report.byStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                  label={(props: PieLabelRenderProps) => `${props.name ?? ''} (${props.value ?? 0})`}
                >
                  {report.byStatus.map((entry, index) => (
                    <Cell key={entry.status} fill={PO_STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No status data available" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.topSuppliers && report.topSuppliers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Supplier</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">POs</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.topSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm">
                          <Link href={`/master-data/suppliers/${supplier.id}`} className="text-primary-600 hover:underline">
                            {supplier.code ? `${supplier.code} - ` : ''}{supplier.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm text-right">{supplier.poCount}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          R {supplier.totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No supplier data available.</p>
            )}
          </CardContent>
        </Card>

        {/* POs by Status table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.byStatus && report.byStatus.length > 0 ? (
              <div className="space-y-4">
                {report.byStatus.map((status) => {
                  const percentOfTotal = report.summary.totalPOs > 0
                    ? (status.count / report.summary.totalPOs) * 100
                    : 0;
                  return (
                    <div key={status.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={status.status} />
                        <span className="text-sm text-slate-600">{status.count} orders</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${percentOfTotal}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-24 text-right">
                          R {status.value.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No status data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-xl font-bold text-slate-900">{report?.summary.pendingPOs ?? 0}</p>
              </div>
              <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600">
                <ClockIcon />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Received</p>
                <p className="text-xl font-bold text-slate-900">{report?.summary.receivedPOs ?? 0}</p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                <CheckIcon />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Receive Rate</p>
                <p className="text-xl font-bold text-slate-900">
                  {report?.summary.totalPOs
                    ? ((report.summary.receivedPOs / report.summary.totalPOs) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <TrendIcon />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    DRAFT: 'default',
    SENT: 'warning',
    CONFIRMED: 'success',
    PARTIAL: 'warning',
    RECEIVED: 'success',
    CANCELLED: 'danger',
  };
  return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#f97316'];
const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  SENT: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PARTIAL: '#8b5cf6',
  RECEIVED: '#10b981',
  CANCELLED: '#ef4444',
};

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

function OrderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
