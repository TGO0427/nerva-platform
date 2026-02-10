'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import {
  useOrder,
  useConfirmOrder,
  useAllocateOrder,
  useCancelOrder,
  useCreateShipment,
  useOrderShipments,
  SalesOrderLineWithItem,
  Shipment,
} from '@/lib/queries';
import type { SalesOrderStatus } from '@nerva/shared';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading } = useOrder(orderId);
  const { data: shipments, isLoading: shipmentsLoading } = useOrderShipments(orderId);
  const confirmOrder = useConfirmOrder();
  const allocateOrder = useAllocateOrder();
  const cancelOrder = useCancelOrder();
  const createShipment = useCreateShipment();

  const lineColumns: Column<SalesOrderLineWithItem>[] = [
    {
      key: 'lineNo',
      header: '#',
      width: '60px',
    },
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => (
        <span className="font-medium">{row.itemSku || row.itemId.slice(0, 8)}</span>
      ),
    },
    {
      key: 'itemDescription',
      header: 'Description',
      render: (row) => row.itemDescription || '-',
    },
    {
      key: 'qtyOrdered',
      header: 'Ordered',
      className: 'text-right',
    },
    {
      key: 'qtyAllocated',
      header: 'Allocated',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyAllocated >= row.qtyOrdered ? 'text-green-600' : 'text-orange-600'}>
          {row.qtyAllocated}
        </span>
      ),
    },
    {
      key: 'qtyPicked',
      header: 'Picked',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyPicked >= row.qtyOrdered ? 'text-green-600' : ''}>
          {row.qtyPicked}
        </span>
      ),
    },
    {
      key: 'qtyShipped',
      header: 'Shipped',
      className: 'text-right',
      render: (row) => (
        <span className={row.qtyShipped >= row.qtyOrdered ? 'text-green-600' : ''}>
          {row.qtyShipped}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      className: 'text-right',
      render: (row) => row.unitPrice ? `$${row.unitPrice.toFixed(2)}` : '-',
    },
  ];

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'shipmentNo',
      header: 'Shipment No.',
      render: (row) => (
        <Link href={`/fulfilment/shipments/${row.id}`} className="text-primary-600 hover:underline font-medium">
          {row.shipmentNo}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={getShipmentStatusVariant(row.status)}>
          {row.status?.replace(/_/g, ' ') || row.status}
        </Badge>
      ),
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
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  const handleConfirm = async () => {
    if (confirm('Are you sure you want to confirm this order?')) {
      try {
        await confirmOrder.mutateAsync(orderId);
      } catch (error) {
        console.error('Failed to confirm order:', error);
      }
    }
  };

  const handleAllocate = async () => {
    if (confirm('Are you sure you want to allocate stock for this order?')) {
      try {
        await allocateOrder.mutateAsync(orderId);
      } catch (error) {
        console.error('Failed to allocate order:', error);
      }
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      try {
        await cancelOrder.mutateAsync(orderId);
        router.push('/sales');
      } catch (error) {
        console.error('Failed to cancel order:', error);
      }
    }
  };

  const handleCreateShipment = async () => {
    if (!order) return;

    if (confirm('Create a shipment for this order?')) {
      try {
        const shipment = await createShipment.mutateAsync({
          siteId: order.siteId,
          warehouseId: order.warehouseId,
          salesOrderId: orderId,
        });
        router.push(`/fulfilment/shipments/${shipment.id}`);
      } catch (error) {
        console.error('Failed to create shipment:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Order not found</h2>
      </div>
    );
  }

  const totalOrdered = order.lines?.reduce((sum, l) => sum + l.qtyOrdered, 0) || 0;
  const totalAllocated = order.lines?.reduce((sum, l) => sum + l.qtyAllocated, 0) || 0;
  const totalPicked = order.lines?.reduce((sum, l) => sum + l.qtyPicked, 0) || 0;
  const totalShipped = order.lines?.reduce((sum, l) => sum + l.qtyShipped, 0) || 0;
  const totalValue = order.lines?.reduce((sum, l) => sum + ((l.unitPrice || 0) * l.qtyOrdered), 0) || 0;

  const canConfirm = order.status === 'DRAFT';
  const canAllocate = order.status === 'CONFIRMED';
  const canCancel = ['DRAFT', 'CONFIRMED'].includes(order.status);

  // Can create shipment when picking is complete (all items picked) or in packing status
  const allPicked = totalPicked >= totalOrdered && totalOrdered > 0;
  const canCreateShipment = ['PICKING', 'PACKING', 'ALLOCATED'].includes(order.status) &&
    (allPicked || order.status === 'PACKING') &&
    totalShipped < totalOrdered;

  const hasShipments = shipments && shipments.length > 0;

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{order.orderNo}</h1>
            <Badge variant={getStatusVariant(order.status)}>{formatStatus(order.status)}</Badge>
            <Badge variant={getPriorityVariant(order.priority)}>{getPriorityLabel(order.priority)}</Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Created {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button onClick={handleConfirm} isLoading={confirmOrder.isPending}>
              <CheckIcon />
              Confirm Order
            </Button>
          )}
          {canAllocate && (
            <Button onClick={handleAllocate} isLoading={allocateOrder.isPending}>
              <BoxIcon />
              Allocate Stock
            </Button>
          )}
          {canCreateShipment && (
            <Button onClick={handleCreateShipment} isLoading={createShipment.isPending}>
              <TruckIcon />
              Create Shipment
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} isLoading={cancelOrder.isPending}>
              <XIcon />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{totalOrdered}</div>
            <p className="text-sm text-slate-500">Qty Ordered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${totalAllocated >= totalOrdered ? 'text-green-600' : 'text-orange-600'}`}>
              {totalAllocated}
            </div>
            <p className="text-sm text-slate-500">Qty Allocated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${totalPicked >= totalOrdered ? 'text-green-600' : 'text-blue-600'}`}>
              {totalPicked}
            </div>
            <p className="text-sm text-slate-500">Qty Picked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${totalShipped >= totalOrdered ? 'text-green-600' : 'text-slate-900'}`}>
              {totalShipped}
            </div>
            <p className="text-sm text-slate-500">Qty Shipped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">${totalValue.toFixed(2)}</div>
            <p className="text-sm text-slate-500">Order Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Order details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Customer</dt>
                <dd className="font-medium">{order.customer?.name || order.customerId}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Customer Code</dt>
                <dd className="font-medium">{order.customer?.code || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Warehouse</dt>
                <dd className="font-medium">{order.warehouse?.name || 'Main Warehouse'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Requested Ship Date</dt>
                <dd className="font-medium">
                  {order.requestedShipDate
                    ? new Date(order.requestedShipDate).toLocaleDateString()
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Priority</dt>
                <dd className="font-medium">{getPriorityLabel(order.priority)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Line Items</dt>
                <dd className="font-medium">{order.lines?.length || 0}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfilment Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProgressBar label="Allocated" current={totalAllocated} total={totalOrdered} />
              <ProgressBar label="Picked" current={totalPicked} total={totalOrdered} />
              <ProgressBar label="Shipped" current={totalShipped} total={totalOrdered} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments section */}
      {(hasShipments || canCreateShipment) && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Shipments</CardTitle>
              {canCreateShipment && !hasShipments && (
                <Button size="sm" onClick={handleCreateShipment} isLoading={createShipment.isPending}>
                  <TruckIcon />
                  Create Shipment
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {shipmentsLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : hasShipments ? (
              <DataTable
                columns={shipmentColumns}
                data={shipments}
                keyField="id"
              />
            ) : (
              <div className="text-center py-8 text-slate-500">
                <TruckIconLarge className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                <p>No shipments yet</p>
                {allPicked && (
                  <p className="text-sm text-slate-400 mt-1">
                    All items picked. Ready to create shipment.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={lineColumns}
            data={order.lines || []}
            keyField="id"
            emptyState={{
              title: 'No line items',
              description: 'This order has no items',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressBar({ label, current, total }: { label: string; current: number; total: number }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current >= total && total > 0;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <span className={`text-sm font-medium ${isComplete ? 'text-green-600' : 'text-slate-900'}`}>
          {current}/{total} ({percent}%)
        </span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${isComplete ? 'bg-green-600' : 'bg-primary-600'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
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

function getShipmentStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'DELIVERED':
      return 'success';
    case 'SHIPPED':
      return 'info';
    case 'READY_FOR_DISPATCH':
      return 'warning';
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

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function TruckIconLarge({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
