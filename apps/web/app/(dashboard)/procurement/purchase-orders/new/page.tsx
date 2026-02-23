'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useSuppliers, useWarehouses, useItems, useCreatePurchaseOrder } from '@/lib/queries';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface OrderLine {
  tempId: string;
  itemId: string;
  itemSku: string;
  itemDescription: string;
  qtyOrdered: number;
  unitCost?: number;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    shipToWarehouseId: '',
    notes: '',
  });
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedItemSearch = useDebounce(itemSearch, 300);

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: warehouses } = useWarehouses();
  const { data: itemsData, isLoading: itemsLoading } = useItems({
    page: 1,
    limit: 20,
    search: debouncedItemSearch || undefined,
  });
  const createPO = useCreatePurchaseOrder();

  const items = itemsData?.data || [];

  const totals = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    for (const l of lines) {
      totalQty += l.qtyOrdered || 0;
      totalValue += (l.qtyOrdered || 0) * (l.unitCost || 0);
    }
    return { lineCount: lines.length, totalQty, totalValue };
  }, [lines]);

  const handleAddItem = useCallback((item: { id: string; sku: string; description: string }) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.id ? { ...l, qtyOrdered: l.qtyOrdered + 1 } : l
        );
      }
      return [
        ...prev,
        {
          tempId: uid(),
          itemId: item.id,
          itemSku: item.sku,
          itemDescription: item.description,
          qtyOrdered: 1,
          unitCost: undefined,
        },
      ];
    });
    setItemSearch('');
    setShowItemDropdown(false);
  }, []);

  const handleUpdateLine = useCallback((tempId: string, field: 'qtyOrdered' | 'unitCost', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setLines((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, [field]: numValue } : l))
    );
  }, []);

  const handleRemoveLine = useCallback((tempId: string) => {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.supplierId) {
      setError('Please select a supplier');
      return;
    }

    try {
      const po = await createPO.mutateAsync({
        supplierId: formData.supplierId,
        orderDate: formData.orderDate,
        expectedDate: formData.expectedDate || undefined,
        shipToWarehouseId: formData.shipToWarehouseId || undefined,
        notes: formData.notes || undefined,
        lines: lines.length > 0
          ? lines.map((l) => ({
              itemId: l.itemId,
              qtyOrdered: l.qtyOrdered,
              unitCost: l.unitCost,
            }))
          : undefined,
      });
      addToast('Purchase order created', 'success');
      router.push(`/procurement/purchase-orders/${po.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
      addToast('Failed to create purchase order', 'error');
    }
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Purchase Order</h1>
        <p className="text-slate-500 mt-1">Create a new purchase order for a supplier.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="supplierId">Supplier *</Label>
              <select
                id="supplierId"
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a supplier...</option>
                {suppliersData?.data?.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code ? `${supplier.code} - ` : ''}{supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderDate">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expectedDate">Expected Delivery Date</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="shipToWarehouseId">Ship To Warehouse</Label>
              <select
                id="shipToWarehouseId"
                value={formData.shipToWarehouseId}
                onChange={(e) => setFormData({ ...formData, shipToWarehouseId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select warehouse...</option>
                {warehouses?.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.code ? `${wh.code} - ` : ''}{wh.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-24 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add any notes or special instructions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <span className="text-sm text-slate-500">{totals.lineCount} items</span>
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {itemsLoading ? (
                    <div className="p-4 text-center"><Spinner size="sm" /></div>
                  ) : items.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">No items found</div>
                  ) : (
                    items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                        onClick={() => handleAddItem(item)}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-900">{item.sku}</span>
                          <span className="text-sm text-slate-500">{item.uom}</span>
                        </div>
                        <div className="text-sm text-slate-600">{item.description}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <p className="text-slate-500">No items added yet</p>
                <p className="text-sm text-slate-400">Search and select items above, or add them after creating the PO</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Item</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Description</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase w-28">Qty</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase w-32">Unit Cost</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase w-32">Total</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.tempId} className="border-b">
                        <td className="py-3 px-2"><span className="font-medium">{line.itemSku}</span></td>
                        <td className="py-3 px-2 text-slate-600">{line.itemDescription}</td>
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
                            value={line.unitCost ?? ''}
                            onChange={(e) => handleUpdateLine(line.tempId, 'unitCost', e.target.value)}
                            className="w-28 text-right"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          R {((line.qtyOrdered || 0) * (line.unitCost || 0)).toFixed(2)}
                        </td>
                        <td className="py-3 px-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.tempId)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
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

            {lines.length > 0 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-slate-500">
                  <span className="font-medium text-slate-900">{totals.totalQty}</span> total quantity
                </div>
                <div className="text-right">
                  <span className="text-sm text-slate-500">Subtotal: </span>
                  <span className="text-lg font-bold text-slate-900">
                    R {totals.totalValue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/procurement/purchase-orders')}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={createPO.isPending}>
            Create Purchase Order
          </Button>
        </div>
      </form>

      {showItemDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowItemDropdown(false)}
        />
      )}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
