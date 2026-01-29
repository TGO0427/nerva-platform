'use client';

import { useState, useCallback } from 'react';

export interface QueryParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

const DEFAULT_PARAMS: QueryParams = {
  page: 1,
  limit: 20,
};

export function useQueryParams(initialParams: Partial<QueryParams> = {}) {
  const [params, setParams] = useState<QueryParams>({
    ...DEFAULT_PARAMS,
    ...initialParams,
  });

  const setPage = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setParams((prev) => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setParams((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const resetParams = useCallback(() => {
    setParams({ ...DEFAULT_PARAMS, ...initialParams });
  }, [initialParams]);

  return {
    params,
    setPage,
    setLimit,
    setSort,
    setSearch,
    resetParams,
  };
}
