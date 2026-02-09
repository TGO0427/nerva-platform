'use client';

import { useState, useCallback, useMemo } from 'react';

interface UseTableSelectionOptions {
  /** Key field to identify rows (defaults to 'id') */
  keyField?: string;
}

export function useTableSelection<T extends { id: string }>(
  data: T[],
  options: UseTableSelectionOptions = {}
) {
  const { keyField = 'id' } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getRowId = useCallback((row: T): string => {
    return String((row as Record<string, unknown>)[keyField]);
  }, [keyField]);

  const selectedRows = useMemo(() => {
    return data.filter(row => selectedIds.has(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  const isSelected = useCallback((row: T): boolean => {
    return selectedIds.has(getRowId(row));
  }, [selectedIds, getRowId]);

  const isAllSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every(row => selectedIds.has(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  const isSomeSelected = useMemo(() => {
    if (data.length === 0) return false;
    const selectedCount = data.filter(row => selectedIds.has(getRowId(row))).length;
    return selectedCount > 0 && selectedCount < data.length;
  }, [data, selectedIds, getRowId]);

  const toggle = useCallback((rowOrId: T | string) => {
    const id = typeof rowOrId === 'string' ? rowOrId : getRowId(rowOrId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [getRowId]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(data.map(getRowId)));
  }, [data, getRowId]);

  const selectPage = useCallback((pageData: T[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageData.forEach(row => next.add(getRowId(row)));
      return next;
    });
  }, [getRowId]);

  const deselectPage = useCallback((pageData: T[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageData.forEach(row => next.delete(getRowId(row)));
      return next;
    });
  }, [getRowId]);

  const togglePage = useCallback((pageData: T[]) => {
    const allPageSelected = pageData.every(row => selectedIds.has(getRowId(row)));
    if (allPageSelected) {
      deselectPage(pageData);
    } else {
      selectPage(pageData);
    }
  }, [selectedIds, getRowId, selectPage, deselectPage]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRows = useCallback((rows: T[]) => {
    setSelectedIds(new Set(rows.map(getRowId)));
  }, [getRowId]);

  return {
    selectedIds,
    selectedRows,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggle,
    selectAll,
    selectPage,
    deselectPage,
    togglePage,
    clearSelection,
    selectRows,
  };
}
