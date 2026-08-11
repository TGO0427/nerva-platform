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
  useWarehouses,
  useOrders,
  useOrder,
  useShipmentLinesByOrder,
  useCreateRma,
  SalesOrderLineWithItem,
} from '@/lib/queries';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { RETURN_REASON_CODES } from '@nerva/shared';
import type { Customer } from '@nerva/shared';

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
  salesOrderLineId?: string;
  qtyExpected: number;
  reasonCode: string;
  unitCreditAmount?: number;
  batchNo?: string;
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

  const [lines, setLines] = useState<RmaLineDraft[]>([]);

  const { data: customersData, isLoading: customersLoading } = useCustomers({
    page: 1,
    limit: 20,
    search: debouncedCustomerSearch || undefined,
  });
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
  const { data: ordersData } = useOrders({
    page: 1,
    limit: 50,
    customerId: selectedCustomer?.id,
  });
  // The order's own lines - items eligible for this return can only be
  // items that order actually contained.
  const { data: selectedOrder, isLoading: orderLinesLoading } = useOrder(salesOrderId || undefined);
  // What batch each of those lines actually shipped under, so the batch
  // doesn't have to be re-typed from memory when authorizing the return.
  const { data: shipmentLines } = useShipmentLinesByOrder(salesOrderId || undefined);

  const customers = customersData?.data || [];
  const orders = selectedCustomer ? ordersData?.data || [] : [];
  const orderLines = selectedOrder?.lines || [];

  const batchByOrderLine = new Map<string, string>();
  for (const sl of shipmentLines || []) {
    if (sl.batchNo && !batchByOrderLine.has(sl.salesOrderLineId)) {
      batchByOrderLine.set(sl.salesOrderLineId, sl.batchNo);
    }
  }

  useEffect(() => {
    if (warehouses && warehouses.length === 1 && !warehouseId) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  // Original order is customer-specific - clear it (and any lines already
  // picked from it) if the customer changes.
  useEffect(() => {
    setSalesOrderId('');
    setLines([]);
  }, [selectedCustomer?.id]);

  // Switching orders invalidates any lines picked from the previous one.
  useEffect(() => {
    setLines([]);
  }, [salesOrderId]);

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

  const handleAddOrderLine = useCallback((orderLine: SalesOrderLineWithItem) => {
    setLines((prev) => {
      if (prev.some((l) => l.salesOrderLineId === orderLine.id)) return prev;
      return [
        ...prev,
        {
          tempId: uid(),
          itemId: orderLine.itemId,
          itemSku: orderLine.itemSku,
          itemDescription: orderLine.itemDescription,
          salesOrderLineId: orderLine.id,
          qtyExpected: orderLine.qtyShipped > 0 ? orderLine.qtyShipped : 1,
          reasonCode: 'DAMAGED',
          // Default to what the customer actually paid for it - adjustable
          // per line, but a return should credit at cost by default, not R0.
          unitCreditAmount: orderLine.unitPrice ?? undefined,
          batchNo: batchByOrderLine.get(orderLine.id),
        },
      ];
    });
    setError('');
  }, [batchByOrderLine]);

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

  const handleUpdateBatch = useCallback((tempId: string, batchNo: string) => {
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, batchNo: batchNo || undefined } : l)));
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
          salesOrderLineId: l.salesOrderLineId,
          batchNo: l.batchNo,
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
            {!salesOrderId ? (
              <div className="text-center py-8 mb-4 border-2 border-dashed border-surface-border dark:border-surface-dark-border rounded-lg">
                <p className="text-sm text-text-muted dark:text-text-dark-muted">
                  Select the original order above to see its items
                </p>
              </div>
            ) : orderLinesLoading ? (
              <div className="text-center py-8 mb-4">
                <Spinner size="sm" />
              </div>
            ) : (
              (() => {
                const addableLines = orderLines.filter(
                  (ol) => !lines.some((l) => l.salesOrderLineId === ol.id),
                );
                return addableLines.length === 0 ? null : (
                  <div className="mb-4 border border-surface-border dark:border-surface-dark-border rounded-lg divide-y divide-surface-border dark:divide-surface-dark-border max-h-64 overflow-auto">
                    {addableLines.map((ol) => (
                      <button
                        key={ol.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary flex items-center justify-between gap-4"
                        onClick={() => handleAddOrderLine(ol)}
                      >
                        <div>
                          <div className="font-medium text-text-primary dark:text-text-dark-primary">{ol.itemSku}</div>
                          <div className="text-sm text-text-secondary dark:text-text-dark-secondary">{ol.itemDescription}</div>
                        </div>
                        <div className="text-right text-sm text-text-muted dark:text-text-dark-muted whitespace-nowrap">
                          <div>Shipped: {ol.qtyShipped}</div>
                          {batchByOrderLine.get(ol.id) && <div>Batch: {batchByOrderLine.get(ol.id)}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()
            )}

            {lines.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-surface-border dark:border-surface-dark-border rounded-lg">
                <BoxIcon className="mx-auto h-12 w-12 text-text-muted dark:text-text-dark-muted mb-3" />
                <p className="text-text-muted dark:text-text-dark-muted">No items added yet</p>
                <p className="text-sm text-text-muted dark:text-text-dark-muted">
                  {salesOrderId ? 'Select items from the original order above' : 'Select an original order above first'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-surface-border dark:border-surface-dark-border">
                      <th className="text-left py-3 px-2 text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase">Item</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-text-muted dark:text-text-dark-muted uppercase w-36">Batch</th>
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
                          <Input
                            value={line.batchNo ?? ''}
                            onChange={(e) => handleUpdateBatch(line.tempId, e.target.value)}
                            placeholder="Batch #"
                            className="w-32"
                          />
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

      {showCustomerDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowCustomerDropdown(false)}
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
