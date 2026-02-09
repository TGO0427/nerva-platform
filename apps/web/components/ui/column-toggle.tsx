'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ColumnDef {
  key: string;
  header: React.ReactNode;
}

interface ColumnToggleProps {
  columns: ColumnDef[];
  visibleKeys: Set<string>;
  onToggle: (key: string) => void;
  onReset?: () => void;
  alwaysVisible?: string[];
  className?: string;
}

export function ColumnToggle({
  columns,
  visibleKeys,
  onToggle,
  onReset,
  alwaysVisible = [],
  className,
}: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const getHeaderText = (header: React.ReactNode): string => {
    if (typeof header === 'string') return header;
    if (typeof header === 'number') return String(header);
    return 'Column';
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5"
      >
        <ColumnsIcon />
        Columns
        <ChevronIcon open={open} />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Toggle columns
              </span>
              {onReset && (
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setOpen(false);
                  }}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="p-2 max-h-64 overflow-y-auto space-y-0.5">
            {columns.map(col => {
              const isAlwaysVisible = alwaysVisible.includes(col.key);
              const isChecked = visibleKeys.has(col.key);

              return (
                <label
                  key={col.key}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
                    isAlwaysVisible ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(col.key)}
                    disabled={isAlwaysVisible}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-slate-700">
                    {getHeaderText(col.header)}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-500">
            {visibleKeys.size} of {columns.length} visible
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
