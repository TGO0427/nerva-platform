'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWarehouses, useBins, useItems, useTransferStock } from '@/lib/queries';

export default function StockTransfersPage() {
  const { data: warehouses } = useWarehouses();
  const { data: itemsData } = useItems({ page: 1, limit: 100 });
  const transferStock = useTransferStock();

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [fromBinId, setFromBinId] = useState('');
  const [toBinId, setToBinId] = useState('');
  const [qty, setQty] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: fromBins } = useBins(fromWarehouseId || undefined);
  const { data: toBins } = useBins(toWarehouseId || undefined);

  const warehouseOptions = warehouses?.map(w => ({
    value: w.id,
    label: w.name,
  })) || [];

  const itemOptions = itemsData?.data?.map(i => ({
    value: i.id,
    label: `${i.sku} - ${i.description}`,
  })) || [];

  const fromBinOptions = fromBins?.map(b => ({
    value: b.id,
    label: `${b.code} (${b.binType})`,
  })) || [];

  const toBinOptions = toBins?.map(b => ({
    value: b.id,
    label: `${b.code} (${b.binType})`,
  })) || [];

  const handleTransfer = async () => {
    setError('');
    setSuccess('');

    if (!itemId || !fromBinId || !toBinId || !qty) {
      setError('Please fill in all required fields');
      return;
    }

    if (fromBinId === toBinId) {
      setError('Source and destination bins must be different');
      return;
    }

    const qtyNum = parseInt(qty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Quantity must be a positive number');
      return;
    }

    try {
      await transferStock.mutateAsync({
        itemId,
        fromBinId,
        toBinId,
        qty: qtyNum,
        batchNo: batchNo || undefined,
      });
      setSuccess('Stock transferred successfully');
      // Reset form
      setQty('');
      setBatchNo('');
    } catch (err) {
      setError('Failed to transfer stock. Please try again.');
      console.error('Failed to transfer stock:', err);
    }
  };

  const handleReset = () => {
    setFromWarehouseId('');
    setToWarehouseId('');
    setItemId('');
    setFromBinId('');
    setToBinId('');
    setQty('');
    setBatchNo('');
    setError('');
    setSuccess('');
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
          <p className="text-gray-500 mt-1">Move stock between bins and warehouses</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Item selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item *
              </label>
              <Select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                options={[{ value: '', label: 'Select item...' }, ...itemOptions]}
              />
            </div>

            {/* Source */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Warehouse
                </label>
                <Select
                  value={fromWarehouseId}
                  onChange={(e) => {
                    setFromWarehouseId(e.target.value);
                    setFromBinId('');
                  }}
                  options={[{ value: '', label: 'Select...' }, ...warehouseOptions]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Bin *
                </label>
                <Select
                  value={fromBinId}
                  onChange={(e) => setFromBinId(e.target.value)}
                  options={[{ value: '', label: 'Select...' }, ...fromBinOptions]}
                  disabled={!fromWarehouseId}
                />
              </div>
            </div>

            {/* Destination */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Warehouse
                </label>
                <Select
                  value={toWarehouseId}
                  onChange={(e) => {
                    setToWarehouseId(e.target.value);
                    setToBinId('');
                  }}
                  options={[{ value: '', label: 'Select...' }, ...warehouseOptions]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Bin *
                </label>
                <Select
                  value={toBinId}
                  onChange={(e) => setToBinId(e.target.value)}
                  options={[{ value: '', label: 'Select...' }, ...toBinOptions]}
                  disabled={!toWarehouseId}
                />
              </div>
            </div>

            {/* Quantity and Batch */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="Enter quantity"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch No
                </label>
                <Input
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleTransfer}
                isLoading={transferStock.isPending}
                disabled={!itemId || !fromBinId || !toBinId || !qty}
              >
                <TransferIcon />
                Execute Transfer
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How Stock Transfers Work</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Select the item you want to transfer</li>
              <li>Choose the source warehouse and bin where the stock currently resides</li>
              <li>Choose the destination warehouse and bin where you want to move the stock</li>
              <li>Enter the quantity to transfer</li>
              <li>Optionally specify a batch number if tracking batches</li>
              <li>Click "Execute Transfer" to complete the movement</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Transfers are immediate and cannot be undone.
                Double-check the source and destination before confirming.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TransferIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}
