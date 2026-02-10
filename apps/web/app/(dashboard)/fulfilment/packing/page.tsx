'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Spinner } from '@/components/ui/spinner';
import { Select } from '@/components/ui/select';
import {
  useShipments,
  useShipment,
  useShipmentLines,
  usePackShipment,
  useMarkShipmentReady,
  Shipment,
  ShipmentLine,
} from '@/lib/queries';
import { api } from '@/lib/api';

export default function PackingStationPage() {
  const router = useRouter();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');

  // Get pending and packed shipments for packing station work
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipments({
    page: 1,
    limit: 100,
  });
  const { data: selectedShipment, isLoading: shipmentLoading } = useShipment(
    selectedShipmentId || undefined
  );
  const { data: shipmentLines, isLoading: linesLoading } = useShipmentLines(
    selectedShipmentId || undefined
  );

  const packShipment = usePackShipment();
  const markReady = useMarkShipmentReady();

  // Filter to only show shipments that can be worked on at packing station
  const packableShipments = (shipmentsData?.data || []).filter(
    (s) => s.status === 'PENDING' || s.status === 'PACKED'
  );

  const handlePack = async () => {
    if (!selectedShipmentId) return;
    if (confirm('Mark this shipment as packed?')) {
      try {
        await packShipment.mutateAsync(selectedShipmentId);
      } catch (error) {
        console.error('Failed to pack shipment:', error);
      }
    }
  };

  const handleMarkReady = async () => {
    if (!selectedShipmentId) return;
    if (confirm('Mark this shipment ready for dispatch?')) {
      try {
        await markReady.mutateAsync(selectedShipmentId);
      } catch (error) {
        console.error('Failed to mark ready:', error);
      }
    }
  };

  const handlePrintPackingSlip = async () => {
    if (!selectedShipmentId || !selectedShipment) return;
    try {
      const response = await api.get(`/fulfilment/shipments/${selectedShipmentId}/packing-slip`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `packing-slip-${selectedShipment.shipmentNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download packing slip:', error);
    }
  };

  const lineColumns: Column<ShipmentLine>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => <span className="font-mono text-sm font-medium">{row.itemSku}</span>,
    },
    {
      key: 'itemDescription',
      header: 'Description',
    },
    {
      key: 'qty',
      header: 'Qty',
      className: 'text-center',
      width: '80px',
      render: (row) => (
        <span className="text-lg font-bold">{row.qty}</span>
      ),
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (row) => row.batchNo || '-',
    },
  ];

  const totalItems = shipmentLines?.reduce((sum, line) => sum + line.qty, 0) || 0;
  const canPack = selectedShipment?.status === 'PENDING';
  const canMarkReady = selectedShipment?.status === 'PACKED';

  return (
    <div>
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Packing Station</h1>
          <p className="text-slate-500 mt-1">Pack shipments and generate packing slips</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipment Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Shipment</CardTitle>
            </CardHeader>
            <CardContent>
              {shipmentsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : packableShipments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <PackageIcon className="mx-auto h-12 w-12 mb-4 text-slate-300" />
                  <p className="font-medium">No shipments to pack</p>
                  <p className="text-sm mt-1">Create shipments from picked orders in Fulfilment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {packableShipments.map((shipment) => (
                    <button
                      key={shipment.id}
                      onClick={() => setSelectedShipmentId(shipment.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedShipmentId === shipment.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{shipment.shipmentNo}</span>
                        <Badge variant={getStatusVariant(shipment.status)}>
                          {shipment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500">
                        Order: {shipment.orderNo || shipment.salesOrderId.slice(0, 8)}
                      </div>
                      <div className="text-sm text-slate-500">
                        Weight: {shipment.totalWeightKg?.toFixed(2) || 0} kg
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Packing Area */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedShipmentId ? (
            <Card className="p-12">
              <div className="text-center text-slate-500">
                <ScanIcon className="mx-auto h-16 w-16 mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-900">Select a Shipment</h3>
                <p className="mt-1">Choose a shipment from the list to start packing</p>
              </div>
            </Card>
          ) : shipmentLoading ? (
            <Card className="p-12">
              <div className="flex justify-center">
                <Spinner size="lg" />
              </div>
            </Card>
          ) : selectedShipment ? (
            <>
              {/* Shipment Info Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      {selectedShipment.shipmentNo}
                      <Badge variant={getStatusVariant(selectedShipment.status)}>
                        {selectedShipment.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Order: {selectedShipment.orderNo || selectedShipment.salesOrderId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handlePrintPackingSlip}>
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Packing Slip
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">{totalItems}</div>
                      <div className="text-sm text-slate-500">Total Items</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">{shipmentLines?.length || 0}</div>
                      <div className="text-sm text-slate-500">Line Items</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">{selectedShipment.totalWeightKg?.toFixed(1) || 0}</div>
                      <div className="text-sm text-slate-500">Weight (kg)</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">{selectedShipment.totalCbm?.toFixed(2) || 0}</div>
                      <div className="text-sm text-slate-500">Volume (m³)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items to Pack */}
              <Card>
                <CardHeader>
                  <CardTitle>Items to Pack</CardTitle>
                </CardHeader>
                <CardContent>
                  {linesLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : shipmentLines && shipmentLines.length > 0 ? (
                    <DataTable
                      columns={lineColumns}
                      data={shipmentLines}
                      keyField="id"
                    />
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No items in this shipment
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/fulfilment/shipments/${selectedShipmentId}`)}
                    >
                      View Details
                    </Button>
                    {canPack && (
                      <Button onClick={handlePack} isLoading={packShipment.isPending}>
                        <BoxIcon className="h-4 w-4 mr-2" />
                        Mark as Packed
                      </Button>
                    )}
                    {canMarkReady && (
                      <Button onClick={handleMarkReady} isLoading={markReady.isPending}>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Ready for Dispatch
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
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
      return 'info';
    case 'PENDING':
    default:
      return 'default';
  }
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
    </svg>
  );
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
