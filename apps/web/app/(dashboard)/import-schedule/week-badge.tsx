'use client';

import { useState } from 'react';
import { getIsoWeek } from '@nerva/shared';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface WeekBadgeProps {
  weekStartDate: string | null;
  weekEndDate: string | null;
  onChange: (weekStartDate: string, weekEndDate: string) => void;
  disabled?: boolean;
}

export function WeekBadge({ weekStartDate, weekEndDate, onChange, disabled }: WeekBadgeProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(weekStartDate ? weekStartDate.slice(0, 10) : '');
  const [end, setEnd] = useState(weekEndDate ? weekEndDate.slice(0, 10) : '');

  const label = weekStartDate ? getIsoWeek(new Date(weekStartDate)) : null;

  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      setStart(weekStartDate ? weekStartDate.slice(0, 10) : '');
      setEnd(weekEndDate ? weekEndDate.slice(0, 10) : '');
    }
    setOpen((prev) => !prev);
  };

  const handleSave = () => {
    if (!start || !end) return;
    onChange(start, end);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex flex-col items-start gap-0.5 rounded-md border-2 border-green-500 bg-green-50 px-2.5 py-1.5 text-left min-w-[150px] disabled:opacity-60"
      >
        <div className="flex items-center justify-between w-full gap-2">
          <span className="text-xs font-bold text-green-800">
            📅 {label ? `Week ${label.week} ${label.year}` : 'No week set'}
          </span>
          <span className="text-xs text-green-800">{open ? '▲' : '▼'}</span>
        </div>
        {weekStartDate && weekEndDate && (
          <span className="text-[11px] text-green-700">
            {formatDate(weekStartDate)} – {formatDate(weekEndDate)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <label className="block text-xs font-medium text-slate-600 mb-1">Week Start</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full mb-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <label className="block text-xs font-medium text-slate-600 mb-1">Week End</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full mb-3 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!start || !end}>Save</Button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
