'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useWarehouses, useBins } from '@/lib/queries/warehouses';
import { useGrn } from '@/lib/queries/inventory';

interface StartReceivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { warehouseId?: string }) => Promise<void>;
  requiresWarehouse: boolean;
  isSubmitting?: boolean;
}

export function StartReceivingModal({
  isOpen,
  onClose,
  onSubmit,
  requiresWarehouse,
  isSubmitting,
}: StartReceivingModalProps) {
  const [warehouseId, setWarehouseId] = useState('');
  const [error, setError] = useState('');
  const { data: warehouses } = useWarehouses();

  const warehouseOptions = [
    { value: '', label: 'Select warehouse...' },
    ...(warehouses || []).map((w) => ({ value: w.id, label: w.code ? `${w.code} - ${w.name}` : w.name })),
  ];

  const handleClose = () => {
    setWarehouseId('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (requiresWarehouse && !warehouseId) {
      setError('Please select a warehouse');
      return;
    }
    setError('');
    await onSubmit({ warehouseId: warehouseId || undefined });
    setWarehouseId('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Start Receiving" size="sm">
      <div className="space-y-4">
        {requiresWarehouse ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Receiving Warehouse <span className="text-red-500">*</span>
            </label>
            <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouseOptions} />
            <p className="mt-1 text-xs text-slate-500">
              A GRN will be created in this warehouse for this line.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            This line has no linked item, so it will be received without a GRN — you&apos;ll capture quantity,
            bin location and any discrepancies directly on the shipment when receiving completes.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>Start Receiving</Button>
        </div>
      </div>
    </Modal>
  );
}

interface CompleteReceivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    receivedQty?: number;
    binId?: string;
    binLocation?: string;
    batchNo?: string;
    expiryDate?: string;
    discrepancyNotes?: string;
  }) => Promise<void>;
  grnId: string | null;
  isSubmitting?: boolean;
}

export function CompleteReceivingModal({
  isOpen,
  onClose,
  onSubmit,
  grnId,
  isSubmitting,
}: CompleteReceivingModalProps) {
  const [qty, setQty] = useState('');
  const [binId, setBinId] = useState('');
  const [binLocation, setBinLocation] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [error, setError] = useState('');

  const { data: grn } = useGrn(grnId || undefined);
  const { data: bins } = useBins(grn?.warehouseId);
  const receivingBins = (bins || []).filter((b) => b.binType === 'RECEIVING' || b.binType === 'STORAGE');
  const binOptions = [
    { value: '', label: 'Select bin...' },
    ...receivingBins.map((b) => ({ value: b.id, label: `${b.code} (${b.binType})` })),
  ];

  const reset = () => {
    setQty('');
    setBinId('');
    setBinLocation('');
    setBatchNo('');
    setExpiryDate('');
    setDiscrepancyNotes('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (grnId && (!qty || !binId)) {
      setError('Quantity and bin are required');
      return;
    }
    setError('');
    await onSubmit({
      receivedQty: qty ? Number(qty) : undefined,
      binId: grnId ? binId : undefined,
      binLocation: grnId ? undefined : (binLocation || undefined),
      batchNo: batchNo || undefined,
      expiryDate: expiryDate || undefined,
      discrepancyNotes: discrepancyNotes || undefined,
    });
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Complete Receiving" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity {grnId && <span className="text-red-500">*</span>}
            </label>
            <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          {grnId ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bin <span className="text-red-500">*</span>
              </label>
              <Select value={binId} onChange={(e) => setBinId(e.target.value)} options={binOptions} />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bin Location</label>
              <Input value={binLocation} onChange={(e) => setBinLocation(e.target.value)} placeholder="e.g. Rack A3" />
            </div>
          )}
        </div>

        {grnId && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch No</label>
              <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Discrepancy Notes</label>
          <textarea
            value={discrepancyNotes}
            onChange={(e) => setDiscrepancyNotes(e.target.value)}
            className="w-full h-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Optional — note any shortages, damage, etc."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>Complete Receiving</Button>
        </div>
      </div>
    </Modal>
  );
}
