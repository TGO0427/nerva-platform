'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useManufacturingReport } from '@/lib/queries';
import { useChartTheme, tooltipStyle } from '@/lib/hooks/use-chart-theme';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function ManufacturingReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const ct = useChartTheme();
  const { data: report, isLoading } = useManufacturingReport(startDate, endDate);

  function handleExportCsv() {
    if (!report) return;

    const rows: string[] = [];

    // Summary section
    rows.push('MANUFACTURING REPORT');
    rows.push(`Period: ${startDate} to ${endDate}`);
    rows.push('');
    rows.push('SUMMARY');
    rows.push(`Total Output,${report.summary.totalOutput}`);
    rows.push(`Total Scrap,${report.summary.totalScrap}`);
    rows.push(`Yield Rate,${report.summary.yieldRate.toFixed(1)}%`);
    rows.push(`Unique Work Orders,${report.summary.uniqueWorkOrders}`);
    rows.push('');

    // Production by Day
    rows.push('DAILY PRODUCTION');
    rows.push('Date,Output,Scrap');
    report.productionByDay.forEach((d) => {
      rows.push(`${d.date},${d.output},${d.scrap}`);
    });
    rows.push('');

    // Yield by Item
    rows.push('YIELD BY ITEM');
    rows.push('Item SKU,Output,Scrap,Yield Rate');
    report.yieldByItem.forEach((item) => {
      rows.push(`${item.itemSku},${item.output},${item.scrap},${item.yieldRate.toFixed(1)}%`);
    });
    rows.push('');

    // Material Consumption
    rows.push('MATERIAL CONSUMPTION');
    rows.push('Item SKU,Consumed,Returned,Net Consumed');
    report.materialConsumption.forEach((m) => {
      rows.push(`${m.itemSku},${m.totalConsumed},${m.totalReturned},${m.netConsumed}`);
    });
    rows.push('');

    // Workstation Efficiency
    rows.push('WORKSTATION EFFICIENCY');
    rows.push('Workstation,Ops Completed,Avg Run Time (min),Total Run Time (min)');
    report.workstationEfficiency.forEach((ws) => {
      rows.push(`${ws.workstationName},${ws.operationsCompleted},${ws.avgRunTime.toFixed(1)},${ws.totalRunTime.toFixed(1)}`);
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manufacturing-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Manufacturing Report</h1>
          <p className="text-slate-500 mt-1">Analyze production output, scrap, and efficiency.</p>
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
          <div className="pt-4">
            <Button variant="secondary" size="sm" onClick={handleExportCsv} disabled={!report}>
              <DownloadIcon />
              <span className="ml-1.5">Export CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Output"
          value={report?.summary.totalOutput ?? 0}
          icon={<OutputIcon />}
          iconColor="green"
        />
        <StatCard
          title="Total Scrap"
          value={report?.summary.totalScrap ?? 0}
          icon={<ScrapIcon />}
          iconColor="red"
        />
        <StatCard
          title="Yield Rate"
          value={`${(report?.summary.yieldRate ?? 0).toFixed(1)}%`}
          icon={<YieldIcon />}
          iconColor="purple"
        />
        <StatCard
          title="Unique Work Orders"
          value={report?.summary.uniqueWorkOrders ?? 0}
          icon={<ClipboardIcon />}
          iconColor="blue"
        />
      </div>

      {/* Daily Output vs Scrap Chart */}
      <ChartCard title="Daily Production" subtitle="Output vs Scrap">
        {report?.productionByDay && report.productionByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.productionByDay} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis
                dataKey="date"
                axisLine={{ stroke: ct.axis }}
                tickLine={false}
                tick={{ fontSize: 11, fill: ct.tick }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: ct.tick }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle(ct)}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
              />
              <Line
                type="monotone"
                dataKey="output"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: ct.dotFill, stroke: '#10b981', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: ct.activeDotStroke, strokeWidth: 2 }}
                name="Output"
              />
              <Line
                type="monotone"
                dataKey="scrap"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 4, fill: ct.dotFill, stroke: '#ef4444', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#ef4444', stroke: ct.activeDotStroke, strokeWidth: 2 }}
                name="Scrap"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty label="No production data for this period" />
        )}
      </ChartCard>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield by Item */}
        <Card>
          <CardHeader>
            <CardTitle>Yield by Item</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.yieldByItem && report.yieldByItem.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Output</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Scrap</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Yield Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.yieldByItem.map((item) => (
                      <tr key={item.itemSku} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm font-medium text-slate-800">{item.itemSku}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.output.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right">{item.scrap.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          <span className={item.yieldRate >= 95 ? 'text-emerald-600' : item.yieldRate >= 85 ? 'text-amber-600' : 'text-red-600'}>
                            {item.yieldRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No yield data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Material Consumption */}
        <Card>
          <CardHeader>
            <CardTitle>Material Consumption</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.materialConsumption && report.materialConsumption.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Consumed</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Returned</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Net Consumed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.materialConsumption.map((m) => (
                      <tr key={m.itemSku} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm font-medium text-slate-800">{m.itemSku}</td>
                        <td className="px-4 py-2 text-sm text-right">{m.totalConsumed.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right">{m.totalReturned.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{m.netConsumed.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No material consumption data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Workstation Efficiency - full width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workstation Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.workstationEfficiency && report.workstationEfficiency.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Workstation</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Ops Completed</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Avg Run Time (min)</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total Run Time (min)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.workstationEfficiency.map((ws) => (
                      <tr key={ws.workstationName} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm font-medium text-slate-800">{ws.workstationName}</td>
                        <td className="px-4 py-2 text-sm text-right">{ws.operationsCompleted.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-right">{ws.avgRunTime.toFixed(1)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{ws.totalRunTime.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No workstation data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 mb-8">
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

// --- Inline SVG Icons ---
function OutputIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ScrapIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function YieldIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
