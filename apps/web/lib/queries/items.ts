import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Item, PaginatedResult } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const ITEMS_KEY = 'items';

interface CreateItemData {
  sku: string;
  description: string;
  uom: string;
  weightKg?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

interface UpdateItemData extends Partial<CreateItemData> {
  isActive?: boolean;
}

// Fetch paginated items
export function useItems(params: QueryParams) {
  return useQuery({
    queryKey: [ITEMS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<Item>>(
        `/masterdata/items?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

// Fetch single item
export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: [ITEMS_KEY, id],
    queryFn: async () => {
      const response = await api.get<Item>(`/masterdata/items/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create item
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateItemData) => {
      const response = await api.post<Item>('/masterdata/items', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY] });
    },
  });
}

// Update item
export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemData }) => {
      const response = await api.patch<Item>(`/masterdata/items/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, variables.id] });
    },
  });
}

// Delete item (soft delete by setting isActive to false)
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/masterdata/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY] });
    },
  });
}
