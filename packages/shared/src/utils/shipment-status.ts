import type { ImportShipmentStatus, ImportShipmentTransportMode } from '../types';

export const STATUS_LABELS: Record<ImportShipmentStatus, string> = {
  PLANNED_AIRFREIGHT: 'Planned Airfreight',
  PLANNED_SEAFREIGHT: 'Planned Seafreight',
  IN_TRANSIT_AIRFREIGHT: 'In Transit Air',
  AIR_CUSTOMS_CLEARANCE: 'Air Customs Clearance',
  IN_TRANSIT_ROADWAY: 'In Transit Road',
  IN_TRANSIT_SEAWAY: 'In Transit Sea',
  MOORED: 'Moored',
  BERTH_WORKING: 'Berth Working',
  BERTH_COMPLETE: 'Berth Complete',
  GATED_IN_PORT: 'Gated In Port',
  ARRIVED_PTA: 'Arrived PTA',
  ARRIVED_KLM: 'Arrived KLM',
  ARRIVED_OFFSITE: 'Arrived Offsite',
  DELAYED_PORT: 'Delayed - Port',
  DELAYED_CUSTOMS: 'Delayed - Customs',
  DELAYED_DOCUMENTS: 'Delayed - Documents',
  DELAYED_SUPPLIER: 'Delayed - Supplier',
  CANCELLED: 'Cancelled',
  UNLOADING: 'Unloading',
  INSPECTION_PENDING: 'Inspection Pending',
  INSPECTING: 'Inspecting',
  INSPECTION_FAILED: 'Inspection Failed',
  INSPECTION_PASSED: 'Inspection Passed',
  RECEIVING: 'Receiving',
  RECEIVED: 'Received',
  STORED: 'Stored',
  ARCHIVED: 'Archived',
};

export const ALL_IMPORT_SHIPMENT_STATUSES = Object.keys(STATUS_LABELS) as ImportShipmentStatus[];

export const DELAYED_STATUSES: ImportShipmentStatus[] = [
  'DELAYED_PORT',
  'DELAYED_CUSTOMS',
  'DELAYED_DOCUMENTS',
  'DELAYED_SUPPLIER',
];

export const IN_TRANSIT_STATUSES: ImportShipmentStatus[] = [
  'PLANNED_AIRFREIGHT',
  'PLANNED_SEAFREIGHT',
  'IN_TRANSIT_AIRFREIGHT',
  'AIR_CUSTOMS_CLEARANCE',
  'IN_TRANSIT_ROADWAY',
  'IN_TRANSIT_SEAWAY',
  'MOORED',
  'BERTH_WORKING',
  'BERTH_COMPLETE',
  'GATED_IN_PORT',
  ...DELAYED_STATUSES,
];

export const POST_ARRIVAL_STATUSES: ImportShipmentStatus[] = [
  'ARRIVED_PTA',
  'ARRIVED_KLM',
  'ARRIVED_OFFSITE',
  'UNLOADING',
  'INSPECTION_PENDING',
  'INSPECTING',
  'INSPECTION_PASSED',
  'INSPECTION_FAILED',
  'RECEIVING',
  'RECEIVED',
];

export const PRE_ARRIVAL_STATUSES: ImportShipmentStatus[] = [
  'PLANNED_AIRFREIGHT',
  'PLANNED_SEAFREIGHT',
  'IN_TRANSIT_AIRFREIGHT',
  'AIR_CUSTOMS_CLEARANCE',
  'IN_TRANSIT_ROADWAY',
  'IN_TRANSIT_SEAWAY',
  'MOORED',
  'BERTH_WORKING',
  'BERTH_COMPLETE',
  'GATED_IN_PORT',
];

export const SHIPPING_EXCLUDED_STATUSES: ImportShipmentStatus[] = [
  ...POST_ARRIVAL_STATUSES,
  'STORED',
  'ARCHIVED',
];

const PROGRESS_STAGES: Partial<Record<ImportShipmentStatus, number>> = {
  PLANNED_AIRFREIGHT: 1,
  PLANNED_SEAFREIGHT: 1,
  IN_TRANSIT_AIRFREIGHT: 2,
  IN_TRANSIT_ROADWAY: 2,
  IN_TRANSIT_SEAWAY: 2,
  AIR_CUSTOMS_CLEARANCE: 2,
  MOORED: 3,
  BERTH_WORKING: 3,
  BERTH_COMPLETE: 3,
  GATED_IN_PORT: 3,
  ARRIVED_PTA: 4,
  ARRIVED_KLM: 4,
  ARRIVED_OFFSITE: 4,
  RECEIVED: 5,
  STORED: 5,
  ARCHIVED: 5,
};

/**
 * Delayed/cancelled/inspection/receiving/unloading statuses are deliberately
 * unmapped (current: 0), matching the legacy app's behavior — the UI should
 * render those as a distinct badge rather than an "X/5" progress dot.
 */
export function getShippingProgress(status: ImportShipmentStatus): { current: number; total: number } {
  return { current: PROGRESS_STAGES[status] ?? 0, total: 5 };
}

export function isAirfreightStatus(status: ImportShipmentStatus): boolean {
  return status === 'PLANNED_AIRFREIGHT' || status === 'IN_TRANSIT_AIRFREIGHT' || status === 'AIR_CUSTOMS_CLEARANCE';
}

export interface ForwardingAgentOption {
  value: string;
  label: string;
}

export const AIRFREIGHT_AGENTS: ForwardingAgentOption[] = [
  { value: 'Emirates SkyCargo', label: 'Emirates SkyCargo' },
  { value: 'Qatar Airways Cargo', label: 'Qatar Airways Cargo' },
  { value: 'Lufthansa Cargo', label: 'Lufthansa Cargo' },
  { value: 'Singapore Airlines Cargo', label: 'Singapore Airlines Cargo' },
  { value: 'Korean Air Cargo', label: 'Korean Air Cargo' },
  { value: 'Turkish Airlines Cargo', label: 'Turkish Airlines Cargo' },
  { value: 'Cathay Pacific Cargo', label: 'Cathay Pacific Cargo' },
  { value: 'British Airways World Cargo', label: 'British Airways World Cargo' },
  { value: 'Air France-KLM Cargo', label: 'Air France-KLM Cargo' },
  { value: 'Ethiopian Airlines Cargo', label: 'Ethiopian Airlines Cargo' },
  { value: 'SAA Cargo', label: 'SAA Cargo' },
  { value: 'Kenya Airways Cargo', label: 'Kenya Airways Cargo' },
];

export const SEAFREIGHT_AGENTS: ForwardingAgentOption[] = [
  { value: 'DHL', label: 'DHL' },
  { value: 'DSV', label: 'DSV' },
  { value: 'Afrigistics', label: 'Afrigistics' },
  { value: 'MSC', label: 'MSC' },
  { value: 'COSCO', label: 'COSCO' },
  { value: 'ONE', label: 'ONE' },
  { value: 'Hapag-Lloyd', label: 'Hapag-Lloyd' },
  { value: 'Maersk', label: 'Maersk' },
  { value: 'CMA CGM', label: 'CMA CGM' },
  { value: 'Evergreen', label: 'Evergreen' },
  { value: 'Yang Ming', label: 'Yang Ming' },
  { value: 'HMM', label: 'HMM' },
  { value: 'OOCL', label: 'OOCL' },
];

export function getForwardingAgents(transportMode: string): ForwardingAgentOption[] {
  return transportMode === 'AIR' ? AIRFREIGHT_AGENTS : SEAFREIGHT_AGENTS;
}

/**
 * External deep-link to look up an AWB (track-trace.com) or vessel name
 * (VesselFinder), matching the tracking link from the legacy import-schedule app.
 */
export function getVesselTrackingUrl(
  transportMode: ImportShipmentTransportMode,
  vesselOrAwb: string
): string | null {
  const trimmed = vesselOrAwb.trim();
  if (!trimmed) return null;

  if (transportMode === 'AIR') {
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return null;
    return `https://www.track-trace.com/aircargo?awb=${encodeURIComponent(digits)}`;
  }

  return `https://www.vesselfinder.com/vessels?name=${encodeURIComponent(trimmed)}`;
}

/**
 * ISO 8601 week number + year for a given date, used only to label the Week
 * badge on the shipping schedule table (e.g. "Week 30 2026"). The stored and
 * edited values remain the real weekStartDate/weekEndDate on the line.
 */
export function getIsoWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export interface InspectionReasonOption {
  value: string;
  label: string;
}

/** Structured reasons for a failed/on-hold inspection outcome. */
export const INSPECTION_FAILURE_REASONS: InspectionReasonOption[] = [
  { value: 'NO_COA', label: 'No COA' },
  { value: 'SUPPLIER_NOT_APPROVED', label: 'Supplier Not Approved' },
  { value: 'DAMAGED_STOCK', label: 'Damaged Stock' },
  { value: 'EXPIRED_STOCK', label: 'Expired Stock' },
  { value: 'NON_COMPLIANT_DOCUMENTATION', label: 'Non-Compliant Documentation' },
  { value: 'PENDING_RESULTS', label: 'Pending Results (On Hold)' },
  { value: 'AWAITING_COA', label: 'Awaiting COA (On Hold)' },
  { value: 'OTHER', label: 'Other' },
];

export const INSPECTION_FAILURE_REASON_VALUES = INSPECTION_FAILURE_REASONS.map((r) => r.value);
