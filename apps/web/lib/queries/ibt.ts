import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Ibt, IbtLine } from '@nerva/shared';

const IBT_KEY = 'ibts';
const INVENTORY_KEY = 'inventory';

export interface IbtDetail extends Ibt {
  fromWarehouseName: string;
  toWarehouseName: string;
  createdByName: string | null;
  approvedByName: string | null;
  lineCount: number;
}

export interface IbtLineDetail extends IbtLine {
  itemSku: string;
  itemDescription: string;
  fromBinCode: string | null;
  toBinCode: string | null;
}

export function useIbts(params: {
  page: number;
  limit: number;
  status?: string;
  fromWarehouseId?: string;
}) {
  return useQuery({
    queryKey: [IBT_KEY, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      query.set('page', String(params.page));
      query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.fromWarehouseId) query.set('fromWarehouseId', params.fromWarehouseId);

      const { data } = await api.get<{ data: IbtDetail[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        `/inventory/ibts?${query.toString()}`,
      );
      return data;
    },
  });
}

export function useIbt(id: string | undefined) {
  return useQuery({
    queryKey: [IBT_KEY, id],
    queryFn: async () => {
      const response = await api.get<IbtDetail>(`/inventory/ibts/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useIbtLines(ibtId: string | undefined) {
  return useQuery({
    queryKey: [IBT_KEY, ibtId, 'lines'],
    queryFn: async () => {
      const response = await api.get<IbtLineDetail[]>(`/inventory/ibts/${ibtId}/lines`);
      return response.data;
    },
    enabled: !!ibtId,
  });
}

export function useCreateIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { fromWarehouseId: string; toWarehouseId: string; notes?: string }) => {
      const response = await api.post<IbtDetail>('/inventory/ibts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}

export function useAddIbtLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ibtId,
      ...data
    }: {
      ibtId: string;
      itemId: string;
      qtyRequested: number;
      fromBinId?: string;
      batchNo?: string;
    }) => {
      const response = await api.post<IbtLineDetail[]>(`/inventory/ibts/${ibtId}/lines`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}

export function useRemoveIbtLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ibtId, lineId }: { ibtId: string; lineId: string }) => {
      await api.delete(`/inventory/ibts/${ibtId}/lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}

export function useSubmitIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<IbtDetail>(`/inventory/ibts/${id}/submit`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}

export function useApproveIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<IbtDetail>(`/inventory/ibts/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}

export function useStartPickingIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<IbtDetail>(`/inventory/ibts/${id}/start-picking`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}

export function useShipIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      lines,
    }: {
      id: string;
      lines: Array<{ lineId: string; qtyShipped: number }>;
    }) => {
      const response = await api.post<IbtDetail>(`/inventory/ibts/${id}/ship`, { lines });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

export function useReceiveIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      lines,
    }: {
      id: string;
      lines: Array<{ lineId: string; qtyReceived: number; toBinId: string }>;
    }) => {
      const response = await api.post<IbtDetail>(`/inventory/ibts/${id}/receive`, { lines });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

export function useDeleteIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/ibts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}

export function useCancelIbt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<IbtDetail>(`/inventory/ibts/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [IBT_KEY] });
    },
  });
}
