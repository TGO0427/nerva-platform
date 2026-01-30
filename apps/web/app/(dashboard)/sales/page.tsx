'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { useOrders, useQueryParams, SalesOrderWithCustomer } from '@/lib/queries';
import type { SalesOrderStatus } from '@nerva/shared';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'PICKING', label: 'Picking' },
  { value: 'PACKING', label: 'Packing' },
  { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function SalesOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SalesOrderStatus | ''>('');
  const { params, setPage } = useQueryParams();
  const { data, isLoading } = useOrders({ ...params, status: status || undefined });

  const columns: Column<SalesOrderWithCustomer>[] = [
    {
      key: 'orderNo',
      header: 'Order No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.orderNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => row.customerName || row.customerId.slice(0, 8),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '90px',
      render: (row) => (
        <Badge variant={getPriorityVariant(row.priority)}>
          {getPriorityLabel(row.priority)}
        </Badge>
      ),
    },
    {
      key: 'requestedShipDate',
      header: 'Ship Date',
      render: (row) => row.requestedShipDate
        ? new Date(row.requestedShipDate).toLocaleDateString()
        : '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleRowClick = (row: SalesOrderWithCustomer) => {
    router.push(`/sales/${row.id}`);
  };

  // Calculate stats from visible data
  const totalOrders = data?.meta?.total || 0;
  const openOrders = data?.data?.filter(o =>
    ['DRAFT', 'CONFIRMED', 'ALLOCATED'].includes(o.status)
  ).length || 0;
  const inFulfilment = data?.data?.filter(o =>
    ['PICKING', 'PACKING', 'READY_TO_SHIP'].includes(o.status)
  ).length || 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-gray-500 mt-1">Manage customer orders and fulfilment</p>
        </div>
        <Link href="/sales/new">
          <Button>
            <PlusIcon />
            New Order
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            <p className="text-sm text-gray-500">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{openOrders}</div>
            <p className="text-sm text-gray-500">Open Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{inFulfilment}</div>
            <p className="text-sm text-gray-500">In Fulfilment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {data?.data?.filter(o => o.status === 'SHIPPED').length || 0}
            </div>
            <p className="text-sm text-gray-500">Shipped Today</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SalesOrderStatus | '')}
          options={STATUS_OPTIONS}
          className="max-w-xs"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        keyField="id"
        isLoading={isLoading}
        pagination={data?.meta ? {
          page: data.meta.page,
          limit: data.meta.limit,
          total: data.meta.total || 0,
          totalPages: data.meta.totalPages || 1,
        } : undefined}
        onPageChange={setPage}
        onRowClick={handleRowClick}
        emptyState={{
          icon: <OrderIcon />,
          title: 'No orders found',
          description: status ? 'No orders match the selected filter' : 'Create your first sales order to get started',
          action: !status && (
            <Link href="/sales/new">
              <Button>Create Order</Button>
            </Link>
          ),
        }}
      />
    </div>
  );
}

function getStatusVariant(status: SalesOrderStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'SHIPPED':
    case 'READY_TO_SHIP':
      return 'info';
    case 'PICKING':
    case 'PACKING':
    case 'ALLOCATED':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    case 'DRAFT':
    case 'CONFIRMED':
    default:
      return 'default';
  }
}

function formatStatus(status: SalesOrderStatus): string {
  return status?.replace(/_/g, ' ') || status || '';
}

function getPriorityVariant(priority: number): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (priority >= 8) return 'danger';
  if (priority >= 5) return 'warning';
  return 'default';
}

function getPriorityLabel(priority: number): string {
  if (priority >= 8) return 'Urgent';
  if (priority >= 5) return 'High';
  if (priority >= 3) return 'Normal';
  return 'Low';
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}
