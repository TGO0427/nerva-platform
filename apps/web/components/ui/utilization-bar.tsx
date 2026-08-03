import { cn } from '@/lib/utils';
import { getUtilizationBarColor } from '@/lib/utils/capacity';

interface UtilizationBarProps {
  utilizationPct: number;
  className?: string;
}

export function UtilizationBar({ utilizationPct, className }: UtilizationBarProps) {
  const clamped = Math.min(100, Math.max(0, utilizationPct));

  return (
    <div className={cn('h-2 w-full rounded-full bg-surface-secondary dark:bg-surface-dark-secondary', className)}>
      <div
        className={cn('h-2 rounded-full transition-all', getUtilizationBarColor(utilizationPct))}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
