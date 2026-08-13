'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const UOM_OPTIONS = [
  { value: 'EA', label: 'Each (EA)' },
  { value: 'BOX', label: 'Box (BOX)' },
  { value: 'CTN', label: 'Carton (CTN)' },
  { value: 'PAL', label: 'Pallet (PAL)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'L', label: 'Liter (L)' },
  { value: 'M', label: 'Meter (M)' },
  { value: 'M2', label: 'Square Meter (M2)' },
  { value: 'M3', label: 'Cubic Meter (M3)' },
];

export interface QuickCreateItemData {
  sku: string;
  description: string;
  uom: string;
}

interface QuickCreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuickCreateItemData) => Promise<void>;
  isSubmitting?: boolean;
}

export function QuickCreateItemModal({ isOpen, onClose, onSubmit, isSubmitting }: QuickCreateItemModalProps) {
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [uom, setUom] = useState('EA');
  const [error, setError] = useState('');

  const reset = () => {
    setSku('');
    setDescription('');
    setUom('EA');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!sku.trim() || !description.trim()) {
      setError('SKU and description are required');
      return;
    }
    if (sku.length > 50) {
      setError('SKU must be 50 characters or less');
      return;
    }
    setError('');
    await onSubmit({ sku: sku.trim(), description: description.trim(), uom });
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Product" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Creates a minimal item record so you can carry on here. Weight, dimensions,
          HS code, and batch tracking can be set later from Master Data &gt; Items.
        </p>

        <Input
          label="SKU *"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="e.g., PROD-001"
        />
        <Input
          label="Description *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter item description"
        />
        <Select
          label="Unit of Measure *"
          value={uom}
          onChange={(e) => setUom(e.target.value)}
          options={UOM_OPTIONS}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} isLoading={isSubmitting}>
            Create Product
          </Button>
        </div>
      </div>
    </Modal>
  );
}
