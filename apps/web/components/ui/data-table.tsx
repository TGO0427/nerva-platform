'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SkeletonTable } from './skeleton';
import { EmptyState } from './empty-state';
import { Pagination, type PaginationMeta } from './pagination';

export type { PaginationMeta };

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
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
  /** Extra className applied to a row based on its own data (e.g. highlight shortages) */
  rowClassName?: (row: T) => string | undefined;
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
  /** Pins the first column in place while the rest of the table scrolls horizontally. On by default - pass false to opt out. */
  stickyFirstColumn?: boolean;
  /** Pins the header row in place while the table body scrolls vertically */
  stickyHeader?: boolean;
  /** Bounds the table to this height with its own vertical scrollbar, so a long
   *  table's horizontal scrollbar stays reachable without paging past every row */
  maxBodyHeight?: string;
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
  rowClassName,
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
  stickyFirstColumn = true,
  stickyHeader = false,
  maxBodyHeight,
}: DataTableProps<T>) {
  const containerClass = variant === 'embedded'
    ? cn(className)
    : cn('bg-surface-card dark:bg-surface-dark-card rounded-lg border border-surface-border dark:border-surface-dark-border shadow-xs overflow-hidden', className);

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
      <div
        className={cn('overflow-x-auto', maxBodyHeight && 'overflow-y-auto')}
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
      >
        <table className="min-w-full divide-y divide-surface-border dark:divide-surface-dark-border">
          <thead className="bg-surface-secondary dark:bg-surface-dark-secondary">
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
                    className="h-4 w-4 rounded border-surface-border dark:border-surface-dark-border text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column, columnIndex) => (
                (() => {
                  const align = getColumnAlign(column);
                  const sortDirection = localSortKey === column.key ? localSortOrder : undefined;
                  const isStickyLeft = stickyFirstColumn && columnIndex === 0;
                  const stickyHeaderClass = isStickyLeft && stickyHeader
                    ? 'sticky left-0 top-0 z-30 bg-surface-secondary dark:bg-surface-dark-secondary shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]'
                    : isStickyLeft
                    ? 'sticky left-0 z-20 bg-surface-secondary dark:bg-surface-dark-secondary shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]'
                    : stickyHeader
                    ? 'sticky top-0 z-20 bg-surface-secondary dark:bg-surface-dark-secondary'
                    : undefined;

                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={column.sortable && sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                      style={{ width: column.width }}
                      className={cn(
                        headerPadding,
                        'text-xs font-semibold uppercase tracking-wider text-text-muted dark:text-text-dark-muted',
                        getAlignClass(align),
                        column.sortable && 'cursor-pointer select-none hover:bg-surface-border/60 dark:hover:bg-surface-dark-border/60',
                        stickyHeaderClass,
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
          <tbody className="bg-surface-card dark:bg-surface-dark-card divide-y divide-surface-border dark:divide-surface-dark-border">
            {sortedData.map((row) => {
              const rowExtraClass = cn(
                selectable && isRowSelected(row) && 'bg-primary-50 dark:bg-primary-900/30',
                rowClassName?.(row)
              );
              return (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary transition-colors',
                    onRowClick && 'cursor-pointer',
                    rowExtraClass
                  )}
                >
                  {selectable && (
                    <td className="w-12 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={() => onSelectionChange?.(getRowId(row))}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-surface-border dark:border-surface-dark-border text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((column, columnIndex) => {
                    const isSticky = stickyFirstColumn && columnIndex === 0;
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          cellPadding,
                          'whitespace-nowrap text-sm text-text-primary dark:text-text-dark-primary',
                          getAlignClass(getColumnAlign(column)),
                          isSticky && 'sticky left-0 z-10 bg-surface-card dark:bg-surface-dark-card shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]',
                          isSticky && rowExtraClass,
                          column.className
                        )}
                      >
                        {getCellValue(row, column)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
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
      className={cn('h-4 w-4', active ? 'text-text-secondary dark:text-text-dark-secondary' : 'text-text-muted dark:text-text-dark-muted')}
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

