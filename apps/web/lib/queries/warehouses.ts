import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Warehouse, Bin } from '@nerva/shared';

const WAREHOUSES_KEY = 'warehouses';

export function useWarehouses() {
  return useQuery({
    queryKey: [WAREHOUSES_KEY],
    queryFn: async () => {
      const response = await api.get<Warehouse[]>('/masterdata/warehouses');
      return response.data;
    },
  });
}

export function useWarehouse(id: string | undefined) {
  return useQuery({
    queryKey: [WAREHOUSES_KEY, id],
    queryFn: async () => {
      const response = await api.get<Warehouse>(`/masterdata/warehouses/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useBins(warehouseId: string | undefined) {
  return useQuery({
    queryKey: [WAREHOUSES_KEY, warehouseId, 'bins'],
    queryFn: async () => {
      const response = await api.get<Bin[]>(`/masterdata/warehouses/${warehouseId}/bins`);
      return response.data;
    },
    enabled: !!warehouseId,
  });
}

interface CreateWarehouseData {
  siteId: string;
  name: string;
  code?: string;
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWarehouseData) => {
      const response = await api.post<Warehouse>('/masterdata/warehouses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY] });
    },
  });
}

interface UpdateWarehouseData {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarehouseData }) => {
      const response = await api.patch<Warehouse>(`/masterdata/warehouses/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY] });
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY, variables.id] });
    },
  });
}

// Delete warehouse
export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/masterdata/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY] });
    },
  });
}

interface CreateBinData {
  code: string;
  binType?: string;
}

export function useCreateBin(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBinData) => {
      const response = await api.post<Bin>(`/masterdata/warehouses/${warehouseId}/bins`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY, warehouseId, 'bins'] });
    },
  });
}

interface UpdateBinData {
  code?: string;
  binType?: string;
  isActive?: boolean;
}

export function useUpdateBin(warehouseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ binId, data }: { binId: string; data: UpdateBinData }) => {
      const response = await api.patch<Bin>(`/masterdata/warehouses/bins/${binId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WAREHOUSES_KEY, warehouseId, 'bins'] });
    },
  });
}
