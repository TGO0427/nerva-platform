import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PurchaseOrder, PurchaseOrderLine, PaginatedResult } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const PO_KEY = 'purchase-orders';
const PO_LINES_KEY = 'purchase-order-lines';

interface CreatePurchaseOrderData {
  supplierId: string;
  orderDate?: string;
  expectedDate?: string;
  shipToWarehouseId?: string;
  notes?: string;
}

interface UpdatePurchaseOrderData {
  status?: string;
  expectedDate?: string;
  shipToWarehouseId?: string;
  notes?: string;
}

interface POFilters {
  status?: string;
  supplierId?: string;
  search?: string;
}

// List purchase orders
export function usePurchaseOrders(params: QueryParams & POFilters) {
  return useQuery({
    queryKey: [PO_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.search) searchParams.set('search', params.search);
      if (params.status) searchParams.set('status', params.status);
      if (params.supplierId) searchParams.set('supplierId', params.supplierId);

      const response = await api.get<PaginatedResult<PurchaseOrder>>(
        `/purchase-orders?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

// Get single purchase order
export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: [PO_KEY, id],
    queryFn: async () => {
      const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create purchase order
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderData) => {
      const response = await api.post<PurchaseOrder>('/purchase-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PO_KEY] });
    },
  });
}

// Update purchase order
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseOrderData }) => {
      const response = await api.patch<PurchaseOrder>(`/purchase-orders/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PO_KEY] });
      queryClient.invalidateQueries({ queryKey: [PO_KEY, variables.id] });
    },
  });
}

// Update purchase order status
export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PO_KEY] });
      queryClient.invalidateQueries({ queryKey: [PO_KEY, variables.id] });
    },
  });
}

// Purchase Order Lines
export function usePurchaseOrderLines(purchaseOrderId: string | undefined) {
  return useQuery({
    queryKey: [PO_LINES_KEY, purchaseOrderId],
    queryFn: async () => {
      const response = await api.get<PurchaseOrderLine[]>(`/purchase-orders/${purchaseOrderId}/lines`);
      return response.data;
    },
    enabled: !!purchaseOrderId,
  });
}

interface CreateLineData {
  itemId: string;
  qtyOrdered: number;
  unitCost?: number;
}

export function useAddPurchaseOrderLine(purchaseOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLineData) => {
      const response = await api.post<PurchaseOrderLine>(
        `/purchase-orders/${purchaseOrderId}/lines`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PO_LINES_KEY, purchaseOrderId] });
      queryClient.invalidateQueries({ queryKey: [PO_KEY, purchaseOrderId] });
    },
  });
}

interface UpdateLineData {
  qtyOrdered?: number;
  qtyReceived?: number;
  unitCost?: number;
}

export function useUpdatePurchaseOrderLine(purchaseOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineId, data }: { lineId: string; data: UpdateLineData }) => {
      const response = await api.patch<PurchaseOrderLine>(
        `/purchase-orders/lines/${lineId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PO_LINES_KEY, purchaseOrderId] });
      queryClient.invalidateQueries({ queryKey: [PO_KEY, purchaseOrderId] });
    },
  });
}

export function useDeletePurchaseOrderLine(purchaseOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineId: string) => {
      await api.delete(`/purchase-orders/lines/${lineId}?purchaseOrderId=${purchaseOrderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PO_LINES_KEY, purchaseOrderId] });
      queryClient.invalidateQueries({ queryKey: [PO_KEY, purchaseOrderId] });
    },
  });
}
