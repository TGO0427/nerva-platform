'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { DownloadIcon } from '@/components/ui/export-actions';
import { EntityHistory } from '@/components/ui/entity-history';
import { downloadPdf } from '@/lib/utils/export';
import {
  usePurchaseOrder,
  usePurchaseOrderLines,
  useAddPurchaseOrderLine,
  useUpdatePurchaseOrderLine,
  useDeletePurchaseOrderLine,
  useUpdatePurchaseOrderStatus,
  useDeletePurchaseOrder,
  useItems,
} from '@/lib/queries';
import type { PurchaseOrderStatus, PurchaseOrderLine } from '@nerva/shared';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showAddLine, setShowAddLine] = useState(false);

  const { data: po, isLoading } = usePurchaseOrder(id);
  const { data: lines } = usePurchaseOrderLines(id);
  const deletePurchaseOrder = useDeletePurchaseOrder();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">Purchase Order not found</h2>
        <Link href="/procurement/purchase-orders" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Purchase Orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      {/* Header */}
      <div className="bg-purple-700 text-white p-6 rounded-lg mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{po.poNo}</h1>
              <StatusBadge status={po.status as PurchaseOrderStatus} />
            </div>
            <p className="text-purple-100 text-sm mt-1">
              {po.supplierName}
            </p>
          </div>
          <div className="flex gap-2 items-start">
            <Button
              variant="secondary"
              onClick={() => downloadPdf(`/purchase-orders/${id}/pdf`, `PO-${po.poNo}.pdf`)}
              className="print:hidden bg-white text-purple-700 hover:bg-purple-50"
            >
              <DownloadIcon />
              Download PDF
            </Button>
            <StatusActions po={po} />
            {po.status === 'DRAFT' && (
              <Button
                variant="secondary"
                className="bg-red-100 text-red-700 hover:bg-red-200"
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete this draft purchase order? This action cannot be undone.')) return;
                  try {
                    await deletePurchaseOrder.mutateAsync(id);
                    router.push('/procurement/purchase-orders');
                  } catch (error) {
                    console.error('Failed to delete purchase order:', error);
                  }
                }}
                disabled={deletePurchaseOrder.isPending}
              >
                {deletePurchaseOrder.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Order Date</div>
            <div className="font-medium">{new Date(po.orderDate).toLocaleDateString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Expected Date</div>
            <div className="font-medium">
              {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Ship To</div>
            <div className="font-medium">{po.warehouseName || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">Total Amount</div>
            <div className="font-medium text-lg">
              R {po.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Lines */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Lines</CardTitle>
          {po.status === 'DRAFT' && (
            <Button onClick={() => setShowAddLine(true)}>Add Line</Button>
          )}
        </CardHeader>
        <CardContent>
          {showAddLine && (
            <AddLineForm
              purchaseOrderId={id}
              onCancel={() => setShowAddLine(false)}
              onSuccess={() => setShowAddLine(false)}
            />
          )}

          {lines && lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Qty Ordered</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Qty Received</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Unit Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Line Total</th>
                    {po.status === 'DRAFT' && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {lines.map((line) => (
                    <OrderLineRow
                      key={line.id}
                      line={line}
                      purchaseOrderId={id}
                      editable={po.status === 'DRAFT'}
                    />
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={po.status === 'DRAFT' ? 5 : 4} className="px-4 py-3 text-right text-sm font-medium">
                      Subtotal:
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      R {po.subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    {po.status === 'DRAFT' && <td />}
                  </tr>
                  <tr>
                    <td colSpan={po.status === 'DRAFT' ? 5 : 4} className="px-4 py-3 text-right text-sm font-medium">
                      VAT (15%):
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      R {po.taxAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    {po.status === 'DRAFT' && <td />}
                  </tr>
                  <tr>
                    <td colSpan={po.status === 'DRAFT' ? 5 : 4} className="px-4 py-3 text-right text-sm font-bold">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      R {po.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                    {po.status === 'DRAFT' && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            !showAddLine && (
              <div className="text-center py-8 text-slate-500">
                <p>No lines added yet.</p>
                {po.status === 'DRAFT' && (
                  <Button className="mt-4" onClick={() => setShowAddLine(true)}>
                    Add First Line
                  </Button>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {po.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{po.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <EntityHistory entityType="PurchaseOrder" entityId={id} />
    </div>
  );
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const variants: Record<PurchaseOrderStatus, 'success' | 'warning' | 'danger' | 'default'> = {
    DRAFT: 'default',
    SENT: 'warning',
    CONFIRMED: 'success',
    PARTIAL: 'warning',
    RECEIVED: 'success',
    CANCELLED: 'danger',
  };

  return <Badge variant={variants[status]} className="text-white bg-opacity-30">{status}</Badge>;
}

function StatusActions({ po }: { po: { id: string; status: string } }) {
  const updateStatus = useUpdatePurchaseOrderStatus();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: po.id, status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  switch (po.status) {
    case 'DRAFT':
      return (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="bg-white text-purple-700 hover:bg-purple-50"
            onClick={() => handleStatusChange('SENT')}
            disabled={updateStatus.isPending}
          >
            Send to Supplier
          </Button>
          <Button
            variant="secondary"
            className="bg-red-100 text-red-700 hover:bg-red-200"
            onClick={() => handleStatusChange('CANCELLED')}
            disabled={updateStatus.isPending}
          >
            Cancel
          </Button>
        </div>
      );
    case 'SENT':
      return (
        <Button
          variant="secondary"
          className="bg-white text-purple-700 hover:bg-purple-50"
          onClick={() => handleStatusChange('CONFIRMED')}
          disabled={updateStatus.isPending}
        >
          Mark Confirmed
        </Button>
      );
    case 'CONFIRMED':
      return (
        <Button
          variant="secondary"
          className="bg-white text-purple-700 hover:bg-purple-50"
          onClick={() => handleStatusChange('RECEIVED')}
          disabled={updateStatus.isPending}
        >
          Mark Received
        </Button>
      );
    default:
      return null;
  }
}

function AddLineForm({
  purchaseOrderId,
  onCancel,
  onSuccess,
}: {
  purchaseOrderId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    itemId: '',
    qtyOrdered: '',
    unitCost: '',
  });

  const { data: itemsData } = useItems({ page: 1, limit: 100 });
  const addLine = useAddPurchaseOrderLine(purchaseOrderId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId || !formData.qtyOrdered) return;

    try {
      await addLine.mutateAsync({
        itemId: formData.itemId,
        qtyOrdered: parseFloat(formData.qtyOrdered),
        unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add line:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-md p-4 mb-4 bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="itemId">Item *</Label>
          <select
            id="itemId"
            value={formData.itemId}
            onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            required
          >
            <option value="">Select item...</option>
            {itemsData?.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sku} - {item.description}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="qtyOrdered">Quantity *</Label>
          <Input
            id="qtyOrdered"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.qtyOrdered}
            onChange={(e) => setFormData({ ...formData, qtyOrdered: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="unitCost">Unit Cost</Label>
          <Input
            id="unitCost"
            type="number"
            step="0.01"
            min="0"
            value={formData.unitCost}
            onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
            placeholder="R 0.00"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={addLine.isPending}>
            {addLine.isPending ? 'Adding...' : 'Add'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function OrderLineRow({
  line,
  purchaseOrderId,
  editable,
}: {
  line: PurchaseOrderLine;
  purchaseOrderId: string;
  editable: boolean;
}) {
  const deleteLine = useDeletePurchaseOrderLine(purchaseOrderId);

  const handleDelete = async () => {
    if (confirm('Delete this line?')) {
      try {
        await deleteLine.mutateAsync(line.id);
      } catch (error) {
        console.error('Failed to delete line:', error);
      }
    }
  };

  return (
    <tr>
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
        {line.itemSku}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
        {line.itemDescription}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
        {line.qtyOrdered}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
        {line.qtyReceived}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right">
        {line.unitCost ? `R ${line.unitCost.toFixed(2)}` : '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 text-right">
        {line.lineTotal ? `R ${line.lineTotal.toFixed(2)}` : '-'}
      </td>
      {editable && (
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800"
            disabled={deleteLine.isPending}
          >
            <TrashIcon />
          </button>
        </td>
      )}
    </tr>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}
