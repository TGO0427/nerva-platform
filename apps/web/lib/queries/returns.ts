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
  siteId: string;
  warehouseId: string;
  customerId: string;
  customerName?: string;
  customerCode?: string;
  salesOrderId: string | null;
  orderNo?: string | null;
  shipmentId: string | null;
  rmaNo: string;
  status: RmaStatus;
  returnType: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RmaLine {
  id: string;
  tenantId: string;
  rmaId: string;
  salesOrderLineId: string | null;
  itemId: string;
  itemSku?: string;
  itemDescription?: string;
  qtyExpected: number;
  qtyReceived: number;
  receivingBinId: string | null;
  receivingBinCode?: string;
  batchNo: string | null;
  reasonCode: string;
  disposition: Disposition;
  dispositionBinId: string | null;
  dispositionBinCode?: string;
  inspectionNotes: string | null;
  inspectedBy: string | null;
  inspectedAt: string | null;
  unitCreditAmount: number | null;
  createdAt: string;
}

export interface CreditNote {
  id: string;
  tenantId: string;
  rmaId: string;
  rmaNo?: string;
  customerId?: string;
  customerName?: string;
  creditNo: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'POSTED' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  postedAt: string | null;
  externalRef: string | null;
  createdAt: string;
  updatedAt: string;
}

// RMA queries
export function useRmas(params: QueryParams & { status?: RmaStatus; customerId?: string; search?: string }) {
  return useQuery({
    queryKey: [RMA_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.customerId) searchParams.set('customerId', params.customerId);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<Rma>>(
        `/returns/rmas?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

// GET /returns/rmas/:id returns { rma, lines } together - there's no
// separate lines endpoint, so both useRma and useRmaLines below share
// this one request rather than firing two.
export function useRmaWithLines(id: string | undefined) {
  return useQuery({
    queryKey: [RMA_KEY, id],
    queryFn: async () => {
      const response = await api.get<{ rma: Rma; lines: RmaLine[] }>(`/returns/rmas/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useRma(id: string | undefined) {
  const { data, ...rest } = useRmaWithLines(id);
  return { data: data?.rma, ...rest };
}

export function useRmaLines(id: string | undefined) {
  const { data, ...rest } = useRmaWithLines(id);
  return { data: data?.lines, ...rest };
}

export function useCreateRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      warehouseId: string;
      customerId: string;
      salesOrderId: string;
      shipmentId?: string;
      returnType?: string;
      notes?: string;
      lines: Array<{
        itemId: string;
        qtyExpected: number;
        reasonCode: string;
        unitCreditAmount?: number;
        salesOrderLineId?: string;
        batchNo?: string;
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

export function useDeleteRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/returns/rmas/${id}`);
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
      batchNo,
    }: {
      rmaId: string;
      lineId: string;
      qtyReceived: number;
      receivingBinId: string;
      batchNo?: string;
    }) => {
      const response = await api.post<RmaLine>(`/returns/rmas/${rmaId}/receive`, {
        lineId,
        qtyReceived,
        receivingBinId,
        batchNo,
      });
      return response.data;
    },
    onSuccess: (_, { rmaId }) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
    },
  });
}

export function useUpdateRmaLineCreditAmount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rmaId,
      lineId,
      unitCreditAmount,
    }: {
      rmaId: string;
      lineId: string;
      unitCreditAmount: number;
    }) => {
      const response = await api.post<RmaLine>(
        `/returns/rmas/${rmaId}/lines/${lineId}/credit-amount`,
        { unitCreditAmount },
      );
      return response.data;
    },
    onSuccess: (_, { rmaId }) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
    },
  });
}

export function useSetRmaLineDisposition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rmaId,
      lineId,
      disposition,
      dispositionBinId,
      inspectionNotes,
    }: {
      rmaId: string;
      lineId: string;
      disposition: Disposition;
      dispositionBinId: string;
      inspectionNotes?: string;
    }) => {
      const response = await api.post<RmaLine>(`/returns/rmas/${rmaId}/disposition`, {
        lineId,
        disposition,
        dispositionBinId,
        inspectionNotes,
      });
      return response.data;
    },
    onSuccess: (_, { rmaId }) => {
      queryClient.invalidateQueries({ queryKey: [RMA_KEY] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
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

// Create a credit note from an RMA's own received/disposed lines -
// amount is derived server-side from each line's unitCreditAmount x
// qtyReceived, not something the caller specifies.
export function useCreateCreditNoteFromRma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rmaId: string) => {
      const response = await api.post<CreditNote>(`/finance/credits/from-rma/${rmaId}`);
      return response.data;
    },
    onSuccess: (_, rmaId) => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: [RMA_KEY, rmaId] });
    },
  });
}

// Standalone credit note for an arbitrary amount not derived from RMA
// line totals (e.g. a goodwill credit).
export function useCreateStandaloneCreditNote() {
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

export function useDeleteCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finance/credits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY] });
    },
  });
}

export function useSubmitCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creditNoteId: string) => {
      const response = await api.post<CreditNote>(`/finance/credits/${creditNoteId}/submit`);
      return response.data;
    },
    onSuccess: (_, creditNoteId) => {
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY] });
      queryClient.invalidateQueries({ queryKey: [CREDIT_NOTES_KEY, creditNoteId] });
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
