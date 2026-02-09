'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

interface ColumnDef {
  key: string;
  header?: React.ReactNode;
}

interface UseColumnVisibilityOptions {
  /** localStorage key for persisting column visibility */
  storageKey?: string;
  /** Columns that should always be visible */
  alwaysVisible?: string[];
}

export function useColumnVisibility<T extends ColumnDef>(
  columns: T[],
  options: UseColumnVisibilityOptions = {}
) {
  const { storageKey, alwaysVisible = [] } = options;

  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    // Default: all columns visible
    const defaultKeys = new Set(columns.map(c => c.key));

    // Try to restore from localStorage
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`columns:${storageKey}`);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          // Merge with always-visible columns
          const restored = new Set([...parsed, ...alwaysVisible]);
          return restored;
        }
      } catch {
        // Ignore parse errors, use default
      }
    }

    return defaultKeys;
  });

  // Persist to localStorage when visibility changes
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`columns:${storageKey}`, JSON.stringify(Array.from(visibleKeys)));
    }
  }, [visibleKeys, storageKey]);

  const toggle = useCallback((key: string) => {
    // Don't allow hiding always-visible columns
    if (alwaysVisible.includes(key)) return;

    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [alwaysVisible]);

  const show = useCallback((key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const hide = useCallback((key: string) => {
    // Don't allow hiding always-visible columns
    if (alwaysVisible.includes(key)) return;

    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, [alwaysVisible]);

  const showAll = useCallback(() => {
    setVisibleKeys(new Set(columns.map(c => c.key)));
  }, [columns]);

  const reset = useCallback(() => {
    setVisibleKeys(new Set(columns.map(c => c.key)));
    if (storageKey && typeof window !== 'undefined') {
      localStorage.removeItem(`columns:${storageKey}`);
    }
  }, [columns, storageKey]);

  const isVisible = useCallback((key: string): boolean => {
    return visibleKeys.has(key);
  }, [visibleKeys]);

  const visibleColumns = useMemo(() => {
    return columns.filter(c => visibleKeys.has(c.key));
  }, [columns, visibleKeys]);

  const hiddenColumns = useMemo(() => {
    return columns.filter(c => !visibleKeys.has(c.key));
  }, [columns, visibleKeys]);

  return {
    visibleKeys,
    visibleColumns,
    hiddenColumns,
    isVisible,
    toggle,
    show,
    hide,
    showAll,
    reset,
  };
}
