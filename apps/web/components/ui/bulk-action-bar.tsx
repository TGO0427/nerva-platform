'use client';

import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  children,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary-600 text-white text-xs font-medium flex items-center justify-center">
            {selectedCount > 99 ? '99+' : selectedCount}
          </div>
          <span className="text-sm font-medium text-primary-700">
            {selectedCount === 1 ? '1 item selected' : `${selectedCount} items selected`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-sm text-primary-600 hover:text-primary-800 hover:underline"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}
