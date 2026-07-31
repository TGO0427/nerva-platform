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
        <p className="text-sm text-text-muted dark:text-text-dark-muted mb-1">{greeting}</p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-primary dark:text-text-dark-primary">{title}</h1>
            {badges}
          </div>
          {subtitle && (
            <p className="text-text-muted dark:text-text-dark-muted mt-1">{subtitle}</p>
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
