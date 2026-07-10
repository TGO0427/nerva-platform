'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useSuppliers, useImportShipment, useUpdateImportShipment, UpdateImportShipmentData } from '@/lib/queries';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Supplier } from '@nerva/shared';

const TRANSPORT_MODE_OPTIONS = [
  { value: 'SEA', label: 'Sea' },
  { value: 'AIR', label: 'Air' },
  { value: 'ROAD', label: 'Road' },
];

export default function EditImportShipmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data: shipment, isLoading } = useImportShipment(params.id);
  const updateShipment = useUpdateImportShipment();

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

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);

  const { data: suppliersData, isLoading: suppliersLoading } = useSuppliers({
    page: 1,
    limit: 20,
    search: debouncedSupplierSearch || undefined,
  });
  const suppliers = suppliersData?.data || [];

  // Pre-populate form once the shipment loads
  useEffect(() => {
    if (!shipment) return;
    setReference(shipment.reference);
    setTransportMode(shipment.transportMode);
    setDestinationPort(shipment.destinationPort || '');
    setEtaDate(shipment.etaDate ? shipment.etaDate.slice(0, 10) : '');
    setCarrier(shipment.carrier || '');
    setVesselOrAwb(shipment.vesselOrAwb || '');
    setQuantity(shipment.quantity != null ? String(shipment.quantity) : '');
    setCbm(shipment.cbm != null ? String(shipment.cbm) : '');
    setPalletQty(shipment.palletQty != null ? String(shipment.palletQty) : '');
    setIncoterm(shipment.incoterm || '');
    setNotes(shipment.notes || '');
    if (shipment.supplierName) {
      setSelectedSupplier({ id: shipment.supplierId, name: shipment.supplierName } as Supplier);
    }
  }, [shipment]);

  const handleSelectSupplier = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSupplierSearch('');
    setShowSupplierDropdown(false);
  }, []);

  const handleClearSupplier = useCallback(() => {
    setSelectedSupplier(null);
    setSupplierSearch('');
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!shipment) {
    return <div className="text-center py-24 text-slate-500">Shipment not found</div>;
  }

  const handleSubmit = async () => {
    setError('');
    if (!reference.trim()) {
      setError('Please enter a reference');
      return;
    }

    const data: UpdateImportShipmentData = {
      reference: reference.trim(),
      supplierId: selectedSupplier?.id,
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
      await updateShipment.mutateAsync({ id: shipment.id, data });
      addToast('Shipment updated successfully', 'success');
      router.push(`/import-schedule/${shipment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shipment');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Shipment</h1>
          <p className="text-slate-500 mt-1">{shipment.reference}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push(`/import-schedule/${shipment.id}`)}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} isLoading={updateShipment.isPending}>
            Save Changes
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
                </div>
                <Button variant="secondary" size="sm" onClick={handleClearSupplier}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={supplierSearch}
                  onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Search suppliers by name or code..."
                  className="w-full"
                />
                {showSupplierDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {suppliersLoading ? (
                      <div className="p-4 text-center"><Spinner size="sm" /></div>
                    ) : suppliers.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">No suppliers found</div>
                    ) : (
                      suppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                          onClick={() => handleSelectSupplier(supplier)}
                        >
                          <div className="font-medium text-slate-900">{supplier.name}</div>
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
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transport Mode</label>
                <Select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value as 'AIR' | 'SEA' | 'ROAD')}
                  options={TRANSPORT_MODE_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ETA Date</label>
                <Input type="date" value={etaDate} onChange={(e) => setEtaDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination Port / Warehouse</label>
                <Input value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Carrier / Forwarding Agent</label>
                <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {transportMode === 'AIR' ? 'AWB Number' : 'Vessel Name'}
                </label>
                <Input value={vesselOrAwb} onChange={(e) => setVesselOrAwb(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CBM</label>
                <Input type="number" value={cbm} onChange={(e) => setCbm(e.target.value)} min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pallet Qty</label>
                <Input type="number" value={palletQty} onChange={(e) => setPalletQty(e.target.value)} min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Incoterm</label>
                <Input value={incoterm} onChange={(e) => setIncoterm(e.target.value)} />
              </div>
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-6">
          <Button variant="secondary" onClick={() => router.push(`/import-schedule/${shipment.id}`)}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} isLoading={updateShipment.isPending}>
            Save Changes
          </Button>
        </div>
      </div>

      {showSupplierDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setShowSupplierDropdown(false)} />
      )}
    </div>
  );
}
