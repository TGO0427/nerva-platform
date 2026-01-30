import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResult } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const PICK_WAVES_KEY = 'pick-waves';
const SHIPMENTS_KEY = 'shipments';

// Types
export interface PickWave {
  id: string;
  tenantId: string;
  warehouseId: string;
  waveNo: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'CANCELLED';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PickTask {
  id: string;
  tenantId: string;
  pickWaveId: string;
  salesOrderId: string;
  salesOrderLineId: string;
  itemId: string;
  itemSku?: string;
  itemDescription?: string;
  fromBinId: string;
  fromBinCode?: string;
  qtyToPick: number;
  qtyPicked: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'PICKED' | 'SHORT' | 'CANCELLED';
  shortReason: string | null;
  assignedTo: string | null;
  assignedToName?: string;
  pickedAt: string | null;
  batchNo: string | null;
  createdAt: string;
}

export interface Shipment {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  salesOrderId: string;
  orderNo?: string;
  shipmentNo: string;
  status: 'PENDING' | 'PACKED' | 'READY_FOR_DISPATCH' | 'SHIPPED' | 'DELIVERED';
  totalWeightKg: number;
  totalCbm: number;
  carrier: string | null;
  trackingNo: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Pick Wave queries
export function usePickWaves(params: QueryParams & { status?: string }) {
  return useQuery({
    queryKey: [PICK_WAVES_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResult<PickWave>>(
        `/fulfilment/pick-waves?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function usePickWave(id: string | undefined) {
  return useQuery({
    queryKey: [PICK_WAVES_KEY, id],
    queryFn: async () => {
      const response = await api.get<PickWave>(`/fulfilment/pick-waves/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePickTasks(waveId: string | undefined) {
  return useQuery({
    queryKey: [PICK_WAVES_KEY, waveId, 'tasks'],
    queryFn: async () => {
      const response = await api.get<PickTask[]>(`/fulfilment/pick-waves/${waveId}/tasks`);
      return response.data;
    },
    enabled: !!waveId,
  });
}

export function useMyPickTasks(status?: string) {
  return useQuery({
    queryKey: [PICK_WAVES_KEY, 'my-tasks', status],
    queryFn: async () => {
      const url = status
        ? `/fulfilment/pick-tasks?status=${status}`
        : '/fulfilment/pick-tasks';
      const response = await api.get<PickTask[]>(url);
      return response.data;
    },
  });
}

export function useCreatePickWave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { warehouseId: string; orderIds: string[] }) => {
      const response = await api.post<PickWave>('/fulfilment/pick-waves', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY] });
    },
  });
}

export function useReleasePickWave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waveId: string) => {
      const response = await api.post<PickWave>(`/fulfilment/pick-waves/${waveId}/release`);
      return response.data;
    },
    onSuccess: (_, waveId) => {
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY, waveId] });
    },
  });
}

export function useCompletePickWave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waveId: string) => {
      const response = await api.post<PickWave>(`/fulfilment/pick-waves/${waveId}/complete`);
      return response.data;
    },
    onSuccess: (_, waveId) => {
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY, waveId] });
    },
  });
}

export function useCancelPickWave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ waveId, reason }: { waveId: string; reason: string }) => {
      const response = await api.post<PickWave>(`/fulfilment/pick-waves/${waveId}/cancel`, { reason });
      return response.data;
    },
    onSuccess: (_, { waveId }) => {
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY] });
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY, waveId] });
    },
  });
}

export function useAssignPickTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.post<PickTask>(`/fulfilment/pick-tasks/${taskId}/assign`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY] });
    },
  });
}

export function useConfirmPickTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, qtyPicked, shortReason }: { taskId: string; qtyPicked: number; shortReason?: string }) => {
      const response = await api.post<PickTask>(`/fulfilment/pick-tasks/${taskId}/confirm`, {
        qtyPicked,
        shortReason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PICK_WAVES_KEY] });
    },
  });
}

// Shipment queries
export function useShipments(params: QueryParams & { status?: string }) {
  return useQuery({
    queryKey: [SHIPMENTS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResult<Shipment>>(
        `/fulfilment/shipments?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({
    queryKey: [SHIPMENTS_KEY, id],
    queryFn: async () => {
      const response = await api.get<Shipment>(`/fulfilment/shipments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useOrderShipments(orderId: string | undefined) {
  return useQuery({
    queryKey: [SHIPMENTS_KEY, 'order', orderId],
    queryFn: async () => {
      const response = await api.get<Shipment[]>(`/fulfilment/orders/${orderId}/shipments`);
      return response.data;
    },
    enabled: !!orderId,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { siteId: string; warehouseId: string; salesOrderId: string }) => {
      const response = await api.post<Shipment>('/fulfilment/shipments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
    },
  });
}

export function usePackShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await api.post<Shipment>(`/fulfilment/shipments/${shipmentId}/pack`);
      return response.data;
    },
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY, shipmentId] });
    },
  });
}

export function useMarkShipmentReady() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await api.post<Shipment>(`/fulfilment/shipments/${shipmentId}/ready`);
      return response.data;
    },
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY, shipmentId] });
    },
  });
}

export function useShipShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shipmentId, carrier, trackingNo }: { shipmentId: string; carrier: string; trackingNo: string }) => {
      const response = await api.post<Shipment>(`/fulfilment/shipments/${shipmentId}/ship`, {
        carrier,
        trackingNo,
      });
      return response.data;
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY, shipmentId] });
    },
  });
}

export function useDeliverShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await api.post<Shipment>(`/fulfilment/shipments/${shipmentId}/deliver`);
      return response.data;
    },
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENTS_KEY, shipmentId] });
    },
  });
}

// Fetch shipments ready for dispatch (not yet assigned to a trip)
export function useReadyForDispatchShipments() {
  return useQuery({
    queryKey: [SHIPMENTS_KEY, 'ready-for-dispatch'],
    queryFn: async () => {
      const response = await api.get<{ data: Shipment[]; meta: { page: number; limit: number } }>(
        '/fulfilment/shipments?status=READY_FOR_DISPATCH'
      );
      return response.data.data; // Extract the array from paginated response
    },
  });
}
