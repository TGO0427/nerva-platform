'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import {
  useExpiryAlertsSummary,
  useExpiringStock,
  useExpiredStock,
  ExpiringStock,
} from '@/lib/queries/inventory';
import { useWarehouses } from '@/lib/queries';

type FilterStatus = 'all' | 'EXPIRED' | 'CRITICAL' | 'WARNING';

export default function ExpiryAlertsPage() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [daysAhead, setDaysAhead] = useState<number>(30);
  const [warehouseId, setWarehouseId] = useState<string>('');

  const { data: summary, isLoading: summaryLoading } = useExpiryAlertsSummary();
  const { data: expiringStock, isLoading: expiringLoading } = useExpiringStock(
    daysAhead,
    warehouseId || undefined
  );
  const { data: expiredStock, isLoading: expiredLoading } = useExpiredStock(
    warehouseId || undefined
  );
  const { data: warehouses } = useWarehouses();

  // Combine and filter data based on status
  const allStock = [
    ...(expiredStock || []),
    ...(expiringStock?.filter((s) => s.expiryStatus !== 'EXPIRED') || []),
  ];

  const filteredStock =
    filterStatus === 'all'
      ? allStock
      : allStock.filter((s) => s.expiryStatus === filterStatus);

  const columns: Column<ExpiringStock>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      sortable: true,
      render: (row) => (
        <Link
          href={`/inventory/stock/${row.itemId}`}
          className="font-medium text-primary-600 hover:underline"
        >
          {row.itemSku}
        </Link>
      ),
    },
    {
      key: 'itemDescription',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'batchNo',
      header: 'Batch No',
      sortable: true,
    },
    {
      key: 'binCode',
      header: 'Bin',
      sortable: true,
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      sortable: true,
      render: (row) => new Date(row.expiryDate).toLocaleDateString(),
    },
    {
      key: 'daysUntilExpiry',
      header: 'Days Until Expiry',
      sortable: true,
      render: (row) => (
        <span
          className={
            row.daysUntilExpiry <= 0
              ? 'text-red-600 font-semibold'
              : row.daysUntilExpiry <= 7
                ? 'text-orange-600 font-semibold'
                : row.daysUntilExpiry <= 30
                  ? 'text-yellow-600'
                  : 'text-gray-600'
          }
        >
          {row.daysUntilExpiry <= 0
            ? `${Math.abs(row.daysUntilExpiry)} days ago`
            : `${row.daysUntilExpiry} days`}
        </span>
      ),
    },
    {
      key: 'qtyOnHand',
      header: 'Qty On Hand',
      sortable: true,
      render: (row) => row.qtyOnHand.toLocaleString(),
    },
    {
      key: 'expiryStatus',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const variants: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
          EXPIRED: 'danger',
          CRITICAL: 'warning',
          WARNING: 'info',
          OK: 'success',
        };
        return (
          <Badge variant={variants[row.expiryStatus] || 'info'}>
            {row.expiryStatus}
          </Badge>
        );
      },
    },
  ];

  const isLoading = summaryLoading || expiringLoading || expiredLoading;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expiry Alerts</h1>
          <p className="text-gray-500 mt-1">
            Monitor batch expiry dates and take action on expiring stock
          </p>
        </div>
        <Link href="/inventory">
          <Button variant="secondary">
            <BackIcon />
            Back to Inventory
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card
          className={`cursor-pointer border-2 transition-colors ${
            filterStatus === 'EXPIRED' ? 'border-red-500' : 'border-transparent hover:border-red-200'
          }`}
          onClick={() => setFilterStatus(filterStatus === 'EXPIRED' ? 'all' : 'EXPIRED')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-600">
                  {summary?.expired || 0}
                </div>
                <p className="text-sm text-gray-500">Expired</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <ExpiredIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border-2 transition-colors ${
            filterStatus === 'CRITICAL' ? 'border-orange-500' : 'border-transparent hover:border-orange-200'
          }`}
          onClick={() => setFilterStatus(filterStatus === 'CRITICAL' ? 'all' : 'CRITICAL')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-orange-600">
                  {summary?.critical || 0}
                </div>
                <p className="text-sm text-gray-500">Critical (7 days)</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <CriticalIcon />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border-2 transition-colors ${
            filterStatus === 'WARNING' ? 'border-yellow-500' : 'border-transparent hover:border-yellow-200'
          }`}
          onClick={() => setFilterStatus(filterStatus === 'WARNING' ? 'all' : 'WARNING')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-600">
                  {summary?.warning || 0}
                </div>
                <p className="text-sm text-gray-500">Warning (30 days)</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <WarningIcon />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>
              {filterStatus === 'all' ? 'All Expiring Stock' : `${filterStatus} Stock`}
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={daysAhead.toString()}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                options={[
                  { label: 'Next 7 days', value: '7' },
                  { label: 'Next 14 days', value: '14' },
                  { label: 'Next 30 days', value: '30' },
                  { label: 'Next 60 days', value: '60' },
                  { label: 'Next 90 days', value: '90' },
                ]}
                className="w-40"
              />
              <Select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                options={[
                  { label: 'All Warehouses', value: '' },
                  ...(warehouses?.map((w) => ({ label: w.name, value: w.id })) || []),
                ]}
                className="w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredStock}
            keyField="binId"
            isLoading={isLoading}
            emptyState={{
              icon: <CheckIcon />,
              title: 'No expiring stock',
              description:
                filterStatus === 'all'
                  ? 'No stock is expiring within the selected timeframe'
                  : `No stock with ${filterStatus} status`,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function BackIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function ExpiredIcon() {
  return (
    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CriticalIcon() {
  return (
    <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
