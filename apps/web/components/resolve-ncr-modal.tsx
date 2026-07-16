'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

const OUTCOME_OPTIONS = [
  { value: '', label: 'Select outcome...' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ACCEPTED_WITH_CONCESSION', label: 'Accepted with Concession' },
];

export interface ResolveNcrFormData {
  outcome: 'ACCEPTED' | 'REJECTED' | 'ACCEPTED_WITH_CONCESSION';
  rootCause: string;
  correctiveAction: string;
  resolution: string;
}

interface ResolveNcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ResolveNcrFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function ResolveNcrModal({ isOpen, onClose, onSubmit, isSubmitting }: ResolveNcrModalProps) {
  const [outcome, setOutcome] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setOutcome('');
    setRootCause('');
    setCorrectiveAction('');
    setResolution('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!outcome || !rootCause.trim() || !correctiveAction.trim() || !resolution.trim()) {
      setError('All fields are required to resolve an NCR');
      return;
    }
    setError('');
    await onSubmit({
      outcome: outcome as ResolveNcrFormData['outcome'],
      rootCause: rootCause.trim(),
      correctiveAction: correctiveAction.trim(),
      resolution: resolution.trim(),
    });
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Resolve NCR" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Outcome <span className="text-red-500">*</span>
          </label>
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value)} options={OUTCOME_OPTIONS} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Root Cause <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rootCause}
            onChange={(e) => setRootCause(e.target.value)}
            className="w-full h-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Why did this non-conformance happen?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Corrective / Preventive Action <span className="text-red-500">*</span>
          </label>
          <textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            className="w-full h-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="What is being done to fix this and prevent it recurring?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Conclusion <span className="text-red-500">*</span>
          </label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full h-20 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Summarize how this was resolved"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>Resolve NCR</Button>
        </div>
      </div>
    </Modal>
  );
}
