'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { AnimatedNumber } from './animated-number';
import { IconBadge, IconColor } from './icon-badge';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  subtitleType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  iconColor?: IconColor;
  href?: string;
  alert?: boolean;
  emptyHint?: string;
  /** Optional trend sparkline, rendered under the value */
  sparkline?: number[];
  className?: string;
}

const subtitleColors = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-text-muted dark:text-text-dark-muted',
};

const sparklineColors: Record<IconColor, string> = {
  gray: '#667085',
  blue: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
  yellow: '#d97706',
  purple: '#7c3aed',
  orange: '#ea580c',
};

export function StatCard({
  title,
  value,
  subtitle,
  subtitleType = 'neutral',
  icon,
  iconColor = 'gray',
  href,
  alert = false,
  emptyHint,
  sparkline,
  className,
}: StatCardProps) {
  const showEmpty = value === 0 && emptyHint;
  const isNumeric = typeof value === 'number';

  const content = (
    <div
      className={cn(
        'relative min-h-[106px] rounded-lg border bg-surface-card dark:bg-surface-dark-card shadow-xs p-3',
        alert
          ? 'border-danger/40 dark:border-danger/40'
          : 'border-surface-border dark:border-surface-dark-border',
        href && 'hover:shadow-md hover:border-surface-border/80 dark:hover:border-surface-dark-border/80 transition-shadow',
        href && 'cursor-pointer',
        className,
      )}
    >
      {alert && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
      )}
      {icon && (
        <div className="mb-2">
          <IconBadge icon={icon} color={alert ? 'red' : iconColor} size="sm" />
        </div>
      )}
      <p className="truncate text-lg font-semibold text-text-primary dark:text-text-dark-primary" title={String(value)}>
        {isNumeric ? (
          <AnimatedNumber value={value} duration={400} />
        ) : (
          value
        )}
      </p>
      <p className="mt-0.5 truncate text-[10.5px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted" title={title}>{title}</p>
      {showEmpty ? (
        <p className="mt-0.5 truncate text-[10.5px] text-text-muted dark:text-text-dark-muted" title={emptyHint}>{emptyHint}</p>
      ) : subtitle ? (
        <p className={cn('mt-0.5 truncate text-[10.5px]', subtitleColors[subtitleType])} title={subtitle}>
          {subtitle}
        </p>
      ) : null}
      {sparkline && sparkline.length > 1 && (
        <div className="mt-2">
          <Sparkline data={sparkline} color={sparklineColors[alert ? 'red' : iconColor]} />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const width = 80;
  const height = 22;
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

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={areaD} fill={color} opacity="0.1" />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
