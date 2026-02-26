'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';

export interface GanttWorkOrder {
  id: string;
  workOrderNo: string;
  itemSku?: string;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
}

export interface GanttChartProps {
  workOrders: GanttWorkOrder[];
  startDate: Date;
  endDate: Date;
  onReschedule?: (id: string, plannedStart: string, plannedEnd: string) => void;
  onSelect?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-400',
  RELEASED: 'bg-blue-500',
  IN_PROGRESS: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

const STATUS_COLORS_HOVER: Record<string, string> = {
  DRAFT: 'hover:bg-slate-500',
  RELEASED: 'hover:bg-blue-600',
  IN_PROGRESS: 'hover:bg-amber-600',
  COMPLETED: 'hover:bg-emerald-600',
  CANCELLED: 'hover:bg-red-600',
};

const LABEL_WIDTH = 200;
const MIN_DAY_WIDTH = 30;
const BAR_HEIGHT = 28;
const ROW_HEIGHT = 40;

function getDaysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function GanttChart({
  workOrders,
  startDate,
  endDate,
  onReschedule,
  onSelect,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Drag state stored in ref to avoid re-renders during drag
  const dragStateRef = useRef<{
    isDragging: boolean;
    woId: string;
    startX: number;
    originalLeft: number;
    barWidth: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ id: string; offsetPx: number } | null>(null);

  const totalDays = useMemo(() => getDaysBetween(startDate, endDate), [startDate, endDate]);
  const dayWidth = useMemo(() => {
    const available = containerWidth - LABEL_WIDTH;
    return Math.max(MIN_DAY_WIDTH, available / totalDays);
  }, [containerWidth, totalDays]);

  // Measure container width
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Generate day columns
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, totalDays]);

  // Month markers
  const monthMarkers = useMemo(() => {
    const markers: { label: string; left: number }[] = [];
    let lastMonth = -1;
    days.forEach((day, i) => {
      if (day.getMonth() !== lastMonth) {
        lastMonth = day.getMonth();
        markers.push({
          label: getMonthLabel(day),
          left: i * dayWidth,
        });
      }
    });
    return markers;
  }, [days, dayWidth]);

  const getBarPosition = useCallback(
    (wo: GanttWorkOrder) => {
      if (!wo.plannedStart || !wo.plannedEnd) return null;
      const woStart = new Date(wo.plannedStart);
      const woEnd = new Date(wo.plannedEnd);
      const startOffset = getDaysBetween(startDate, woStart);
      const duration = Math.max(1, getDaysBetween(woStart, woEnd));
      return {
        left: startOffset * dayWidth,
        width: duration * dayWidth,
      };
    },
    [startDate, dayWidth]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, wo: GanttWorkOrder) => {
      if (!onReschedule) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = getBarPosition(wo);
      if (!pos) return;

      dragStateRef.current = {
        isDragging: true,
        woId: wo.id,
        startX: e.clientX,
        originalLeft: pos.left,
        barWidth: pos.width,
      };
      setDragOffset({ id: wo.id, offsetPx: 0 });

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragStateRef.current) return;
        const dx = ev.clientX - dragStateRef.current.startX;
        setDragOffset({ id: dragStateRef.current.woId, offsetPx: dx });
      };

      const handleMouseUp = (ev: MouseEvent) => {
        if (!dragStateRef.current) return;
        const dx = ev.clientX - dragStateRef.current.startX;
        const daysMoved = Math.round(dx / dayWidth);
        const state = dragStateRef.current;
        dragStateRef.current = null;
        setDragOffset(null);

        if (daysMoved !== 0) {
          const woData = workOrders.find((w) => w.id === state.woId);
          if (woData?.plannedStart && woData?.plannedEnd) {
            const newStart = addDays(new Date(woData.plannedStart), daysMoved);
            const newEnd = addDays(new Date(woData.plannedEnd), daysMoved);
            onReschedule(state.woId, formatDate(newStart), formatDate(newEnd));
          }
        }

        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [onReschedule, getBarPosition, dayWidth, workOrders]
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent, woId: string) => {
      // Only fire click if not dragging
      if (dragStateRef.current) return;
      e.stopPropagation();
      onSelect?.(woId);
    },
    [onSelect]
  );

  const timelineWidth = totalDays * dayWidth;
  const isToday = (day: Date) => {
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div ref={containerRef} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex border-b border-slate-200">
        {/* Label column header */}
        <div
          className="flex-shrink-0 border-r border-slate-200 bg-slate-50 px-3 py-2 font-medium text-sm text-slate-600"
          style={{ width: LABEL_WIDTH }}
        >
          Work Order
        </div>
        {/* Timeline header */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth }}>
            {/* Month markers */}
            <div className="relative h-6 bg-slate-50 border-b border-slate-100">
              {monthMarkers.map((marker, i) => (
                <div
                  key={i}
                  className="absolute top-0 text-xs font-medium text-slate-500 px-1 py-1"
                  style={{ left: marker.left }}
                >
                  {marker.label}
                </div>
              ))}
            </div>
            {/* Day headers */}
            <div className="flex">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 text-center text-xs py-1 border-r border-slate-100 ${
                    isToday(day)
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : day.getDay() === 0 || day.getDay() === 6
                        ? 'bg-slate-50 text-slate-400'
                        : 'text-slate-500'
                  }`}
                  style={{ width: dayWidth }}
                >
                  {day.getDate().toString().padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Labels */}
        <div
          className="flex-shrink-0 border-r border-slate-200 bg-white"
          style={{ width: LABEL_WIDTH }}
        >
          {workOrders.map((wo) => (
            <div
              key={wo.id}
              className="flex items-center px-3 border-b border-slate-100 text-sm truncate cursor-pointer hover:bg-slate-50"
              style={{ height: ROW_HEIGHT }}
              onClick={() => onSelect?.(wo.id)}
              title={wo.itemSku ? `${wo.workOrderNo} - ${wo.itemSku}` : wo.workOrderNo}
            >
              <span className="font-medium text-slate-900 truncate">{wo.workOrderNo}</span>
              {wo.itemSku && (
                <span className="ml-2 text-xs text-slate-400 truncate">{wo.itemSku}</span>
              )}
            </div>
          ))}
          {workOrders.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              No work orders
            </div>
          )}
        </div>

        {/* Timeline bars */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth }}>
            {workOrders.map((wo) => {
              const pos = getBarPosition(wo);
              const isDragging = dragOffset?.id === wo.id;
              const barLeft = pos
                ? pos.left + (isDragging ? dragOffset.offsetPx : 0)
                : 0;

              return (
                <div
                  key={wo.id}
                  className="relative border-b border-slate-100"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Day grid lines */}
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-r border-slate-50 ${
                        isToday(day) ? 'bg-blue-50/30' : ''
                      }`}
                      style={{ left: i * dayWidth, width: dayWidth }}
                    />
                  ))}

                  {/* Bar */}
                  {pos && (
                    <div
                      className={`absolute rounded-md shadow-sm cursor-pointer transition-shadow hover:shadow-md ${
                        STATUS_COLORS[wo.status] || 'bg-slate-400'
                      } ${STATUS_COLORS_HOVER[wo.status] || ''} ${
                        isDragging ? 'opacity-80 shadow-lg z-10' : ''
                      }`}
                      style={{
                        left: barLeft,
                        top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                        width: pos.width,
                        height: BAR_HEIGHT,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, wo)}
                      onClick={(e) => handleBarClick(e, wo.id)}
                      title={`${wo.workOrderNo} (${wo.status})`}
                    >
                      {pos.width > 60 && (
                        <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-medium truncate">
                          {wo.workOrderNo}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
