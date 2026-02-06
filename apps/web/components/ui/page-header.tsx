'use client';

import { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badges?: ReactNode;
  greeting?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  badges,
  greeting,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <Breadcrumbs />

      {greeting && (
        <p className="text-sm text-gray-500 mb-1">{greeting}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {badges}
          </div>
          {subtitle && (
            <p className="text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
