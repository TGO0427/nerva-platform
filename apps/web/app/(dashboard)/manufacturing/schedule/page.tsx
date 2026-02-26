'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { GanttChart, GanttWorkOrder } from '@/components/manufacturing/gantt-chart';
import { useWorkOrders, useRescheduleWorkOrder } from '@/lib/queries';
import type { WorkOrder } from '@nerva/shared';

type ViewMode = 'week' | 'month';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${startStr} - ${endStr}`;
}

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [baseDate, setBaseDate] = useState(() => startOfWeek(new Date()));
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);

  const { addToast } = useToast();
  const reschedule = useRescheduleWorkOrder();

  const rangeDays = viewMode === 'week' ? 7 : 30;
  const rangeStart = baseDate;
  const rangeEnd = addDays(baseDate, rangeDays);

  // Fetch active work orders (not completed or cancelled)
  const { data, isLoading } = useWorkOrders({
    page: 1,
    limit: 200,
  });

  const allWorkOrders = data?.data ?? [];

  // Filter to only those with planned dates and not completed/cancelled
  const scheduledOrders: GanttWorkOrder[] = useMemo(
    () =>
      allWorkOrders
        .filter(
          (wo) =>
            wo.plannedStart &&
            wo.status !== 'COMPLETED' &&
            wo.status !== 'CANCELLED'
        )
        .map((wo) => ({
          id: wo.id,
          workOrderNo: wo.workOrderNo,
          itemSku: (wo as WorkOrder & { itemSku?: string }).itemSku,
          status: wo.status,
          plannedStart: wo.plannedStart,
          plannedEnd: wo.plannedEnd,
        })),
    [allWorkOrders]
  );

  const selectedWo = useMemo(
    () => (selectedWoId ? allWorkOrders.find((wo) => wo.id === selectedWoId) : null),
    [selectedWoId, allWorkOrders]
  );

  const handlePrev = () => {
    setBaseDate((d) => addDays(d, -rangeDays));
  };

  const handleNext = () => {
    setBaseDate((d) => addDays(d, rangeDays));
  };

  const handleToday = () => {
    setBaseDate(viewMode === 'week' ? startOfWeek(new Date()) : new Date());
  };

  const handleReschedule = useCallback(
    async (id: string, plannedStart: string, plannedEnd: string) => {
      try {
        await reschedule.mutateAsync({ id, plannedStart, plannedEnd });
        addToast('Work order rescheduled', 'success');
      } catch {
        addToast('Failed to reschedule work order', 'error');
      }
    },
    [reschedule, addToast]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedWoId((prev) => (prev === id ? null : id));
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <Breadcrumbs />
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual timeline of work order scheduling. Drag bars to reschedule.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
          <Button variant="secondary" onClick={handleToday}>
            Today
          </Button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handlePrev}>
            <ChevronLeftIcon />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[200px] text-center">
            {formatDateRange(rangeStart, addDays(rangeEnd, -1))}
          </span>
          <Button variant="secondary" onClick={handleNext}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="relative">
        <GanttChart
          workOrders={scheduledOrders}
          startDate={rangeStart}
          endDate={rangeEnd}
          onReschedule={handleReschedule}
          onSelect={handleSelect}
        />
      </div>

      {/* Side Panel / Drawer */}
      {selectedWo && (
        <div
          className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-slate-200 z-50 transform transition-transform duration-300 ease-in-out translate-x-0"
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Work Order Details</h2>
            <button
              onClick={() => setSelectedWoId(null)}
              className="p-1 rounded hover:bg-slate-100 text-slate-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 65px)' }}>
            <div>
              <span className="text-sm text-slate-500">Work Order</span>
              <p className="text-lg font-bold text-slate-900">{selectedWo.workOrderNo}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">Product</span>
              <p className="font-medium text-slate-900">
                {(selectedWo as WorkOrder & { itemSku?: string }).itemSku || '-'}
              </p>
              <p className="text-sm text-slate-500">
                {(selectedWo as WorkOrder & { itemDescription?: string }).itemDescription || ''}
              </p>
            </div>
            <div>
              <span className="text-sm text-slate-500">Status</span>
              <div className="mt-1">
                <Badge variant={getStatusVariant(selectedWo.status)}>
                  {selectedWo.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-500">Qty Ordered</span>
                <p className="font-medium">{selectedWo.qtyOrdered.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Qty Completed</span>
                <p className="font-medium">{selectedWo.qtyCompleted.toLocaleString()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-500">Planned Start</span>
                <p className="font-medium">
                  {selectedWo.plannedStart
                    ? new Date(selectedWo.plannedStart).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Planned End</span>
                <p className="font-medium">
                  {selectedWo.plannedEnd
                    ? new Date(selectedWo.plannedEnd).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div>
              <span className="text-sm text-slate-500">Progress</span>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      selectedWo.qtyOrdered > 0
                        ? (selectedWo.qtyCompleted / selectedWo.qtyOrdered) * 100
                        : 0
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedWo.qtyOrdered > 0
                  ? `${Math.round((selectedWo.qtyCompleted / selectedWo.qtyOrdered) * 100)}%`
                  : '0%'}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Link href={`/manufacturing/work-orders/${selectedWo.id}`}>
                <Button className="w-full">View Full Details</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop when panel is open */}
      {selectedWo && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setSelectedWoId(null)}
        />
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'RELEASED':
      return 'info';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
