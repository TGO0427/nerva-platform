import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { QueryParams } from './use-query-params';

const PORTAL_KEY = 'portal';

export interface PortalDashboard {
  totalOrders: number;
  pendingDeliveries: number;
  openReturns: number;
  outstandingInvoices: number;
}

export interface PortalOrder {
  id: string;
  order_no: string;
  status: string;
  priority: number;
  requested_ship_date: string | null;
  customer_name: string;
  created_at: string;
  updated_at: string;
}

export interface PortalOrderDetail extends PortalOrder {
  lines: Array<{
    id: string;
    line_no: number;
    item_id: string;
    item_sku: string;
    item_description: string;
    qty_ordered: number;
    qty_allocated: number;
    qty_picked: number;
    qty_shipped: number;
    unit_price: number | null;
  }>;
}

export interface PortalInvoice {
  id: string;
  invoice_no: string;
  status: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  currency: string;
  order_no: string | null;
  notes: string | null;
}

export interface PortalDelivery {
  id: string;
  sequence: number;
  address_line1: string;
  city: string | null;
  status: string;
  arrived_at: string | null;
  completed_at: string | null;
  trip_no: string;
  trip_status: string;
  planned_date: string | null;
}

export interface PortalPod {
  id: string;
  stop_id: string;
  status: string;
  recipient_name: string | null;
  signature_ref: string | null;
  photo_refs: string[];
  gps_lat: number | null;
  gps_lng: number | null;
  notes: string | null;
  failure_reason: string | null;
  captured_at: string;
}

export interface PortalReturn {
  id: string;
  rma_no: string;
  status: string;
  return_type: string;
  reason: string;
  order_no: string | null;
  created_at: string;
}

export interface PortalReturnDetail extends PortalReturn {
  notes: string | null;
  customer_name: string;
  lines: Array<{
    id: string;
    item_id: string;
    item_sku: string;
    item_description: string;
    qty_requested: number;
    qty_received: number;
    disposition: string;
  }>;
}

export function usePortalDashboard() {
  return useQuery({
    queryKey: [PORTAL_KEY, 'dashboard'],
    queryFn: async () => {
      const response = await api.get<PortalDashboard>('/portal/dashboard');
      return response.data;
    },
  });
}

export function usePortalOrders(params: QueryParams & { status?: string }) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'orders', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      const response = await api.get<{ data: PortalOrder[]; meta: any }>(`/portal/orders?${searchParams}`);
      return response.data;
    },
  });
}

export function usePortalOrder(id: string | undefined) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'orders', id],
    queryFn: async () => {
      const response = await api.get<PortalOrderDetail>(`/portal/orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePortalInvoices(params: QueryParams & { status?: string }) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'invoices', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      const response = await api.get<{ data: PortalInvoice[]; meta: any }>(`/portal/invoices?${searchParams}`);
      return response.data;
    },
  });
}

export function usePortalInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'invoices', id],
    queryFn: async () => {
      const response = await api.get<PortalInvoice>(`/portal/invoices/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePortalDeliveries(params: QueryParams) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'deliveries', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      const response = await api.get<{ data: PortalDelivery[]; meta: any }>(`/portal/deliveries?${searchParams}`);
      return response.data;
    },
  });
}

export function usePortalDelivery(stopId: string | undefined) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'deliveries', stopId],
    queryFn: async () => {
      const response = await api.get<any>(`/portal/deliveries/${stopId}`);
      return response.data;
    },
    enabled: !!stopId,
  });
}

export function usePortalPod(stopId: string | undefined) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'pod', stopId],
    queryFn: async () => {
      const response = await api.get<PortalPod>(`/portal/deliveries/${stopId}/pod`);
      return response.data;
    },
    enabled: !!stopId,
  });
}

export function usePortalReturns(params: QueryParams) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'returns', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      const response = await api.get<{ data: PortalReturn[]; meta: any }>(`/portal/returns?${searchParams}`);
      return response.data;
    },
  });
}

export function usePortalReturn(id: string | undefined) {
  return useQuery({
    queryKey: [PORTAL_KEY, 'returns', id],
    queryFn: async () => {
      const response = await api.get<PortalReturnDetail>(`/portal/returns/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreatePortalReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      salesOrderId?: string;
      returnType: string;
      reason: string;
      notes?: string;
      lines: Array<{ itemId: string; qtyRequested: number }>;
    }) => {
      const response = await api.post<any>('/portal/returns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PORTAL_KEY, 'returns'] });
      queryClient.invalidateQueries({ queryKey: [PORTAL_KEY, 'dashboard'] });
    },
  });
}
