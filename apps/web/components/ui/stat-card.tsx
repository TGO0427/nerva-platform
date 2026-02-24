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
  gray: 'border-b-slate-400',
  blue: 'border-b-blue-500',
  green: 'border-b-emerald-500',
  red: 'border-b-red-500',
  yellow: 'border-b-amber-500',
  purple: 'border-b-violet-500',
  orange: 'border-b-orange-500',
};

const bgTints: Record<IconColor, string> = {
  gray: 'bg-gradient-to-br from-slate-50/80 to-white',
  blue: 'bg-gradient-to-br from-blue-50/60 to-white',
  green: 'bg-gradient-to-br from-emerald-50/60 to-white',
  red: 'bg-gradient-to-br from-red-50/60 to-white',
  yellow: 'bg-gradient-to-br from-amber-50/60 to-white',
  purple: 'bg-gradient-to-br from-violet-50/60 to-white',
  orange: 'bg-gradient-to-br from-orange-50/60 to-white',
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
        'rounded-md border border-slate-200/70 border-b-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-2.5',
        'hover:shadow-md hover:-translate-y-0.5 transition-all',
        alert ? 'border-b-red-500 bg-gradient-to-br from-red-50/60 to-white' : cn(borderColors[iconColor], bgTints[iconColor]),
        href && 'cursor-pointer',
        className,
      )}
    >
      {icon && (
        <div className="mb-1.5">
          <IconBadge icon={icon} color={alert ? 'red' : iconColor} size="sm" />
        </div>
      )}
      <p className="text-lg font-bold text-slate-900">
        {isNumeric ? (
          <AnimatedNumber value={value} duration={400} />
        ) : (
          value
        )}
      </p>
      <p className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">{title}</p>
      {showEmpty ? (
        <p className="text-[10.5px] text-slate-400 mt-0.5">{emptyHint}</p>
      ) : subtitle ? (
        <p className={cn('text-[10.5px] mt-0.5', subtitleColors[subtitleType])}>
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
