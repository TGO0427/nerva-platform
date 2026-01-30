'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { useItems, useQueryParams, useWarehouses, StockSnapshot } from '@/lib/queries';
import { useExpiryAlertsSummary } from '@/lib/queries/inventory';
import type { Item } from '@nerva/shared';

export default function InventoryPage() {
  const router = useRouter();
  const { params, setPage, setSearch } = useQueryParams();
  const { data: itemsData, isLoading } = useItems(params);
  const { data: warehouses } = useWarehouses();
  const { data: expiryAlerts } = useExpiryAlertsSummary();

  const columns: Column<Item>[] = [
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.sku}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'uom',
      header: 'UOM',
      width: '80px',
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '100px',
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const handleRowClick = (row: Item) => {
    router.push(`/inventory/stock/${row.id}`);
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">View and manage stock levels</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/expiry-alerts">
            <Button variant="secondary">
              <ExpiryIcon />
              Expiry Alerts
              {(expiryAlerts?.expired || 0) > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {expiryAlerts?.expired}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/inventory/grn">
            <Button variant="secondary">
              <ReceiveIcon />
              GRN Receiving
            </Button>
          </Link>
          <Link href="/inventory/transfers">
            <Button variant="secondary">
              <TransferIcon />
              Transfers
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {warehouses?.length || 0}
            </div>
            <p className="text-sm text-gray-500">Warehouses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {itemsData?.meta?.total || 0}
            </div>
            <p className="text-sm text-gray-500">Active Items</p>
          </CardContent>
        </Card>
        <Link href="/inventory/expiry-alerts">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {expiryAlerts?.expired || 0}
                </span>
                <span className="text-lg text-orange-600">
                  +{expiryAlerts?.critical || 0}
                </span>
              </div>
              <p className="text-sm text-gray-500">Expiry Alerts</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">-</div>
            <p className="text-sm text-gray-500">Pending GRNs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock by Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="search"
              placeholder="Search items by SKU or description..."
              className="max-w-md"
              value={params.search || ''}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DataTable
            columns={columns}
            data={itemsData?.data || []}
            keyField="id"
            isLoading={isLoading}
            pagination={itemsData?.meta ? {
              page: itemsData.meta.page,
              limit: itemsData.meta.limit,
              total: itemsData.meta.total || 0,
              totalPages: itemsData.meta.totalPages || 1,
            } : undefined}
            onPageChange={setPage}
            onRowClick={handleRowClick}
            emptyState={{
              icon: <BoxIcon />,
              title: 'No items found',
              description: 'Search for an item to view its stock levels',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ExpiryIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ReceiveIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
