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
  gray: 'bg-gray-100 text-gray-400',
  blue: 'bg-blue-50 text-blue-500',
  green: 'bg-green-50 text-green-500',
  red: 'bg-red-50 text-red-500',
  yellow: 'bg-yellow-50 text-yellow-500',
  purple: 'bg-purple-50 text-purple-500',
  orange: 'bg-orange-50 text-orange-500',
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
