'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent } from './card';
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

const subtitleColors = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-500',
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
    <Card hover={!!href} alert={alert} className={cn(href && 'cursor-pointer', className)}>
      <CardContent className="flex items-center justify-between pt-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {isNumeric ? (
              <AnimatedNumber value={value} duration={400} />
            ) : (
              value
            )}
          </p>
          {showEmpty ? (
            <p className="text-xs text-gray-400 mt-1">{emptyHint}</p>
          ) : subtitle ? (
            <p className={cn('text-sm mt-1', subtitleColors[subtitleType])}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {icon && (
          <IconBadge icon={icon} color={iconColor} />
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
