'use client';

import { getShippingProgress } from '@nerva/shared';
import type { ImportShipmentStatus } from '@nerva/shared';

interface ProgressDotsProps {
  status: ImportShipmentStatus;
  isDelayed: boolean;
  isCancelled: boolean;
}

export function ProgressDots({ status, isDelayed, isCancelled }: ProgressDotsProps) {
  if (isDelayed || isCancelled) {
    return (
      <span className={`text-xs font-semibold ${isDelayed ? 'text-red-600' : 'text-slate-500'}`}>
        {isDelayed ? 'DELAYED' : 'CANCELLED'}
      </span>
    );
  }

  const progress = getShippingProgress(status);

  return (
    <div className="flex items-center gap-1.5 min-w-[90px]">
      <div className="flex gap-0.5 flex-1">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full ${step <= progress.current ? 'bg-primary-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-500 whitespace-nowrap">
        {progress.current}/{progress.total}
      </span>
    </div>
  );
}
