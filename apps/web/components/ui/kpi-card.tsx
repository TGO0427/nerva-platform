import React from 'react';
import Link from 'next/link';

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

const toneCls: Record<Tone, string> = {
  neutral: '',
  blue: 'ring-1 ring-blue-200 bg-blue-50/20',
  green: 'ring-1 ring-emerald-200 bg-emerald-50/20',
  amber: 'ring-1 ring-amber-200 bg-amber-50/20',
  red: 'ring-1 ring-red-200 bg-red-50/20',
};

const iconToneCls: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100/70 text-blue-700',
  green: 'bg-emerald-100/70 text-emerald-700',
  amber: 'bg-amber-100/70 text-amber-700',
  red: 'bg-red-100/70 text-red-700',
};

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  tone?: Tone;
  sparkline?: number[];
}

export function KpiCard({
  title,
  value,
  sub,
  icon,
  href,
  tone = 'neutral',
  sparkline,
}: KpiCardProps) {
  const CardContent = (
    <div
      className={[
        'rounded-2xl bg-white border border-slate-200/70 shadow-sm',
        'hover:shadow-md hover:-translate-y-0.5 transition-all',
        'p-5 flex items-start justify-between gap-4',
        toneCls[tone],
        href ? 'cursor-pointer hover:border-slate-300 active:scale-[0.99]' : '',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-600">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
        {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        {sparkline && sparkline.length > 0 && (
          <div className="mt-3">
            <Sparkline data={sparkline} tone={tone} />
          </div>
        )}
      </div>

      {icon && (
        <div
          className={[
            'h-11 w-11 rounded-2xl grid place-items-center flex-shrink-0',
            iconToneCls[tone],
          ].join(' ')}
        >
          {icon}
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{CardContent}</Link> : CardContent;
}

// Mini sparkline component
function Sparkline({ data, tone }: { data: number[]; tone: Tone }) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const strokeColors: Record<Tone, string> = {
    neutral: '#64748b',
    blue: '#3b82f6',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
  };

  const fillColors: Record<Tone, string> = {
    neutral: '#64748b',
    blue: '#3b82f6',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
  };

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={areaD} fill={fillColors[tone]} opacity="0.1" />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColors[tone]}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
