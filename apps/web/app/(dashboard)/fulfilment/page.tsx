'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { PageShell, MetricGrid } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import {
  usePickWaves,
  useShipments,
  useQueryParams,
  useWarehouses,
  PickWave,
  Shipment,
} from '@/lib/queries';
import {
  useAllocatedOrders,
  useCreatePickWave,
  useShippableOrders,
  useCreateShipment,
  AllocatedOrder,
  ShippableOrder,
} from '@/lib/queries/fulfilment';

const WAVE_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
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

type Tab = 'allocated-orders' | 'pick-waves' | 'shipments';

export default function FulfilmentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('allocated-orders');
  const [waveStatus, setWaveStatus] = useState('');
  const [shipmentStatus, setShipmentStatus] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [showNewShipmentForm, setShowNewShipmentForm] = useState(false);
  const [selectedOrderForShipment, setSelectedOrderForShipment] = useState('');
  const { params, setPage } = useQueryParams();

  const { data: wavesData, isLoading: wavesLoading } = usePickWaves({
    ...params,
    status: waveStatus || undefined,
  });

  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipments({
    ...params,
    status: shipmentStatus || undefined,
  });

  const { data: allocatedOrders, isLoading: allocatedLoading } = useAllocatedOrders();
  const { data: shippableOrders } = useShippableOrders();
  const { data: warehouses } = useWarehouses();
  const createPickWave = useCreatePickWave();
  const createShipment = useCreateShipment();

  // Get the default warehouse for creating pick waves
  const defaultWarehouse = warehouses?.[0];

  const handleCreatePickWave = async () => {
    if (selectedOrders.size === 0) {
      setError('Please select at least one order');
      return;
    }
    if (!defaultWarehouse) {
      setError('No warehouse available');
      return;
    }

    setError('');
    try {
      const wave = await createPickWave.mutateAsync({
        warehouseId: defaultWarehouse.id,
        orderIds: Array.from(selectedOrders),
      });
      setSelectedOrders(new Set());
      router.push(`/fulfilment/pick-waves/${wave.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pick wave');
    }
  };

  const allocatedOrderColumns: Column<AllocatedOrder>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={allocatedOrders && allocatedOrders.length > 0 && selectedOrders.size === allocatedOrders.length}
          onChange={(e) => {
            if (e.target.checked && allocatedOrders) {
              setSelectedOrders(new Set(allocatedOrders.map(o => o.id)));
            } else {
              setSelectedOrders(new Set());
            }
          }}
          className="h-4 w-4 rounded border-slate-300"
        />
      ),
      width: '50px',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedOrders.has(row.id)}
          onChange={(e) => {
            const newSelected = new Set(selectedOrders);
            if (e.target.checked) {
              newSelected.add(row.id);
            } else {
              newSelected.delete(row.id);
            }
            setSelectedOrders(newSelected);
          }}
          className="h-4 w-4 rounded border-slate-300"
        />
      ),
    },
    {
      key: 'orderNo',
      header: 'Order No.',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-primary-600">{row.orderNo}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (row) => row.customerName || row.customerId?.slice(0, 8) || '-',
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '100px',
      render: (row) => (
        <Badge variant={row.priority <= 3 ? 'danger' : row.priority <= 5 ? 'warning' : 'default'}>
          {row.priority <= 3 ? 'High' : row.priority <= 5 ? 'Medium' : 'Low'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (row) => (
        <Badge variant="info">{row.status}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Order Date',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

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

  const handleCreateShipment = async () => {
    if (!selectedOrderForShipment) {
      setError('Please select an order');
      return;
    }

    setError('');
    try {
      const shipment = await createShipment.mutateAsync({
        salesOrderId: selectedOrderForShipment,
      });
      setShowNewShipmentForm(false);
      setSelectedOrderForShipment('');
      router.push(`/fulfilment/shipments/${shipment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
    }
  };

  // Calculate stats
  const readyToPick = allocatedOrders?.length || 0;
  const activeWaves = wavesData?.data?.filter(w => w.status === 'IN_PROGRESS').length || 0;
  const openWaves = wavesData?.data?.filter(w => w.status === 'OPEN').length || 0;
  const readyToShip = shipmentsData?.data?.filter(s => s.status === 'READY_FOR_DISPATCH').length || 0;
  const shippedToday = shipmentsData?.data?.filter(s => s.status === 'SHIPPED').length || 0;

  return (
    <PageShell>
      <PageHeader
        title="Fulfilment"
        subtitle="Manage picking, packing, and shipping"
      />

      {/* Quick stats */}
      <MetricGrid className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Ready to Pick"
          value={readyToPick}
          icon={<ClipboardListIcon />}
          iconColor="orange"
          alert={readyToPick > 0}
        />
        <StatCard
          title="Active Waves"
          value={activeWaves}
          icon={<PlayIcon />}
          iconColor="blue"
        />
        <StatCard
          title="Open Waves"
          value={openWaves}
          icon={<WaveIcon />}
          iconColor="yellow"
        />
        <StatCard
          title="Ready to Ship"
          value={readyToShip}
          icon={<BoxIcon />}
          iconColor="purple"
        />
        <StatCard
          title="Shipped Today"
          value={shippedToday}
          icon={<ShipIcon />}
          iconColor="green"
        />
      </MetricGrid>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('allocated-orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'allocated-orders'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Allocated Orders
            {allocatedOrders && allocatedOrders.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {allocatedOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pick-waves')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pick-waves'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Pick Waves
          </button>
          <button
            onClick={() => setActiveTab('shipments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'shipments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Shipments
          </button>
        </nav>
      </div>

      {activeTab === 'allocated-orders' && (
        <>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Create Pick Wave Panel */}
          {selectedOrders.size > 0 && (
            <Card className="mb-4 border-primary-200 bg-primary-50">
              <CardHeader>
                <CardTitle className="text-lg">Create Pick Wave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Selected Orders
                    </label>
                    <div className="text-2xl font-bold text-primary-600">
                      {selectedOrders.size}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Warehouse
                    </label>
                    <div className="text-lg font-medium">
                      {defaultWarehouse?.name || 'Default'}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <Button
                    onClick={handleCreatePickWave}
                    isLoading={createPickWave.isPending}
                  >
                    <PlusIcon />
                    Create Pick Wave
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedOrders(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {allocatedLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : allocatedOrders && allocatedOrders.length > 0 ? (
            <DataTable
              columns={allocatedOrderColumns}
              data={allocatedOrders}
              keyField="id"
              emptyState={{
                title: 'No allocated orders',
                description: 'Orders will appear here when stock is allocated',
              }}
            />
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400 mb-3" />
              <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
              <p className="text-slate-500 mt-1">
                No orders waiting for picking. Allocate stock to orders in the Sales module.
              </p>
            </div>
          )}
        </>
      )}

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
              icon: <WaveIconLg />,
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
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Select
              value={shipmentStatus}
              onChange={(e) => setShipmentStatus(e.target.value)}
              options={SHIPMENT_STATUS_OPTIONS}
              className="max-w-xs"
            />
            <div className="flex-1" />
            <Button onClick={() => setShowNewShipmentForm(!showNewShipmentForm)}>
              <PlusIcon />
              New Shipment
            </Button>
          </div>

          {showNewShipmentForm && (
            <Card className="mb-4 border-primary-200 bg-primary-50">
              <CardHeader>
                <CardTitle className="text-lg">Create Shipment</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="error" className="mb-4">
                    {error}
                  </Alert>
                )}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[250px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Select Order
                    </label>
                    <Select
                      value={selectedOrderForShipment}
                      onChange={(e) => setSelectedOrderForShipment(e.target.value)}
                      options={[
                        { value: '', label: 'Select an order...' },
                        ...(shippableOrders?.map(o => ({
                          value: o.id,
                          label: `${o.orderNo} - ${o.customerName}`,
                        })) || []),
                      ]}
                    />
                    {shippableOrders?.length === 0 && (
                      <p className="text-sm text-slate-500 mt-1">No orders ready for shipping</p>
                    )}
                  </div>
                  <Button
                    onClick={handleCreateShipment}
                    isLoading={createShipment.isPending}
                    disabled={!selectedOrderForShipment}
                  >
                    Create Shipment
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowNewShipmentForm(false);
                      setSelectedOrderForShipment('');
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
              icon: <ShipIconLg />,
              title: 'No shipments found',
              description: shipmentStatus
                ? 'No shipments match the selected filter'
                : 'Shipments will appear here after packing',
            }}
          />
        </>
      )}
    </PageShell>
  );
}

function getWaveStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETE':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'OPEN':
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

// Stat card icons (small)
function ClipboardListIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

// Empty state icons (large)
function WaveIconLg() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function ShipIconLg() {
  return (
    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
