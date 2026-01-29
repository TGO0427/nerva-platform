import { useQuery } from '@tanstack/react-query';
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
