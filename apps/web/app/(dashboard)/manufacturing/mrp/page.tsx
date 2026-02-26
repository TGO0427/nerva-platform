'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMrpRequirements } from '@/lib/queries';

type TabView = 'by-item' | 'by-work-order';

export default function MrpPage() {
  const [activeTab, setActiveTab] = useState<TabView>('by-item');
  const { data, isLoading, error } = useMrpRequirements();

  const itemSummary = data?.itemSummary ?? [];
  const workOrderDemand = data?.workOrderDemand ?? [];

  const shortageItems = useMemo(
    () => itemSummary.filter((item) => item.netShortage > 0),
    [itemSummary]
  );

  const totalShortageQty = useMemo(
    () => itemSummary.reduce((sum, item) => sum + Math.max(0, item.netShortage), 0),
    [itemSummary]
  );

  const handleExportCsv = () => {
    let csvContent = '';

    if (activeTab === 'by-item') {
      csvContent = 'Item SKU,Description,Total Demand,Outstanding,Available Stock,Net Shortage\n';
      itemSummary.forEach((item) => {
        csvContent += `"${item.itemSku}","${item.itemDescription}",${item.totalDemand},${item.totalOutstanding},${item.availableStock},${item.netShortage}\n`;
      });
    } else {
      csvContent = 'WO#,Status,Item SKU,Required,Issued,Outstanding,Available,Shortage\n';
      workOrderDemand.forEach((wo) => {
        csvContent += `"${wo.workOrderNo}","${wo.workOrderStatus}","${wo.itemSku}",${wo.qtyRequired},${wo.qtyIssued},${wo.qtyOutstanding},${wo.availableStock},${wo.shortage}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mrp-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Breadcrumbs />
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Breadcrumbs />
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-slate-900">Failed to load MRP data</h2>
          <p className="mt-2 text-slate-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Material Requirements Planning</h1>
          <p className="text-sm text-slate-500 mt-1">
            View material demand and shortages across work orders
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportCsv}>
          <DownloadIcon />
          Export CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Items with Demand"
          value={itemSummary.length}
          icon={<PackageIcon />}
          iconColor="blue"
        />
        <StatCard
          title="Items with Shortages"
          value={shortageItems.length}
          icon={<AlertIcon />}
          iconColor="red"
          alert={shortageItems.length > 0}
        />
        <StatCard
          title="Total Shortage Qty"
          value={totalShortageQty}
          icon={<TrendDownIcon />}
          iconColor="yellow"
          alert={totalShortageQty > 0}
        />
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Requirements</CardTitle>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'by-item'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setActiveTab('by-item')}
              >
                By Item
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'by-work-order'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                onClick={() => setActiveTab('by-work-order')}
              >
                By Work Order
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'by-item' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Item SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Description</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Total Demand</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Outstanding</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Available Stock</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Net Shortage</th>
                  </tr>
                </thead>
                <tbody>
                  {itemSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No material requirements found
                      </td>
                    </tr>
                  ) : (
                    itemSummary.map((item) => (
                      <tr
                        key={item.itemId}
                        className={`border-b border-slate-100 ${
                          item.netShortage > 0 ? 'bg-red-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-slate-900">{item.itemSku}</td>
                        <td className="py-3 px-4 text-slate-600">{item.itemDescription}</td>
                        <td className="py-3 px-4 text-right">{item.totalDemand.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{item.totalOutstanding.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{item.availableStock.toLocaleString()}</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          item.netShortage > 0 ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          {item.netShortage > 0 ? `-${item.netShortage.toLocaleString()}` : item.netShortage.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">WO#</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Item SKU</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Required</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Issued</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Outstanding</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Available</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Shortage</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrderDemand.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500">
                        No work order demand found
                      </td>
                    </tr>
                  ) : (
                    workOrderDemand.map((wo, idx) => (
                      <tr
                        key={`${wo.workOrderId}-${wo.itemId}-${idx}`}
                        className={`border-b border-slate-100 ${
                          wo.shortage > 0 ? 'bg-red-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/manufacturing/work-orders/${wo.workOrderId}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {wo.workOrderNo}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusVariant(wo.workOrderStatus)}>
                            {wo.workOrderStatus.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-900">{wo.itemSku}</td>
                        <td className="py-3 px-4 text-right">{wo.qtyRequired.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{wo.qtyIssued.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{wo.qtyOutstanding.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{wo.availableStock.toLocaleString()}</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          wo.shortage > 0 ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          {wo.shortage > 0 ? `-${wo.shortage.toLocaleString()}` : wo.shortage.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'RELEASED':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898M18.75 19.5l3-3m0 0l-3-3m3 3H15" />
    </svg>
  );
}
