'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInventoryReport } from '@/lib/queries';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

export default function InventoryReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: report, isLoading } = useInventoryReport();

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
          <h1 className="text-2xl font-bold text-slate-900">Inventory Report</h1>
          <p className="text-slate-500 mt-1">Monitor stock levels, valuations, and alerts.</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard
          title="Total Items"
          value={report?.summary.totalItems ?? 0}
          icon={<BoxIcon />}
          color="blue"
        />
        <SummaryCard
          title="Total Quantity"
          value={(report?.summary.totalQty ?? 0).toLocaleString()}
          icon={<StackIcon />}
          color="green"
        />
        <SummaryCard
          title="Warehouses"
          value={report?.byWarehouse?.length ?? 0}
          icon={<CurrencyIcon />}
          color="purple"
        />
        <SummaryCard
          title="Low Stock"
          value={report?.summary.lowStockCount ?? 0}
          icon={<AlertIcon />}
          color={report?.summary.lowStockCount ? 'red' : 'green'}
        />
        <SummaryCard
          title="Expiring Soon"
          value={report?.summary.expiringCount ?? 0}
          icon={<ClockIcon />}
          color={report?.summary.expiringCount ? 'orange' : 'green'}
        />
      </div>

      {/* Warehouse Charts */}
      {report?.byWarehouse && report.byWarehouse.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Inventory by Warehouse" subtitle="Stock quantity">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={report.byWarehouse} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <XAxis dataKey="name" axisLine={{ stroke: '#cbd5e1' }} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(v: number) => v.toLocaleString()}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: unknown) => [Number(value).toLocaleString(), 'Qty']}
                />
                <Line type="natural" dataKey="totalQty" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 5, fill: '#ffffff', stroke: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} name="Stock Qty" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Quantity Distribution" subtitle="By warehouse">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={report.byWarehouse}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="totalQty"
                  nameKey="name"
                  label={(props: PieLabelRenderProps) => `${props.name ?? ''} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {report.byWarehouse.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value: unknown) => [Number(value).toLocaleString(), 'Qty']}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Inventory by Warehouse Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Inventory by Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          {report?.byWarehouse && report.byWarehouse.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Warehouse</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.byWarehouse.map((wh) => {
                    const percentOfTotal = report.summary.totalQty > 0
                      ? (wh.totalQty / report.summary.totalQty) * 100
                      : 0;
                    return (
                      <tr key={wh.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium">
                          {wh.code ? `${wh.code} - ` : ''}{wh.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{wh.itemCount}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{wh.totalQty.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-primary-500 h-2 rounded-full"
                                style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                              />
                            </div>
                            <span className="w-12 text-right">{percentOfTotal.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">No warehouse data available.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low Stock Items</CardTitle>
            <Link href="/inventory?filter=lowStock" className="text-sm text-primary-600 hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {report?.lowStock && report.lowStock.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Warehouse</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">On Hand</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Reorder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.lowStock.map((item) => (
                      <tr key={item.inventoryId} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm">
                          <Link href={`/master-data/items/${item.itemId}`} className="text-primary-600 hover:underline">
                            {item.sku}
                          </Link>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.description}</p>
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600">{item.warehouseName}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          <Badge variant="danger">{item.qtyOnHand}</Badge>
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-500">{item.reorderPoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckIcon />
                <p className="mt-2">No low stock items</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expiring Soon</CardTitle>
            <Link href="/inventory/expiry-alerts" className="text-sm text-primary-600 hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {report?.expiringSoon && report.expiringSoon.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Batch</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.expiringSoon.map((item) => {
                      const daysUntil = item.expiryDate
                        ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      return (
                        <tr key={item.inventoryId} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm">
                            <Link href={`/master-data/items/${item.itemId}`} className="text-primary-600 hover:underline">
                              {item.sku}
                            </Link>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.description}</p>
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">{item.batchNumber || '-'}</td>
                          <td className="px-4 py-2 text-sm text-right">{item.qtyOnHand}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.expiryDate && (
                              <Badge variant={daysUntil && daysUntil < 7 ? 'danger' : 'warning'}>
                                {daysUntil && daysUntil <= 0 ? 'Expired' : `${daysUntil} days`}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckIcon />
                <p className="mt-2">No items expiring soon</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#ec4899', '#f97316'];

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

function BoxIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
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

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
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
    <svg className="w-12 h-12 mx-auto text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
