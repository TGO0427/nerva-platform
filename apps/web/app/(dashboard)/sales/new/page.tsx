'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  useCustomers,
  useItems,
  useWarehouses,
  useCreateOrder,
  CreateOrderData,
} from '@/lib/queries';

interface OrderLine {
  id: string;
  itemId: string;
  itemSku?: string;
  itemDescription?: string;
  qtyOrdered: number;
  unitPrice: number;
}

const PRIORITY_OPTIONS = [
  { value: '1', label: 'Low (1)' },
  { value: '3', label: 'Normal (3)' },
  { value: '5', label: 'High (5)' },
  { value: '8', label: 'Urgent (8)' },
];

export default function NewSalesOrderPage() {
  const router = useRouter();
  const createOrder = useCreateOrder();

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [priority, setPriority] = useState('3');
  const [requestedShipDate, setRequestedShipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [error, setError] = useState('');

  // For adding new line
  const [selectedItemId, setSelectedItemId] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('');

  // Fetch data for dropdowns
  const { data: customersData, isLoading: customersLoading } = useCustomers({ page: 1, limit: 100 });
  const { data: itemsData, isLoading: itemsLoading } = useItems({ page: 1, limit: 100 });
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();

  const customers = customersData?.data || [];
  const items = itemsData?.data || [];

  const customerOptions = [
    { value: '', label: 'Select a customer...' },
    ...customers.map((c) => ({ value: c.id, label: `${c.code || ''} - ${c.name}`.trim().replace(/^- /, '') })),
  ];

  const warehouseOptions = [
    { value: '', label: 'Select a warehouse...' },
    ...(warehouses || []).map((w) => ({ value: w.id, label: w.name })),
  ];

  const itemOptions = [
    { value: '', label: 'Select an item...' },
    ...items.map((i) => ({ value: i.id, label: `${i.sku} - ${i.description}` })),
  ];

  const handleAddLine = () => {
    if (!selectedItemId) {
      setError('Please select an item');
      return;
    }

    const qty = parseFloat(lineQty);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    // Check if item already exists in lines
    const existingLine = lines.find((l) => l.itemId === selectedItemId);
    if (existingLine) {
      setError('This item is already in the order. Update the existing line instead.');
      return;
    }

    const newLine: OrderLine = {
      id: crypto.randomUUID(),
      itemId: selectedItemId,
      itemSku: item.sku,
      itemDescription: item.description,
      qtyOrdered: qty,
      unitPrice: linePrice ? parseFloat(linePrice) : 0,
    };

    setLines([...lines, newLine]);
    setSelectedItemId('');
    setLineQty('1');
    setLinePrice('');
    setError('');
  };

  const handleRemoveLine = (lineId: string) => {
    setLines(lines.filter((l) => l.id !== lineId));
  };

  const handleUpdateLineQty = (lineId: string, qty: string) => {
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum < 0) return;

    setLines(lines.map((l) => (l.id === lineId ? { ...l, qtyOrdered: qtyNum } : l)));
  };

  const handleUpdateLinePrice = (lineId: string, price: string) => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return;

    setLines(lines.map((l) => (l.id === lineId ? { ...l, unitPrice: priceNum } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    if (!warehouseId) {
      setError('Please select a warehouse');
      return;
    }

    if (lines.length === 0) {
      setError('Please add at least one line item');
      return;
    }

    const orderData: CreateOrderData = {
      customerId,
      warehouseId,
      externalRef: externalRef || undefined,
      priority: parseInt(priority),
      requestedShipDate: requestedShipDate || undefined,
      notes: notes || undefined,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        qtyOrdered: l.qtyOrdered,
        unitPrice: l.unitPrice || undefined,
      })),
    };

    try {
      const order = await createOrder.mutateAsync(orderData);
      router.push(`/sales/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  const totalQty = lines.reduce((sum, l) => sum + l.qtyOrdered, 0);
  const totalValue = lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitPrice, 0);

  const isLoading = customersLoading || itemsLoading || warehousesLoading;

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Sales Order</h1>
        <p className="text-gray-500 mt-1">Create a new customer order</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      options={customerOptions}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      options={warehouseOptions}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      External Reference
                    </label>
                    <Input
                      value={externalRef}
                      onChange={(e) => setExternalRef(e.target.value)}
                      placeholder="Customer PO number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      options={PRIORITY_OPTIONS}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Requested Ship Date
                    </label>
                    <Input
                      type="date"
                      value={requestedShipDate}
                      onChange={(e) => setRequestedShipDate(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Order notes..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add line form */}
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      options={itemOptions}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      placeholder="Qty"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      value={linePrice}
                      onChange={(e) => setLinePrice(e.target.value)}
                      placeholder="Price"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <Button type="button" onClick={handleAddLine}>
                    <PlusIcon />
                    Add
                  </Button>
                </div>

                {/* Line items table */}
                {lines.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <BoxIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>No items added yet</p>
                    <p className="text-sm">Select an item above and click Add</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Item
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                            Unit Price
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                            Total
                          </th>
                          <th className="px-4 py-3 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lines.map((line) => (
                          <tr key={line.id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {line.itemSku}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {line.itemDescription}
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={line.qtyOrdered}
                                onChange={(e) => handleUpdateLineQty(line.id, e.target.value)}
                                className="w-24 text-right"
                                min="0.01"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={line.unitPrice}
                                onChange={(e) => handleUpdateLinePrice(line.id, e.target.value)}
                                className="w-28 text-right"
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              ${(line.qtyOrdered * line.unitPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(line.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <TrashIcon />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Line Items</dt>
                    <dd className="font-medium">{lines.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Total Qty</dt>
                    <dd className="font-medium">{totalQty}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <dt className="text-gray-900 font-medium">Total Value</dt>
                    <dd className="text-lg font-bold text-primary-600">
                      ${totalValue.toFixed(2)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                isLoading={createOrder.isPending}
                disabled={lines.length === 0 || !customerId || !warehouseId}
              >
                <CheckIcon />
                Create Order
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/sales')}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
