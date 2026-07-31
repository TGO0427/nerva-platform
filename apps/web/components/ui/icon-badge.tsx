'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IconColor = 'gray' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
export type IconSize = 'sm' | 'md' | 'lg';

interface IconBadgeProps {
  icon: ReactNode;
  color?: IconColor;
  size?: IconSize;
  className?: string;
}

const colorClasses: Record<IconColor, string> = {
  gray: 'bg-surface-secondary text-text-muted dark:bg-surface-dark-secondary dark:text-text-dark-muted',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  green: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
};

const sizeClasses: Record<IconSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function IconBadge({
  icon,
  color = 'gray',
  size = 'md',
  className,
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        'rounded-lg flex items-center justify-center flex-shrink-0',
        colorClasses[color],
        sizeClasses[size],
        className
      )}
    >
      {icon}
    </div>
  );
}
