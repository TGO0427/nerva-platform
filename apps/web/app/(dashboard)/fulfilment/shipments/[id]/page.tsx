'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  useShipment,
  usePackShipment,
  useMarkShipmentReady,
  useShipShipment,
  useDeliverShipment,
} from '@/lib/queries';

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;

  const { data: shipment, isLoading } = useShipment(shipmentId);
  const packShipment = usePackShipment();
  const markReady = useMarkShipmentReady();
  const shipShipment = useShipShipment();
  const deliverShipment = useDeliverShipment();

  const [carrier, setCarrier] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [showShipForm, setShowShipForm] = useState(false);

  const handlePack = async () => {
    if (confirm('Mark this shipment as packed?')) {
      try {
        await packShipment.mutateAsync(shipmentId);
      } catch (error) {
        console.error('Failed to pack shipment:', error);
      }
    }
  };

  const handleMarkReady = async () => {
    if (confirm('Mark this shipment ready for dispatch?')) {
      try {
        await markReady.mutateAsync(shipmentId);
      } catch (error) {
        console.error('Failed to mark ready:', error);
      }
    }
  };

  const handleShip = async () => {
    if (!carrier || !trackingNo) {
      alert('Please enter carrier and tracking number');
      return;
    }
    try {
      await shipShipment.mutateAsync({ shipmentId, carrier, trackingNo });
      setShowShipForm(false);
    } catch (error) {
      console.error('Failed to ship:', error);
    }
  };

  const handleDeliver = async () => {
    if (confirm('Mark this shipment as delivered?')) {
      try {
        await deliverShipment.mutateAsync(shipmentId);
      } catch (error) {
        console.error('Failed to mark delivered:', error);
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

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Shipment not found</h2>
      </div>
    );
  }

  const canPack = shipment.status === 'PENDING';
  const canMarkReady = shipment.status === 'PACKED';
  const canShip = shipment.status === 'READY_FOR_DISPATCH' || shipment.status === 'PACKED';
  const canDeliver = shipment.status === 'SHIPPED';

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{shipment.shipmentNo}</h1>
            <Badge variant={getStatusVariant(shipment.status)}>
              {shipment.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-gray-500 mt-1">
            Created {new Date(shipment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {canPack && (
            <Button onClick={handlePack} isLoading={packShipment.isPending}>
              <BoxIcon />
              Mark Packed
            </Button>
          )}
          {canMarkReady && (
            <Button onClick={handleMarkReady} isLoading={markReady.isPending}>
              <CheckIcon />
              Ready for Dispatch
            </Button>
          )}
          {canShip && !showShipForm && (
            <Button onClick={() => setShowShipForm(true)}>
              <TruckIcon />
              Ship
            </Button>
          )}
          {canDeliver && (
            <Button onClick={handleDeliver} isLoading={deliverShipment.isPending}>
              <CheckCircleIcon />
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      {/* Ship form modal */}
      {showShipForm && (
        <Card className="mb-6 border-primary-200 bg-primary-50">
          <CardHeader>
            <CardTitle>Ship Shipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier *
                </label>
                <Input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g., FedEx, UPS, DHL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Number *
                </label>
                <Input
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleShip} isLoading={shipShipment.isPending}>
                Confirm Ship
              </Button>
              <Button variant="secondary" onClick={() => setShowShipForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Order</dt>
                <dd className="font-medium">{shipment.orderNo || shipment.salesOrderId}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Warehouse</dt>
                <dd className="font-medium">Main Warehouse</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total Weight</dt>
                <dd className="font-medium">{shipment.totalWeightKg} kg</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total Volume</dt>
                <dd className="font-medium">{shipment.totalCbm} m³</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Carrier</dt>
                <dd className="font-medium">{shipment.carrier || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Tracking Number</dt>
                <dd className="font-medium font-mono">{shipment.trackingNo || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created By</dt>
                <dd className="font-medium">{shipment.createdBy || 'System'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="font-medium">
                  {new Date(shipment.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Status timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <TimelineStep
              label="Pending"
              active={shipment.status === 'PENDING'}
              complete={['PACKED', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'].includes(shipment.status)}
            />
            <TimelineConnector complete={['PACKED', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'].includes(shipment.status)} />
            <TimelineStep
              label="Packed"
              active={shipment.status === 'PACKED'}
              complete={['READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'].includes(shipment.status)}
            />
            <TimelineConnector complete={['READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'].includes(shipment.status)} />
            <TimelineStep
              label="Ready"
              active={shipment.status === 'READY_FOR_DISPATCH'}
              complete={['SHIPPED', 'DELIVERED'].includes(shipment.status)}
            />
            <TimelineConnector complete={['SHIPPED', 'DELIVERED'].includes(shipment.status)} />
            <TimelineStep
              label="Shipped"
              active={shipment.status === 'SHIPPED'}
              complete={shipment.status === 'DELIVERED'}
            />
            <TimelineConnector complete={shipment.status === 'DELIVERED'} />
            <TimelineStep
              label="Delivered"
              active={shipment.status === 'DELIVERED'}
              complete={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineStep({ label, active, complete }: { label: string; active: boolean; complete: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          complete
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        {complete ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-2 h-2 bg-current rounded-full" />
        )}
      </div>
      <span className={`mt-2 text-xs font-medium ${active || complete ? 'text-gray-900' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

function TimelineConnector({ complete }: { complete: boolean }) {
  return (
    <div className={`flex-1 h-1 mx-2 ${complete ? 'bg-green-600' : 'bg-gray-200'}`} />
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
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

function BoxIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

function CheckCircleIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
