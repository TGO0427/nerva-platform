import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResult, RmaStatus, Disposition } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const RMA_KEY = 'rma';
const CREDIT_NOTES_KEY = 'credit-notes';

// Types
export interface Rma {
  id: string;
  tenantId: string;
  rmaNo: string;
  customerId: string;
  customerName?: string;
  customerCode?: string;
  salesOrderId: string | null;
  orderNo?: string;
  status: RmaStatus;
  returnType: 'REFUND' | 'EXCHANGE' | 'REPAIR';
  reason: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RmaLine {
  id: string;
  rmaId: string;
  itemId: string;
  itemSku?: string;
  itemDescription?: string;
  qtyRequested: number;
  qtyReceived: number;
  qtyInspected: number;
  disposition: Disposition;
  dispositionNotes: string | null;
  condition: 'NEW' | 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | null;
  receivingBinId: string | null;
  receivingBinCode?: string;
}

export interface CreditNote {
  id: string;
  tenantId: string;
  creditNoteNo: string;
  rmaId: string;
  rmaNo?: string;
  customerId: string;
  customerName?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'POSTED' | 'CANCELLED';
  amount: number;
  currency: string;
  reason: string;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

// RMA queries
export function useRmas(params: QueryParams & { status?: RmaStatus; customerId?: string }) {
  return useQuery({
    queryKey: [RMA_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.customerId) searchParams.set('customerId', params.customerId);

      const response = await api.get<PaginatedResult<Rma>>(
        `/returns/rmas?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useRma(id: string | undefined) {
  return useQuery({
    queryKey: [RMA_KEY, id],
    queryFn: async () => {
      const response = await api.get<Rma>(`/returns/rmas/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useRmaLines(rmaId: string | undefined) {
  return useQuery({
    queryKey: [RMA_KEY, rmaId, 'lines'],
    queryFn: async () => {
      const response = await api.get<RmaLine[]>(`/returns/rmas/${rmaId}/lines`);
      return response.data;
    },
    enabled: !!rmaId,
  });
}

export function useCreateRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      customerId: string;
      salesOrderId?: string;
      returnType: 'REFUND' | 'EXCHANGE' | 'REPAIR';
      reason: string;
      notes?: string;
      lines: Array<{
        itemId: string;
        qtyRequested: number;
      }>;
    }) => {
      const response = await api.post<Rma>('/returns/rmas', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY] });
    },
  });
}

export function useReceiveRmaLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rmaId,
      lineId,
      qtyReceived,
      receivingBinId,
      condition,
    }: {
      rmaId: string;
      lineId: string;
      qtyReceived: number;
      receivingBinId: string;
      condition: 'NEW' | 'GOOD' | 'DAMAGED' | 'DEFECTIVE';
    }) => {
      const response = await api.post<RmaLine>(`/returns/rmas/${rmaId}/lines/${lineId}/receive`, {
        qtyReceived,
        receivingBinId,
        condition,
      });
      return response.data;
    },
    onSuccess: (_, { rmaId }) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId, 'lines'] });
    },
  });
}

export function useInspectRmaLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rmaId,
      lineId,
      disposition,
      dispositionNotes,
    }: {
      rmaId: string;
      lineId: string;
      disposition: Disposition;
      dispositionNotes?: string;
    }) => {
      const response = await api.post<RmaLine>(`/returns/rmas/${rmaId}/lines/${lineId}/inspect`, {
        disposition,
        dispositionNotes,
      });
      return response.data;
    },
    onSuccess: (_, { rmaId }) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId, 'lines'] });
    },
  });
}

export function useCompleteRmaDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rmaId: string) => {
      const response = await api.post<Rma>(`/returns/rmas/${rmaId}/complete-disposition`);
      return response.data;
    },
    onSuccess: (_, rmaId) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
    },
  });
}

export function useCloseRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rmaId: string) => {
      const response = await api.post<Rma>(`/returns/rmas/${rmaId}/close`);
      return response.data;
    },
    onSuccess: (_, rmaId) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
    },
  });
}

export function useCancelRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rmaId, reason }: { rmaId: string; reason: string }) => {
      const response = await api.post<Rma>(`/returns/rmas/${rmaId}/cancel`, { reason });
      return response.data;
    },
    onSuccess: (_, { rmaId }) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
    },
  });
}

// Credit Note queries
export function useCreditNotes(params: QueryParams & { status?: string; customerId?: string }) {
  return useQuery({
    queryKey: [CREDIT_NOTES_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.customerId) searchParams.set('customerId', params.customerId);

      const response = await api.get<PaginatedResult<CreditNote>>(
        `/finance/credits?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useCreditNote(id: string | undefined) {
  return useQuery({
    queryKey: [CREDIT_NOTES_KEY, id],
    queryFn: async () => {
      const response = await api.get<CreditNote>(`/finance/credits/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      rmaId: string;
      amount: number;
      reason: string;
      notes?: string;
    }) => {
      const response = await api.post<CreditNote>('/finance/credits', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY] });
    },
  });
}

export function useApproveCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creditNoteId: string) => {
      const response = await api.post<CreditNote>(`/finance/credits/${creditNoteId}/approve`);
      return response.data;
    },
    onSuccess: (_, creditNoteId) => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY, creditNoteId] });
    },
  });
}

export function usePostCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creditNoteId: string) => {
      const response = await api.post<CreditNote>(`/finance/credits/${creditNoteId}/post`);
      return response.data;
    },
    onSuccess: (_, creditNoteId) => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY, creditNoteId] });
    },
  });
}

export function useCancelCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ creditNoteId, reason }: { creditNoteId: string; reason: string }) => {
      const response = await api.post<CreditNote>(`/finance/credits/${creditNoteId}/cancel`, { reason });
      return response.data;
    },
    onSuccess: (_, { creditNoteId }) => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY, creditNoteId] });
    },
  });
}
