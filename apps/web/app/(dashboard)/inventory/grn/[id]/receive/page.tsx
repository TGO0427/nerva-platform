'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, Column } from '@/components/ui/data-table';
import { useGrn, useGrnLines, useReceiveGrnLine, useItems, GrnLine } from '@/lib/queries';
import { useBins } from '@/lib/queries/warehouses';

export default function GrnReceivePage() {
  const params = useParams();
  const router = useRouter();
  const grnId = params.id as string;

  const { data: grn, isLoading: grnLoading } = useGrn(grnId);
  const { data: lines, isLoading: linesLoading, refetch: refetchLines } = useGrnLines(grnId);
  const { data: itemsData } = useItems({ page: 1, limit: 100 });
  const { data: bins } = useBins(grn?.warehouseId);
  const receiveGrnLine = useReceiveGrnLine();

  const [formData, setFormData] = useState({
    itemId: '',
    qtyReceived: '',
    batchNo: '',
    expiryDate: '',
    receivingBinId: '',
  });
  const [error, setError] = useState('');

  const items = itemsData?.data || [];
  const receivingBins = bins?.filter(b => b.binType === 'RECEIVING' || b.binType === 'STORAGE') || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.itemId || !formData.qtyReceived || !formData.receivingBinId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await receiveGrnLine.mutateAsync({
        grnId,
        data: {
          itemId: formData.itemId,
          qtyReceived: parseInt(formData.qtyReceived, 10),
          batchNo: formData.batchNo || undefined,
          expiryDate: formData.expiryDate || undefined,
          receivingBinId: formData.receivingBinId,
        },
      });

      // Reset form but keep bin selected
      setFormData(prev => ({
        itemId: '',
        qtyReceived: '',
        batchNo: '',
        expiryDate: '',
        receivingBinId: prev.receivingBinId,
      }));

      // Refetch lines
      refetchLines();
    } catch (err) {
      setError('Failed to receive item. Please try again.');
      console.error(err);
    }
  };

  const lineColumns: Column<GrnLine>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => <span className="font-medium">{row.itemSku || row.itemId.slice(0, 8)}</span>,
    },
    {
      key: 'qtyReceived',
      header: 'Qty',
      className: 'text-right',
    },
    {
      key: 'batchNo',
      header: 'Batch No',
      render: (row) => row.batchNo || '-',
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (row) => row.expiryDate ? new Date(row.expiryDate).toLocaleDateString() : '-',
    },
    {
      key: 'binCode',
      header: 'Bin',
      render: (row) => row.binCode || '-',
    },
  ];

  if (grnLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-slate-900">GRN not found</h2>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Receive: {grn.grnNo}</h1>
            <Badge variant="info">{grn.status}</Badge>
          </div>
          <p className="text-slate-500 mt-1">Scan or enter items to receive</p>
        </div>
        <Button variant="secondary" onClick={() => router.push(`/inventory/grn/${grnId}`)}>
          Back to GRN
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receive Form */}
        <Card>
          <CardHeader>
            <CardTitle>Receive Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Item <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.itemId}
                  onChange={(e) => setFormData(prev => ({ ...prev, itemId: e.target.value }))}
                  options={[
                    { label: 'Select item...', value: '' },
                    ...items.map(item => ({ label: `${item.sku} - ${item.description}`, value: item.id })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.qtyReceived}
                  onChange={(e) => setFormData(prev => ({ ...prev, qtyReceived: e.target.value }))}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Batch / Expiry Tracking</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Batch Number
                    </label>
                    <Input
                      type="text"
                      value={formData.batchNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                      placeholder="e.g., BTH-2024-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Expiry Date
                    </label>
                    <Input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                    <p className="text-xs text-slate-500 mt-1">Required for FEFO allocation</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Receiving Bin <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.receivingBinId}
                  onChange={(e) => setFormData(prev => ({ ...prev, receivingBinId: e.target.value }))}
                  options={[
                    { label: 'Select bin...', value: '' },
                    ...receivingBins.map(bin => ({ label: `${bin.code} (${bin.binType})`, value: bin.id })),
                  ]}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={receiveGrnLine.isPending}
              >
                <PlusIcon />
                Receive Item
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Received Items List */}
        <Card>
          <CardHeader>
            <CardTitle>Received Items ({lines?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={lineColumns}
              data={lines || []}
              keyField="id"
              isLoading={linesLoading}
              emptyState={{
                title: 'No items received yet',
                description: 'Use the form to receive items',
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
