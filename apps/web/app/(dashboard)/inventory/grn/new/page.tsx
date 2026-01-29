'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { useWarehouses, useItems, useCreateGrn, CreateGrnData } from '@/lib/queries';
import type { Item } from '@nerva/shared';

interface GrnLineInput {
  id: string;
  itemId: string;
  itemSku: string;
  itemDescription: string;
  qtyExpected: number;
}

export default function NewGrnPage() {
  const router = useRouter();
  const { data: warehouses } = useWarehouses();
  const { data: itemsData } = useItems({ page: 1, limit: 100 });
  const createGrn = useCreateGrn();

  const [warehouseId, setWarehouseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<GrnLineInput[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qtyExpected, setQtyExpected] = useState('');
  const [error, setError] = useState('');

  const warehouseOptions = warehouses?.map(w => ({
    value: w.id,
    label: w.name,
  })) || [];

  const itemOptions = itemsData?.data?.map(i => ({
    value: i.id,
    label: `${i.sku} - ${i.description}`,
  })) || [];

  const lineColumns: Column<GrnLineInput>[] = [
    {
      key: 'itemSku',
      header: 'SKU',
      render: (row) => <span className="font-medium">{row.itemSku}</span>,
    },
    {
      key: 'itemDescription',
      header: 'Description',
    },
    {
      key: 'qtyExpected',
      header: 'Expected Qty',
      className: 'text-right',
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveLine(row.id)}
        >
          <XIcon />
        </Button>
      ),
    },
  ];

  const handleAddLine = () => {
    if (!selectedItemId || !qtyExpected) return;

    const item = itemsData?.data?.find(i => i.id === selectedItemId);
    if (!item) return;

    const newLine: GrnLineInput = {
      id: crypto.randomUUID(),
      itemId: selectedItemId,
      itemSku: item.sku,
      itemDescription: item.description,
      qtyExpected: parseInt(qtyExpected, 10),
    };

    setLines([...lines, newLine]);
    setSelectedItemId('');
    setQtyExpected('');
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handleSubmit = async () => {
    setError('');

    if (!warehouseId) {
      setError('Please select a warehouse');
      return;
    }

    if (lines.length === 0) {
      setError('Please add at least one item');
      return;
    }

    const data: CreateGrnData = {
      warehouseId,
      supplierId: supplierId || undefined,
      notes: notes || undefined,
      lines: lines.map(l => ({
        itemId: l.itemId,
        qtyExpected: l.qtyExpected,
      })),
    };

    try {
      const grn = await createGrn.mutateAsync(data);
      router.push(`/inventory/grn/${grn.id}`);
    } catch (err) {
      setError('Failed to create GRN. Please try again.');
      console.error('Failed to create GRN:', err);
    }
  };

  const totalExpected = lines.reduce((sum, l) => sum + l.qtyExpected, 0);

  return (
    <div>
      <Breadcrumbs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New GRN</h1>
          <p className="text-gray-500 mt-1">Create a new goods receipt note</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* GRN Details */}
          <Card>
            <CardHeader>
              <CardTitle>GRN Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse *
                </label>
                <Select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  options={[{ value: '', label: 'Select warehouse...' }, ...warehouseOptions]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Reference
                </label>
                <Input
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  placeholder="Optional supplier reference"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this receipt"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Items */}
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <Select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    options={[{ value: '', label: 'Select item...' }, ...itemOptions]}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={qtyExpected}
                    onChange={(e) => setQtyExpected(e.target.value)}
                    placeholder="Qty"
                    min={1}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={handleAddLine}
                  disabled={!selectedItemId || !qtyExpected}
                >
                  <PlusIcon />
                  Add
                </Button>
              </div>

              <DataTable
                columns={lineColumns}
                data={lines}
                keyField="id"
                emptyState={{
                  title: 'No items added',
                  description: 'Select an item and quantity above to add it to this GRN',
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary sidebar */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Line Items</span>
                <span className="font-medium">{lines.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Expected Qty</span>
                <span className="font-medium">{totalExpected}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Warehouse</span>
                <span className="font-medium">
                  {warehouses?.find(w => w.id === warehouseId)?.name || '-'}
                </span>
              </div>
              <hr />
              <Button
                className="w-full"
                onClick={handleSubmit}
                isLoading={createGrn.isPending}
                disabled={!warehouseId || lines.length === 0}
              >
                Create GRN
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/inventory/grn')}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
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

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
