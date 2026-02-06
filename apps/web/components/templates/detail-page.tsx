'use client';

import { ReactNode, useState } from 'react';
import { PageShell, MetricGrid } from '@/components/ui/motion';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatCardProps } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface InfoCard {
  title: string;
  content: ReactNode;
}

interface Tab {
  id: string;
  label: string;
  badge?: number;
  content: ReactNode;
}

interface DetailPageTemplateProps {
  // Header
  title: string;
  subtitle?: string;
  titleBadges?: ReactNode;
  headerActions?: ReactNode;

  // Stats (optional)
  stats?: StatCardProps[];
  statsColumns?: 3 | 4 | 5;

  // Info cards (two-column layout)
  infoCards?: InfoCard[];

  // Tabs (optional)
  tabs?: Tab[];
  defaultTab?: string;

  // Main content (below tabs or standalone)
  children?: ReactNode;

  // Loading state
  isLoading?: boolean;

  // Not found state
  notFound?: boolean;
  notFoundMessage?: string;

  className?: string;
}

const columnClasses = {
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5',
};

export function DetailPageTemplate({
  title,
  subtitle,
  titleBadges,
  headerActions,
  stats,
  statsColumns = 5,
  infoCards,
  tabs,
  defaultTab,
  children,
  isLoading,
  notFound,
  notFoundMessage = 'Not found',
  className,
}: DetailPageTemplateProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.id);

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </PageShell>
    );
  }

  if (notFound) {
    return (
      <PageShell>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium text-gray-900">{notFoundMessage}</h2>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className={className}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        badges={titleBadges}
        actions={headerActions}
      />

      {stats && stats.length > 0 && (
        <MetricGrid className={cn('grid gap-4 mb-6', columnClasses[statsColumns])}>
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </MetricGrid>
      )}

      {infoCards && infoCards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {infoCards.map((card, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent>{card.content}</CardContent>
            </Card>
          ))}
        </div>
      )}

      {tabs && tabs.length > 0 && (
        <>
          <div className="border-b border-slate-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2',
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {tabs.find((t) => t.id === activeTab)?.content}
        </>
      )}

      {children}
    </PageShell>
  );
}
