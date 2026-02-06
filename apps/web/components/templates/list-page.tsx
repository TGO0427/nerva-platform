'use client';

import { ReactNode } from 'react';
import { PageShell, MetricGrid } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatCardProps } from '@/components/ui/stat-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface ListPageTemplateProps {
  // Header
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;

  // Stats (optional)
  stats?: StatCardProps[];
  statsColumns?: 3 | 4 | 5;

  // Filters
  filters?: ReactNode;
  filterActions?: ReactNode;

  // Content
  children: ReactNode;

  // Loading state
  isLoading?: boolean;

  // Wrap table in card (default true)
  wrapInCard?: boolean;

  className?: string;
}

const columnClasses = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5',
};

export function ListPageTemplate({
  title,
  subtitle,
  headerActions,
  stats,
  statsColumns = 4,
  filters,
  filterActions,
  children,
  isLoading,
  wrapInCard = true,
  className,
}: ListPageTemplateProps) {
  if (isLoading) {
    return (
      <PageShell>
        <PageHeader title={title} subtitle={subtitle} actions={headerActions} />
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className={className}>
      <PageHeader title={title} subtitle={subtitle} actions={headerActions} />

      {stats && stats.length > 0 && (
        <MetricGrid className={cn('grid gap-4 mb-6', columnClasses[statsColumns])}>
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </MetricGrid>
      )}

      {wrapInCard ? (
        <Card>
          {(filters || filterActions) && (
            <CardHeader>
              <FilterBar actions={filterActions}>
                {filters}
              </FilterBar>
            </CardHeader>
          )}
          <CardContent className={filters || filterActions ? '' : 'pt-0'}>
            {children}
          </CardContent>
        </Card>
      ) : (
        <>
          {(filters || filterActions) && (
            <div className="mb-4">
              <FilterBar actions={filterActions}>
                {filters}
              </FilterBar>
            </div>
          )}
          {children}
        </>
      )}
    </PageShell>
  );
}
