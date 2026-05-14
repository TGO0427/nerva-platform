'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { SkeletonTable } from './skeleton';
import { EmptyState } from './empty-state';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  isLoading?: boolean;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onRowClick?: (row: T) => void;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    variant?: 'default' | 'dashed' | 'compact';
  };
  className?: string;
  /** When 'embedded', skips container styling (for use inside Card wrapper) */
  variant?: 'default' | 'embedded';
  /** Controls row padding for dense operational screens */
  density?: 'comfortable' | 'compact';
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Currently selected row IDs */
  selectedIds?: Set<string>;
  /** Called when selection changes */
  onSelectionChange?: (id: string) => void;
  /** Called when select all is toggled */
  onSelectAll?: () => void;
  /** Whether all rows on current page are selected */
  isAllSelected?: boolean;
  /** Whether some (but not all) rows are selected */
  isSomeSelected?: boolean;
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  isLoading = false,
  pagination,
  onPageChange,
  onSort,
  sortKey,
  sortOrder,
  onRowClick,
  emptyState,
  className,
  variant = 'default',
  density = 'comfortable',
  selectable = false,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  isAllSelected = false,
  isSomeSelected = false,
}: DataTableProps<T>) {
  const containerClass = variant === 'embedded'
    ? cn(className)
    : cn('bg-white rounded-2xl border border-slate-200 overflow-hidden', className);

  const getRowId = (row: T): string => String(row[keyField]);
  const isRowSelected = (row: T): boolean => selectedIds?.has(getRowId(row)) ?? false;
  const [localSortKey, setLocalSortKey] = useState<string | undefined>(sortKey);
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>(sortOrder || 'asc');
  const headerPadding = density === 'compact' ? 'px-4 py-2' : 'px-6 py-3';
  const cellPadding = density === 'compact' ? 'px-4 py-2.5' : 'px-6 py-4';

  const handleSort = (key: string) => {
    const newOrder = localSortKey === key && localSortOrder === 'asc' ? 'desc' : 'asc';
    setLocalSortKey(key);
    setLocalSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  const sortedData = useMemo(() => {
    if (!localSortKey || onSort) return data; // If external sort handler, don't sort locally

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[localSortKey];
      const bVal = (b as Record<string, unknown>)[localSortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return localSortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return localSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [data, localSortKey, localSortOrder, onSort]);

  const getCellValue = (row: T, column: Column<T>) => {
    if (column.render) {
      return column.render(row);
    }
    const value = (row as Record<string, unknown>)[column.key];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const getColumnAlign = (column: Column<T>) => {
    if (column.align) return column.align;
    if (column.className?.includes('text-right')) return 'right';
    if (column.className?.includes('text-center')) return 'center';
    return 'left';
  };

  const getAlignClass = (align: 'left' | 'center' | 'right') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  const getHeaderContentClass = (align: 'left' | 'center' | 'right') => {
    if (align === 'right') return 'justify-end';
    if (align === 'center') return 'justify-center';
    return 'justify-start';
  };

  if (isLoading) {
    return (
      <div className={containerClass}>
        <SkeletonTable rows={10} columns={columns.length} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={containerClass}>
        <EmptyState
          title="No records found"
          description="Try changing the filters or search terms."
          {...emptyState}
        />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {selectable && (
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                    }}
                    onChange={() => onSelectAll?.()}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                (() => {
                  const align = getColumnAlign(column);
                  const sortDirection = localSortKey === column.key ? localSortOrder : undefined;

                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={column.sortable && sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                      style={{ width: column.width }}
                      className={cn(
                        headerPadding,
                        'text-xs font-medium uppercase tracking-wider text-slate-500',
                        getAlignClass(align),
                        column.sortable && 'cursor-pointer select-none hover:bg-slate-100',
                        column.className
                      )}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className={cn('flex items-center gap-1', getHeaderContentClass(align))}>
                        {column.header}
                        {column.sortable && (
                          <SortIcon
                            active={localSortKey === column.key}
                            order={sortDirection}
                          />
                        )}
                      </div>
                    </th>
                  );
                })()
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {sortedData.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'hover:bg-slate-50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  selectable && isRowSelected(row) && 'bg-primary-50'
                )}
              >
                {selectable && (
                  <td className="w-12 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isRowSelected(row)}
                      onChange={() => onSelectionChange?.(getRowId(row))}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      cellPadding,
                      'whitespace-nowrap text-sm text-slate-900',
                      getAlignClass(getColumnAlign(column)),
                      column.className
                    )}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          meta={pagination}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

interface SortIconProps {
  active: boolean;
  order?: 'asc' | 'desc';
}

function SortIcon({ active, order }: SortIconProps) {
  return (
    <svg
      className={cn('h-4 w-4', active ? 'text-slate-700' : 'text-slate-400')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      {order === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : order === 'desc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      )}
    </svg>
  );
}

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange?: (page: number) => void;
}

function Pagination({ meta, onPageChange }: PaginationProps) {
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
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-700">
            Showing <span className="font-medium">{formatNumber(start)}</span> to{' '}
            <span className="font-medium">{formatNumber(end)}</span> of{' '}
            <span className="font-medium">{formatNumber(total)}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300"
                >
                  ...
                </span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={cn(
                    'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-slate-300 focus:z-20',
                    page === pageNum
                      ? 'z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                      : 'text-slate-900 hover:bg-slate-50'
                  )}
                >
                  {pageNum}
                </button>
              )
            ))}

            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-slate-700 self-center">
          Page {formatNumber(page)} of {formatNumber(totalPages)}
        </span>
        <button
          onClick={() => onPageChange?.(page + 1)}
          disabled={page === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
