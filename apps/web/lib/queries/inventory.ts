import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { StockOnHand, PaginatedResult } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const INVENTORY_KEY = 'inventory';
const GRN_KEY = 'grn';

// Types for inventory
export interface StockSnapshot {
  itemId: string;
  itemSku: string;
  itemDescription: string;
  binId: string;
  binCode: string;
  warehouseId: string;
  warehouseName: string;
  batchNo: string | null;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface LedgerEntry {
  id: string;
  itemId: string;
  binId: string;
  reason: string;
  qtyChange: number;
  qtyAfter: number;
  batchNo: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  createdBy: string;
}

export interface Grn {
  id: string;
  tenantId: string;
  grnNo: string;
  warehouseId: string;
  supplierId: string | null;
  purchaseOrderId: string | null;
  status: 'OPEN' | 'PARTIAL' | 'COMPLETE' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

export interface GrnLine {
  id: string;
  grnId: string;
  itemId: string;
  itemSku?: string;
  itemDescription?: string;
  qtyExpected: number;
  qtyReceived: number;
  batchNo: string | null;
  expiryDate: string | null;
  binId: string | null;
  binCode?: string;
}

// Stock queries
export function useStockOnHand(itemId: string | undefined) {
  return useQuery({
    queryKey: [INVENTORY_KEY, 'stock-on-hand', itemId],
    queryFn: async () => {
      const response = await api.get<StockSnapshot[]>(
        `/inventory/stock-on-hand?itemId=${itemId}`
      );
      return response.data;
    },
    enabled: !!itemId,
  });
}

export function useStockInBin(binId: string | undefined) {
  return useQuery({
    queryKey: [INVENTORY_KEY, 'stock-in-bin', binId],
    queryFn: async () => {
      const response = await api.get<StockSnapshot[]>(
        `/inventory/stock-in-bin?binId=${binId}`
      );
      return response.data;
    },
    enabled: !!binId,
  });
}

export function useLedgerHistory(itemId: string | undefined, params: QueryParams) {
  return useQuery({
    queryKey: [INVENTORY_KEY, 'ledger', itemId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('itemId', itemId!);
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));

      const response = await api.get<PaginatedResult<LedgerEntry>>(
        `/inventory/ledger?${searchParams.toString()}`
      );
      return response.data;
    },
    enabled: !!itemId,
  });
}

// Stock transfer
export function useTransferStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      itemId: string;
      fromBinId: string;
      toBinId: string;
      qty: number;
      batchNo?: string;
    }) => {
      const response = await api.post('/inventory/transfers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

// GRN queries
export function useGrns(params: QueryParams & { status?: string }) {
  return useQuery({
    queryKey: [GRN_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResult<Grn>>(
        `/receiving/grns?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useGrn(id: string | undefined) {
  return useQuery({
    queryKey: [GRN_KEY, id],
    queryFn: async () => {
      const response = await api.get<Grn>(`/receiving/grns/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useGrnLines(grnId: string | undefined) {
  return useQuery({
    queryKey: [GRN_KEY, grnId, 'lines'],
    queryFn: async () => {
      const response = await api.get<GrnLine[]>(`/receiving/grns/${grnId}/lines`);
      return response.data;
    },
    enabled: !!grnId,
  });
}

export interface CreateGrnData {
  warehouseId: string;
  purchaseOrderId?: string;
  supplierId?: string;
  notes?: string;
  lines?: Array<{
    itemId: string;
    qtyExpected: number;
    batchNo?: string;
  }>;
}

export function useCreateGrn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGrnData) => {
      const response = await api.post<Grn>('/receiving/grns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GRN_KEY] });
    },
  });
}

export function useReceiveGrnLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      grnId,
      data,
    }: {
      grnId: string;
      data: {
        itemId: string;
        qtyReceived: number;
        batchNo?: string;
        expiryDate?: string;
        receivingBinId: string;
      };
    }) => {
      const response = await api.post(`/receiving/grns/${grnId}/scan`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [GRN_KEY, variables.grnId] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

export function useCompleteGrn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grnId: string) => {
      const response = await api.post(`/receiving/grns/${grnId}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GRN_KEY] });
    },
  });
}
