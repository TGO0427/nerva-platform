'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { INSPECTION_FAILURE_REASONS } from '@nerva/shared';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { passed: boolean; reason?: string; notes?: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const REASON_OPTIONS = [
  { value: '', label: 'Select a reason' },
  ...INSPECTION_FAILURE_REASONS.map((r) => ({ value: r.value, label: r.label })),
];

export function InspectionModal({ isOpen, onClose, onSubmit, isSubmitting }: InspectionModalProps) {
  const [passed, setPassed] = useState(true);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setPassed(true);
    setReason('');
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!passed && !reason) {
      setError('Please select a reason for the failed inspection');
      return;
    }
    setError('');
    await onSubmit({ passed, reason: passed ? undefined : reason, notes: notes || undefined });
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record Inspection Result" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Result</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPassed(true)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                passed ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 text-slate-600'
              }`}
            >
              Passed
            </button>
            <button
              type="button"
              onClick={() => setPassed(false)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                !passed ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300 text-slate-600'
              }`}
            >
              Failed
            </button>
          </div>
        </div>

        {!passed && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <Select value={reason} onChange={(e) => setReason(e.target.value)} options={REASON_OPTIONS} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Optional notes..."
          />
        </div>

        {!passed && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-md p-2">
            A Supplier NCR will be created automatically for this failure.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>Submit</Button>
        </div>
      </div>
    </Modal>
  );
}
