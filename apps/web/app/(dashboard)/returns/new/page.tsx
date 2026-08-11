'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/form-section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import {
  useCustomers,
  useItems,
  useWarehouses,
  useOrders,
  useCreateRma,
} from '@/lib/queries';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { RETURN_REASON_CODES } from '@nerva/shared';
import type { Customer, Item } from '@nerva/shared';

const RETURN_TYPE_OPTIONS = [
  { value: 'CUSTOMER', label: 'Customer Return' },
  { value: 'DELIVERY_EXCEPTION', label: 'Delivery Exception' },
];

const REASON_OPTIONS = Object.values(RETURN_REASON_CODES).map((code) => ({
  value: code,
  label: code.replace(/_/g, ' '),
}));

interface RmaLineDraft {
  tempId: string;
  itemId?: string;
  itemSku?: string;
  itemDescription?: string;
  qtyExpected: number;
  reasonCode: string;
  unitCreditAmount?: number;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function NewRmaPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const createRma = useCreateRma();

  const [warehouseId, setWarehouseId] = useState('');
  const [salesOrderId, setSalesOrderId] = useState('');
  const [returnType, setReturnType] = useState('CUSTOMER');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const debouncedItemSearch = useDebounce(itemSearch, 300);

  const [lines, setLines] = useState<RmaLineDraft[]>([]);

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
  const { data: ordersData } = useOrders({
    page: 1,
    limit: 50,
    customerId: selectedCustomer?.id,
  });

  const customers = customersData?.data || [];
  const items = itemsData?.data || [];
  const orders = selectedCustomer ? ordersData?.data || [] : [];

  useEffect(() => {
    if (warehouses && warehouses.length === 1 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Original order is customer-specific - clear it if the customer changes.
  useEffect(() => {
    setSalesOrderId('');
  }, [selectedCustomer?.id]);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setError('');
  }, []);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerSearch('');
  }, []);

  const handleAddItem = useCallback((item: Item) => {
    setLines((prev) => {
      if (prev.some((l) => l.itemId === item.id)) return prev;
      return [
        ...prev,
        {
          tempId: uid(),
          itemId: item.id,
          itemSku: item.sku,
          itemDescription: item.description,
          qtyExpected: 1,
          reasonCode: 'DAMAGED',
          unitCreditAmount: undefined,
        },
      ];
    });
    setItemSearch('');
    setShowItemDropdown(false);
    setError('');
  }, []);

  const handleUpdateLine = useCallback(
    (tempId: string, field: 'qtyExpected' | 'unitCreditAmount', value: string) => {
      const numValue = value === '' ? undefined : parseFloat(value);
      if (value !== '' && (numValue === undefined || isNaN(numValue) || numValue < 0)) return;
      setLines((prev) =>
        prev.map((l) => (l.tempId === tempId ? { ...l, [field]: numValue } : l)),
      );
    },
    [],
  );

  const handleUpdateReason = useCallback((tempId: string, reasonCode: string) => {
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, reasonCode } : l)));
  }, []);

  const handleRemoveLine = useCallback((tempId: string) => {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  }, []);

  const validate = (): string | null => {
    if (!selectedCustomer) return 'Please select a customer';
    if (!warehouseId) return 'Please select a warehouse';
    if (!salesOrderId) return 'A return must be linked to the original order it came from';
    if (lines.length === 0) return 'Please add at least 1 line item';
    for (const line of lines) {
      if (!line.qtyExpected || line.qtyExpected <= 0) {
        return `Quantity must be greater than 0 for ${line.itemSku}`;
      }
      if (!line.reasonCode) {
        return `Select a reason for ${line.itemSku}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const rma = await createRma.mutateAsync({
        warehouseId,
        customerId: selectedCustomer!.id,
        salesOrderId,
        returnType,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId!,
          qtyExpected: l.qtyExpected,
          reasonCode: l.reasonCode,
          unitCreditAmount: l.unitCreditAmount,
        })),
      });
      addToast('RMA created', 'success');
      router.push(`/returns/${rma.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create RMA');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary dark:text-text-dark-primary">New RMA</h1>
          <p className="text-text-muted dark:text-text-dark-muted mt-1">Authorize a customer return</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/returns')}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} isLoading={createRma.isPending}>
            <CheckIcon />
            Create RMA
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg">
                <div>
                  <div className="font-medium text-text-primary dark:text-text-dark-primary">{selectedCustomer.name}</div>
                  {selectedCustomer.code && (
                    <div className="text-sm text-text-muted dark:text-text-dark-muted">{selectedCustomer.code}</div>
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
                  <div className="absolute z-10 w-full mt-1 bg-surface-card dark:bg-surface-dark-card border border-surface-border dark:border-surface-dark-border rounded-lg shadow-lg max-h-64 overflow-auto">
                    {customersLoading ? (
                      <div className="p-4 text-center">
                        <Spinner size="sm" />
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="p-4 text-center text-text-muted dark:text-text-dark-muted text-sm">
                        No customers found
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary border-b last:border-b-0"
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <div className="font-medium text-text-primary dark:text-text-dark-primary">{customer.name}</div>
                          {customer.code && (
                            <div className="text-sm text-text-muted dark:text-text-dark-muted">{customer.code}</div>
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

        <Card>
          <CardHeader>
            <CardTitle>RMA Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Warehouse<RequiredMark /></Label>
                <Select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  disabled={warehousesLoading}
                  placeholder="Select warehouse..."
                  options={(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
                />
              </div>
              <div>
                <Label>Return Type</Label>
                <Select
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value)}
                  options={RETURN_TYPE_OPTIONS}
                />
              </div>
              <div>
                <Label>Original Order<RequiredMark /></Label>
                <Select
                  value={salesOrderId}
                  onChange={(e) => setSalesOrderId(e.target.value)}
                  disabled={!selectedCustomer}
                  placeholder={selectedCustomer ? 'Select the order this return is for...' : 'Select a customer first'}
                  options={orders.map((o) => ({ value: o.id, label: o.orderNo }))}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Return Items</CardTitle>
              <span className="text-sm text-text-muted dark:text-text-dark-muted">{lines.length} items</span>
            </div>
          </CardHeader>
          <CardContent>
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
                <div className="absolute z-10 w-full mt-1 bg-surface-card dark:bg-surface-dark-card border border-surface-border dark:border-surface-dark-border rounded-lg shadow-lg max-h-64 overflow-auto">
                  {itemsLoading ? (
                    <div className="p-4 text-center">
                      <Spinner size="sm" />
                    </div>
                  ) : items.length === 0 ? (
                    <div className="p-4 text-center text-text-muted dark:text-text-dark-muted text-sm">
                      No items found
                    </div>
                  ) : (
                    items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary border-b last:border-b-0"
                        onClick={() => handleAddItem(item)}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-text-primary dark:text-text-dark-primary">{item.sku}</span>
                          <span className="text-sm text-text-muted dark:text-text-dark-muted">{item.uom}</span>
                        </div>
                        <div className="text-sm text-text-secondary dark:text-text-dark-secondary">{item.description}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-surface-border dark:border-surface-dark-border rounded-lg">
                <BoxIcon className="mx-auto h-12 w-12 text-text-muted dark:text-text-dark-muted mb-3" />
                <p className="text-text-muted dark:text-text-dark-muted">No items added yet</p>
                <p className="text-sm text-text-muted dark:text-text-dark-muted">Search and select items above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-surface-border dark:border-surface-dark-border">
                      <th className="text-left py-3 px-2 text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase">Item</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase">Reason</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase w-24">Qty</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase w-36">Unit Credit</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.tempId} className="border-b border-surface-border dark:border-surface-dark-border">
                        <td className="py-3 px-2">
                          <div className="font-medium">{line.itemSku}</div>
                          <div className="text-sm text-text-secondary dark:text-text-dark-secondary">{line.itemDescription}</div>
                        </td>
                        <td className="py-3 px-2">
                          <Select
                            value={line.reasonCode}
                            onChange={(e) => handleUpdateReason(line.tempId, e.target.value)}
                            options={REASON_OPTIONS}
                            className="w-40"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            value={line.qtyExpected}
                            onChange={(e) => handleUpdateLine(line.tempId, 'qtyExpected', e.target.value)}
                            className="w-20 text-right"
                            min="0.01"
                            step="1"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            value={line.unitCreditAmount ?? ''}
                            onChange={(e) => handleUpdateLine(line.tempId, 'unitCreditAmount', e.target.value)}
                            className="w-32 text-right"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.tempId)}
                            className="text-text-muted dark:text-text-dark-muted hover:text-red-600 transition-colors"
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

        <div className="flex justify-end gap-3 pb-6">
          <Button variant="secondary" onClick={() => router.push('/returns')}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} isLoading={createRma.isPending}>
            <CheckIcon />
            Create RMA
          </Button>
        </div>
      </div>

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

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'h-5 w-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
