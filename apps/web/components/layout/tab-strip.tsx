'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { resolvePageTitle } from '@/lib/page-titles';

interface OpenTab {
  path: string;
  title: string;
}

const DASHBOARD_TAB: OpenTab = { path: '/dashboard', title: 'Dashboard' };

export function TabStrip() {
  const pathname = usePathname();
  const router = useRouter();
  const [tabs, setTabs] = useState<OpenTab[]>([DASHBOARD_TAB]);

  useEffect(() => {
    setTabs((prev) => {
      if (prev.some((tab) => tab.path === pathname)) return prev;
      return [...prev, { path: pathname, title: resolvePageTitle(pathname) }];
    });
  }, [pathname]);

  const closeTab = (path: string) => {
    setTabs((prev) => {
      const remaining = prev.filter((tab) => tab.path !== path);
      if (path === pathname) {
        const fallback = remaining[remaining.length - 1]?.path ?? DASHBOARD_TAB.path;
        router.push(fallback);
      }
      return remaining;
    });
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-1.5 dark:border-white/10 dark:bg-surface-dark">
      {tabs.map((tab) => {
        const isActive = tab.path === pathname;
        const closable = tab.path !== DASHBOARD_TAB.path;
        return (
          <button
            key={tab.path}
            onClick={() => router.push(tab.path)}
            className={cn(
              'group flex items-center gap-2 whitespace-nowrap rounded-t-md border border-b-0 px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'border-gray-200 bg-surface font-medium text-primary-active dark:border-white/10 dark:bg-surface-dark dark:text-primary-active'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-primary-subtitle/80 dark:hover:bg-white/5 dark:hover:text-white'
            )}
          >
            <span>{tab.title}</span>
            {closable && (
              <span
                role="button"
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.path);
                }}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <CloseIcon className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
