'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import {
  usePickWaves,
  useShipments,
  useQueryParams,
  PickWave,
  Shipment,
} from '@/lib/queries';

const WAVE_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SHIPMENT_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'READY_FOR_DISPATCH', label: 'Ready' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
];

type Tab = 'pick-waves' | 'shipments';

export default function FulfilmentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('pick-waves');
  const [waveStatus, setWaveStatus] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState('');
  const { params, setPage } = useQueryParams();

  const { data: wavesData, isLoading: wavesLoading } = usePickWaves({
    ...params,
    status: waveStatus || undefined,
  });

  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipments({
    ...params,
    status: shipmentStatus || undefined,
  });

  const waveColumns: Column<PickWave>[] = [
    {
      key: 'waveNo',
      header: 'Wave No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.waveNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant={getWaveStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'warehouseId',
      header: 'Warehouse',
      render: () => 'Main Warehouse',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'shipmentNo',
      header: 'Shipment No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.shipmentNo}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (row) => (
        <Badge variant={getShipmentStatusVariant(row.status)}>
          {row.status?.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'orderNo',
      header: 'Order',
      render: (row) => row.orderNo || row.salesOrderId.slice(0, 8),
    },
    {
      key: 'carrier',
      header: 'Carrier',
      render: (row) => row.carrier || '-',
    },
    {
      key: 'trackingNo',
      header: 'Tracking',
      render: (row) => row.trackingNo || '-',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleWaveClick = (row: PickWave) => {
    router.push(`/fulfilment/pick-waves/${row.id}`);
  };

  const handleShipmentClick = (row: Shipment) => {
    router.push(`/fulfilment/shipments/${row.id}`);
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fulfilment</h1>
          <p className="text-gray-500 mt-1">Manage picking, packing, and shipping</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {wavesData?.data?.filter(w => w.status === 'IN_PROGRESS').length || 0}
            </div>
            <p className="text-sm text-gray-500">Active Waves</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {wavesData?.data?.filter(w => w.status === 'PENDING').length || 0}
            </div>
            <p className="text-sm text-gray-500">Pending Waves</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {shipmentsData?.data?.filter(s => s.status === 'READY_FOR_DISPATCH').length || 0}
            </div>
            <p className="text-sm text-gray-500">Ready to Ship</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {shipmentsData?.data?.filter(s => s.status === 'SHIPPED').length || 0}
            </div>
            <p className="text-sm text-gray-500">Shipped Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pick-waves')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pick-waves'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pick Waves
          </button>
          <button
            onClick={() => setActiveTab('shipments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shipments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Shipments
          </button>
        </nav>
      </div>

      {activeTab === 'pick-waves' && (
        <>
          <div className="mb-4">
            <Select
              value={waveStatus}
              onChange={(e) => setWaveStatus(e.target.value)}
              options={WAVE_STATUS_OPTIONS}
              className="max-w-xs"
            />
          </div>

          <DataTable
            columns={waveColumns}
            data={wavesData?.data || []}
            keyField="id"
            isLoading={wavesLoading}
            pagination={wavesData?.meta ? {
              page: wavesData.meta.page,
              limit: wavesData.meta.limit,
              total: wavesData.meta.total || 0,
              totalPages: wavesData.meta.totalPages || 1,
            } : undefined}
            onPageChange={setPage}
            onRowClick={handleWaveClick}
            emptyState={{
              icon: <WaveIcon />,
              title: 'No pick waves found',
              description: waveStatus
                ? 'No waves match the selected filter'
                : 'Create a pick wave from allocated orders',
            }}
          />
        </>
      )}

      {activeTab === 'shipments' && (
        <>
          <div className="mb-4">
            <Select
              value={shipmentStatus}
              onChange={(e) => setShipmentStatus(e.target.value)}
              options={SHIPMENT_STATUS_OPTIONS}
              className="max-w-xs"
            />
          </div>

          <DataTable
            columns={shipmentColumns}
            data={shipmentsData?.data || []}
            keyField="id"
            isLoading={shipmentsLoading}
            pagination={shipmentsData?.meta ? {
              page: shipmentsData.meta.page,
              limit: shipmentsData.meta.limit,
              total: shipmentsData.meta.total || 0,
              totalPages: shipmentsData.meta.totalPages || 1,
            } : undefined}
            onPageChange={setPage}
            onRowClick={handleShipmentClick}
            emptyState={{
              icon: <ShipIcon />,
              title: 'No shipments found',
              description: shipmentStatus
                ? 'No shipments match the selected filter'
                : 'Shipments will appear here after packing',
            }}
          />
        </>
      )}
    </div>
  );
}

function getWaveStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'PENDING':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function getShipmentStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'SHIPPED':
      return 'info';
    case 'READY_FOR_DISPATCH':
      return 'warning';
    case 'PACKED':
    case 'PENDING':
    default:
      return 'default';
  }
}

function WaveIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
