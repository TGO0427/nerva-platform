'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  useCustomers,
  useItems,
  useWarehouses,
  useCreateOrder,
  useGenerateOrderNumber,
  CreateOrderData,
} from '@/lib/queries';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Customer, Item } from '@nerva/shared';

interface OrderLine {
  tempId: string;
  itemId?: string;
  itemSku?: string;
  itemDescription?: string;
  qtyOrdered: number;
  unitPrice?: number;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const createOrder = useCreateOrder();
  const generateOrderNo = useGenerateOrderNumber();

  // Form state
  const [orderNo, setOrderNo] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [requestedShipDate, setRequestedShipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Generate order number
  const handleGenerateOrderNo = async () => {
    try {
      const generatedNo = await generateOrderNo.mutateAsync();
      setOrderNo(generatedNo);
    } catch (err) {
      setError('Failed to generate order number');
    }
  };

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

  // Item search
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const debouncedItemSearch = useDebounce(itemSearch, 300);

  // Lines
  const [lines, setLines] = useState<OrderLine[]>([]);

  // Fetch data
  const { data: customersData, isLoading: customersLoading } = useCustomers({
    page: 1,
    limit: 20,
    search: debouncedCustomerSearch || undefined,
  });

  const { data: itemsData, isLoading: itemsLoading } = useItems({
    page: 1,
    limit: 20,
    search: debouncedItemSearch || undefined,
  });

  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();

  const customers = customersData?.data || [];
  const items = itemsData?.data || [];

  // Auto-select first warehouse if only one exists
  if (warehouses && warehouses.length === 1 && !warehouseId) {
    setWarehouseId(warehouses[0].id);
  }

  // Totals
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    for (const l of lines) {
      totalQty += l.qtyOrdered || 0;
      totalValue += (l.qtyOrdered || 0) * (l.unitPrice || 0);
    }
    return { lineCount: lines.length, totalQty, totalValue };
  }, [lines]);

  // Select customer
  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setError('');
  }, []);

  // Clear customer
  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerSearch('');
  }, []);

  // Add item to lines (auto-merge if exists)
  const handleAddItem = useCallback((item: Item) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        // Auto-merge: increment quantity
        return prev.map((l) =>
          l.itemId === item.id
            ? { ...l, qtyOrdered: l.qtyOrdered + 1 }
            : l
        );
      }
      // Add new line
      return [
        ...prev,
        {
          tempId: uid(),
          itemId: item.id,
          itemSku: item.sku,
          itemDescription: item.description,
          qtyOrdered: 1,
          unitPrice: undefined,
        },
      ];
    });
    setItemSearch('');
    setShowItemDropdown(false);
    setError('');
  }, []);

  // Update line
  const handleUpdateLine = useCallback((tempId: string, field: 'qtyOrdered' | 'unitPrice', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setLines((prev) =>
      prev.map((l) =>
        l.tempId === tempId ? { ...l, [field]: numValue } : l
      )
    );
  }, []);

  // Remove line
  const handleRemoveLine = useCallback((tempId: string) => {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  }, []);

  // Validate form
  const validate = (): string | null => {
    if (!selectedCustomer) {
      return 'Please select a customer';
    }
    if (!warehouseId) {
      return 'Please select a warehouse';
    }
    if (lines.length === 0) {
      return 'Please add at least 1 line item';
    }
    for (const line of lines) {
      if (!line.qtyOrdered || line.qtyOrdered <= 0) {
        return `Quantity must be greater than 0 for ${line.itemSku}`;
      }
    }
    return null;
  };

  // Submit order
  const handleSubmit = async (asDraft = false) => {
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // For now, we don't have a draft status, so both buttons create the order
    const orderData: CreateOrderData = {
      customerId: selectedCustomer!.id,
      warehouseId,
      orderNo: orderNo || undefined,
      priority: 5,
      requestedShipDate: requestedShipDate || undefined,
      notes: notes || undefined,
      lines: lines.map((l) => ({
        itemId: l.itemId!,
        qtyOrdered: l.qtyOrdered,
        unitPrice: l.unitPrice,
      })),
    };

    try {
      const order = await createOrder.mutateAsync(orderData);
      router.push(`/sales/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Sales Order</h1>
          <p className="text-gray-500 mt-1">Create an order and add line items</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={createOrder.isPending}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            isLoading={createOrder.isPending}
          >
            <CheckIcon />
            Create Order
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        {/* Customer Section */}
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
                  {selectedCustomer.code && (
                    <div className="text-sm text-gray-500">{selectedCustomer.code}</div>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={handleClearCustomer}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customers by name or code..."
                  className="w-full"
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {customersLoading ? (
                      <div className="p-4 text-center">
                        <Spinner size="sm" />
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No customers found
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.code && (
                            <div className="text-sm text-gray-500">{customer.code}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Header Section */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order No.
                </label>
                <div className="flex gap-2">
                  <Input
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateOrderNo}
                    disabled={generateOrderNo.isPending}
                    className="shrink-0"
                  >
                    {generateOrderNo.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <GenerateIcon />
                    )}
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={warehousesLoading}
                >
                  <option value="">Select warehouse...</option>
                  {warehouses?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional order notes..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lines Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <span className="text-sm text-gray-500">{totals.lineCount} items</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Item Search */}
            <div className="relative mb-4">
              <Input
                value={itemSearch}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowItemDropdown(true);
                }}
                onFocus={() => setShowItemDropdown(true)}
                placeholder="Search items by SKU or description..."
                className="w-full"
              />
              {showItemDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {itemsLoading ? (
                    <div className="p-4 text-center">
                      <Spinner size="sm" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No items found
                    </div>
                  ) : (
                    items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                        onClick={() => handleAddItem(item)}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">{item.sku}</span>
                          <span className="text-sm text-gray-500">{item.uom}</span>
                        </div>
                        <div className="text-sm text-gray-600">{item.description}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Lines Table */}
            {lines.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <BoxIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500">No items added yet</p>
                <p className="text-sm text-gray-400">Search and select items above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                        Item
                      </th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase w-28">
                        Qty
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase w-32">
                        Unit Price
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase w-32">
                        Total
                      </th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.tempId} className="border-b">
                        <td className="py-3 px-2">
                          <span className="font-medium">{line.itemSku}</span>
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {line.itemDescription}
                        </td>
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            value={line.qtyOrdered}
                            onChange={(e) => handleUpdateLine(line.tempId, 'qtyOrdered', e.target.value)}
                            className="w-24 text-right"
                            min="0.01"
                            step="1"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            value={line.unitPrice ?? ''}
                            onChange={(e) => handleUpdateLine(line.tempId, 'unitPrice', e.target.value)}
                            className="w-28 text-right"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          ${((line.qtyOrdered || 0) * (line.unitPrice || 0)).toFixed(2)}
                        </td>
                        <td className="py-3 px-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.tempId)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
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

        {/* Summary Section */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-gray-900">{totals.lineCount}</span> line items
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-gray-900">{totals.totalQty}</span> total quantity
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Value</div>
                <div className="text-2xl font-bold text-primary-600">
                  ${totals.totalValue.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <Button variant="secondary" onClick={() => router.push('/sales')}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={createOrder.isPending}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            isLoading={createOrder.isPending}
          >
            <CheckIcon />
            Create Order
          </Button>
        </div>
      </div>

      {/* Click outside handler */}
      {(showCustomerDropdown || showItemDropdown) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowCustomerDropdown(false);
            setShowItemDropdown(false);
          }}
        />
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function GenerateIcon() {
  return (
    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
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
