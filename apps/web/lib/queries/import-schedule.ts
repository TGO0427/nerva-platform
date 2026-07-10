import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ImportShipment, ImportShipmentStatus, PaginatedResult } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const SHIPMENTS_KEY = 'import-shipments';

interface ImportShipmentFilters {
  status?: ImportShipmentStatus;
  search?: string;
}

export function useImportShipments(params: QueryParams & ImportShipmentFilters) {
  return useQuery({
    queryKey: [SHIPMENTS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<ImportShipment>>(
        `/import-shipments?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useImportShipment(id: string | undefined) {
  return useQuery({
    queryKey: [SHIPMENTS_KEY, id],
    queryFn: async () => {
      const response = await api.get<ImportShipment>(`/import-shipments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export interface CreateImportShipmentData {
  reference: string;
  supplierId: string;
  siteId?: string;
  transportMode?: 'AIR' | 'SEA' | 'ROAD';
  carrier?: string;
  vesselOrAwb?: string;
  destinationPort?: string;
  etaDate?: string;
  quantity?: number;
  cbm?: number;
  palletQty?: number;
  incoterm?: string;
  notes?: string;
}

export function useCreateImportShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateImportShipmentData) => {
      const response = await api.post<ImportShipment>('/import-shipments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
    },
  });
}

export type UpdateImportShipmentData = Partial<CreateImportShipmentData>;

export function useUpdateImportShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateImportShipmentData }) => {
      const response = await api.patch<ImportShipment>(`/import-shipments/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY, id] });
    },
  });
}

export function useUpdateImportShipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ImportShipmentStatus }) => {
      const response = await api.patch<ImportShipment>(`/import-shipments/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY, id] });
    },
  });
}

export function useDeleteImportShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/import-shipments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
    },
  });
}
