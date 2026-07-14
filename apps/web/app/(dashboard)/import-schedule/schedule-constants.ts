import { DELAYED_STATUSES, POST_ARRIVAL_STATUSES } from '@nerva/shared';
import type { ImportShipmentStatus } from '@nerva/shared';

export const INCOTERM_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'EXW', label: 'EXW' },
  { value: 'FCA', label: 'FCA' },
  { value: 'CPT', label: 'CPT' },
  { value: 'CIP', label: 'CIP' },
  { value: 'DAP', label: 'DAP' },
  { value: 'DPU', label: 'DPU' },
  { value: 'DDP', label: 'DDP' },
  { value: 'FAS', label: 'FAS' },
  { value: 'FOB', label: 'FOB' },
  { value: 'CFR', label: 'CFR' },
  { value: 'CIF', label: 'CIF' },
];

export function getStatusSelectClass(status: ImportShipmentStatus): string {
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';
  if (DELAYED_STATUSES.includes(status)) return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  if (POST_ARRIVAL_STATUSES.includes(status) || status === 'STORED' || status === 'ARCHIVED') {
    return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200';
  }
  return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
}
