'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useSuppliers, useCreateImportShipment, CreateImportShipmentData } from '@/lib/queries';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Supplier } from '@nerva/shared';

const TRANSPORT_MODE_OPTIONS = [
  { value: 'SEA', label: 'Sea' },
  { value: 'AIR', label: 'Air' },
  { value: 'ROAD', label: 'Road' },
];

export default function NewImportShipmentPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const createShipment = useCreateImportShipment();

  const [reference, setReference] = useState('');
  const [transportMode, setTransportMode] = useState<'AIR' | 'SEA' | 'ROAD'>('SEA');
  const [destinationPort, setDestinationPort] = useState('');
  const [etaDate, setEtaDate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [vesselOrAwb, setVesselOrAwb] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cbm, setCbm] = useState('');
  const [palletQty, setPalletQty] = useState('');
  const [incoterm, setIncoterm] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);

  const { data: suppliersData, isLoading: suppliersLoading } = useSuppliers({
    page: 1,
    limit: 20,
    search: debouncedSupplierSearch || undefined,
  });
  const suppliers = suppliersData?.data || [];

  const handleSelectSupplier = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierSearch('');
    setShowSupplierDropdown(false);
    setError('');
  }, []);

  const handleClearSupplier = useCallback(() => {
    setSelectedSupplier(null);
    setSupplierSearch('');
  }, []);

  const validate = (): string | null => {
    if (!selectedSupplier) return 'Please select a supplier';
    if (!reference.trim()) return 'Please enter a reference';
    return null;
  };

  const handleSubmit = async () => {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const data: CreateImportShipmentData = {
      reference: reference.trim(),
      supplierId: selectedSupplier!.id,
      transportMode,
      carrier: carrier || undefined,
      vesselOrAwb: vesselOrAwb || undefined,
      destinationPort: destinationPort || undefined,
      etaDate: etaDate || undefined,
      quantity: quantity ? parseFloat(quantity) : undefined,
      cbm: cbm ? parseFloat(cbm) : undefined,
      palletQty: palletQty ? parseFloat(palletQty) : undefined,
      incoterm: incoterm || undefined,
      notes: notes || undefined,
    };

    try {
      const shipment = await createShipment.mutateAsync(data);
      addToast('Shipment created successfully', 'success');
      router.push(`/import-schedule/${shipment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Import Shipment</h1>
          <p className="text-slate-500 mt-1">Schedule an inbound shipment from a supplier</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/import-schedule')}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} isLoading={createShipment.isPending}>
            <CheckIcon />
            Create Shipment
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
            <CardTitle>Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSupplier ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">{selectedSupplier.name}</div>
                  {selectedSupplier.code && (
                    <div className="text-sm text-slate-500">{selectedSupplier.code}</div>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={handleClearSupplier}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Search suppliers by name or code..."
                  className="w-full"
                />
                {showSupplierDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {suppliersLoading ? (
                      <div className="p-4 text-center">
                        <Spinner size="sm" />
                      </div>
                    ) : suppliers.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        No suppliers found
                      </div>
                    ) : (
                      suppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                          onClick={() => handleSelectSupplier(supplier)}
                        >
                          <div className="font-medium text-slate-900">{supplier.name}</div>
                          {supplier.code && (
                            <div className="text-sm text-slate-500">{supplier.code}</div>
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
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference <span className="text-red-500">*</span>
                </label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="PO / order reference"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Transport Mode
                </label>
                <Select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value as 'AIR' | 'SEA' | 'ROAD')}
                  options={TRANSPORT_MODE_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ETA Date
                </label>
                <Input
                  type="date"
                  value={etaDate}
                  onChange={(e) => setEtaDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Destination Port / Warehouse
                </label>
                <Input
                  value={destinationPort}
                  onChange={(e) => setDestinationPort(e.target.value)}
                  placeholder="e.g. Durban, Cape Town"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Carrier / Forwarding Agent
                </label>
                <Input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {transportMode === 'AIR' ? 'AWB Number' : 'Vessel Name'}
                </label>
                <Input
                  value={vesselOrAwb}
                  onChange={(e) => setVesselOrAwb(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Quantity
                </label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  CBM
                </label>
                <Input
                  type="number"
                  value={cbm}
                  onChange={(e) => setCbm(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pallet Qty
                </label>
                <Input
                  type="number"
                  value={palletQty}
                  onChange={(e) => setPalletQty(e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Incoterm
                </label>
                <Input
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                  placeholder="e.g. FOB, CIF"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-6">
          <Button variant="secondary" onClick={() => router.push('/import-schedule')}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} isLoading={createShipment.isPending}>
            <CheckIcon />
            Create Shipment
          </Button>
        </div>
      </div>

      {showSupplierDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setShowSupplierDropdown(false)} />
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
