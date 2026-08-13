'use client';

import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange?: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, limit, total, totalPages } = meta;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (page > 3) pages.push('ellipsis');

      const rangeStart = Math.max(2, page - 1);
      const rangeEnd = Math.min(totalPages - 1, page + 1);

      for (let i = rangeStart; i <= rangeEnd; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (page < totalPages - 2) pages.push('ellipsis');

      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="bg-surface-card dark:bg-surface-dark-card px-4 py-3 flex items-center justify-between border-t border-surface-border dark:border-surface-dark-border sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary dark:text-text-dark-secondary">
            Showing <span className="font-medium">{formatNumber(start)}</span> to{' '}
            <span className="font-medium">{formatNumber(end)}</span> of{' '}
            <span className="font-medium">{formatNumber(total)}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-text-muted dark:text-text-dark-muted ring-1 ring-inset ring-surface-border dark:ring-surface-dark-border hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>

            {getPageNumbers().map((pageNum, idx) => (
              pageNum === 'ellipsis' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-text-secondary dark:text-text-dark-secondary ring-1 ring-inset ring-surface-border dark:ring-surface-dark-border"
                >
                  ...
                </span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={cn(
                    'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-surface-border dark:ring-surface-dark-border focus:z-20',
                    page === pageNum
                      ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                      : 'text-text-primary dark:text-text-dark-primary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary'
                  )}
                >
                  {pageNum}
                </button>
              )
            ))}

            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-text-muted dark:text-text-dark-muted ring-1 ring-inset ring-surface-border dark:ring-surface-dark-border hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile pagination */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange?.(page - 1)}
          disabled={page === 1}
          className="relative inline-flex items-center rounded-md border border-surface-border dark:border-surface-dark-border bg-surface-card dark:bg-surface-dark-card px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-dark-secondary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-text-secondary dark:text-text-dark-secondary self-center">
          Page {formatNumber(page)} of {formatNumber(totalPages)}
        </span>
        <button
          onClick={() => onPageChange?.(page + 1)}
          disabled={page === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-surface-border dark:border-surface-dark-border bg-surface-card dark:bg-surface-dark-card px-4 py-2 text-sm font-medium text-text-secondary dark:text-text-dark-secondary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
