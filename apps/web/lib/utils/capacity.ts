import type { BadgeVariant } from '@/components/ui/badge';

// Green < 75%, amber 75-90%, red > 90%. Hardcoded for now; a configurable
// thresholds setting is a fast-follow, not needed for the first version.
const AMBER_THRESHOLD = 75;
const RED_THRESHOLD = 90;

export function getUtilizationVariant(utilizationPct: number): BadgeVariant {
  if (utilizationPct > RED_THRESHOLD) return 'danger';
  if (utilizationPct >= AMBER_THRESHOLD) return 'warning';
  return 'success';
}

export function getUtilizationBarColor(utilizationPct: number): string {
  if (utilizationPct > RED_THRESHOLD) return 'bg-red-500';
  if (utilizationPct >= AMBER_THRESHOLD) return 'bg-amber-500';
  return 'bg-green-500';
}
