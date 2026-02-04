'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSuppliers, useWarehouses, useCreatePurchaseOrder } from '@/lib/queries';

export default function NewPurchaseOrderPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    shipToWarehouseId: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: suppliersData } = useSuppliers({ page: 1, limit: 100 });
  const { data: warehouses } = useWarehouses();
  const createPO = useCreatePurchaseOrder();

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
      });
      router.push(`/procurement/purchase-orders/${po.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    }
  };

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
        <p className="text-gray-500 mt-1">Create a new purchase order for a supplier.</p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add any notes or special instructions..."
              />
            </div>
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
    </div>
  );
}
