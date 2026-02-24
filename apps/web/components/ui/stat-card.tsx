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
  className?: string;
}

const borderColors: Record<IconColor, string> = {
  gray: 'border-l-slate-400',
  blue: 'border-l-blue-500',
  green: 'border-l-emerald-500',
  red: 'border-l-red-500',
  yellow: 'border-l-amber-500',
  purple: 'border-l-violet-500',
  orange: 'border-l-orange-500',
};

const subtitleColors = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-slate-400',
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
  className,
}: StatCardProps) {
  const showEmpty = value === 0 && emptyHint;
  const isNumeric = typeof value === 'number';

  const content = (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/70 border-l-[3px] shadow-sm p-5 bg-white',
        'hover:shadow-md hover:-translate-y-0.5 transition-all',
        alert ? 'border-l-red-500' : borderColors[iconColor],
        href && 'cursor-pointer',
        className,
      )}
    >
      {icon && (
        <div className="mb-3">
          <IconBadge icon={icon} color={alert ? 'red' : iconColor} size="sm" />
        </div>
      )}
      <p className="text-2xl font-bold text-slate-900">
        {isNumeric ? (
          <AnimatedNumber value={value} duration={400} />
        ) : (
          value
        )}
      </p>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{title}</p>
      {showEmpty ? (
        <p className="text-xs text-slate-400 mt-1">{emptyHint}</p>
      ) : subtitle ? (
        <p className={cn('text-xs mt-1', subtitleColors[subtitleType])}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
