import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SalesOrder, SalesOrderLine, PaginatedResult, SalesOrderStatus } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const ORDERS_KEY = 'sales-orders';

// Extended types for frontend
export interface SalesOrderWithCustomer extends SalesOrder {
  customerName?: string;
  customerCode?: string;
}

export interface SalesOrderDetail extends SalesOrder {
  siteId: string;
  warehouseId: string;
  customer?: {
    id: string;
    code: string | null;
    name: string;
  };
  warehouse?: {
    id: string;
    code: string | null;
    name: string;
  };
  lines: SalesOrderLineWithItem[];
}

export interface SalesOrderLineWithItem extends SalesOrderLine {
  itemSku?: string;
  itemDescription?: string;
}

interface OrderFilters {
  status?: SalesOrderStatus;
  customerId?: string;
}

// List orders
export function useOrders(params: QueryParams & OrderFilters) {
  return useQuery({
    queryKey: [ORDERS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.customerId) searchParams.set('customerId', params.customerId);
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      const response = await api.get<PaginatedResult<SalesOrderWithCustomer>>(
        `/sales/orders?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

// Get single order with lines
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [ORDERS_KEY, id],
    queryFn: async () => {
      const response = await api.get<SalesOrderDetail>(`/sales/orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create order
export interface CreateOrderData {
  warehouseId: string;
  customerId: string;
  externalRef?: string;
  priority?: number;
  requestedShipDate?: string;
  shippingAddressLine1?: string;
  shippingCity?: string;
  notes?: string;
  lines: Array<{
    itemId: string;
    qtyOrdered: number;
    unitPrice?: number;
  }>;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderData) => {
      const response = await api.post<SalesOrder>('/sales/orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
    },
  });
}

// Confirm order
export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post<SalesOrder>(`/sales/orders/${orderId}/confirm`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
    },
  });
}

// Allocate order
export function useAllocateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post<SalesOrder>(`/sales/orders/${orderId}/allocate`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
    },
  });
}

// Cancel order
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.post<SalesOrder>(`/sales/orders/${orderId}/cancel`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ORDERS_KEY, orderId] });
    },
  });
}
