import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { StockOnHand, PaginatedResult, Adjustment, AdjustmentLine, CycleCount, CycleCountLine, PutawayTask } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const INVENTORY_KEY = 'inventory';
const GRN_KEY = 'grn';
const EXPIRY_KEY = 'expiry-alerts';
const ADJUSTMENT_KEY = 'adjustments';
const CYCLE_COUNT_KEY = 'cycle-counts';
const PUTAWAY_KEY = 'putaway';

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
  expiryDate: string | null;
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
  status: 'DRAFT' | 'OPEN' | 'PARTIAL' | 'RECEIVED' | 'PUTAWAY_PENDING' | 'COMPLETE' | 'CANCELLED';
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

export interface ExpiryAlertsSummary {
  expired: number;
  critical: number;
  warning: number;
}

export interface ExpiringStock {
  tenantId: string;
  binId: string;
  binCode: string;
  itemId: string;
  itemSku: string;
  itemDescription: string;
  batchNo: string;
  expiryDate: string;
  qtyOnHand: number;
  qtyAvailable: number;
  expiryStatus: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK';
  daysUntilExpiry: number;
}

// Stock queries
export function useStockSnapshots(params: QueryParams & { warehouseId?: string }) {
  return useQuery({
    queryKey: [INVENTORY_KEY, 'stock-snapshots', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.search) searchParams.set('search', params.search);
      if (params.warehouseId) searchParams.set('warehouseId', params.warehouseId);

      const response = await api.get<PaginatedResult<StockSnapshot>>(
        `/inventory/stock-snapshots?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

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

export function useDeleteGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/receiving/grns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GRN_KEY] });
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

// Expiry alerts queries
export function useExpiryAlertsSummary() {
  return useQuery({
    queryKey: [EXPIRY_KEY, 'summary'],
    queryFn: async () => {
      const response = await api.get<ExpiryAlertsSummary>('/inventory/expiry-alerts');
      return response.data;
    },
  });
}

export function useExpiringStock(daysAhead?: number, warehouseId?: string) {
  return useQuery({
    queryKey: [EXPIRY_KEY, 'expiring', daysAhead, warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (daysAhead) params.set('daysAhead', String(daysAhead));
      if (warehouseId) params.set('warehouseId', warehouseId);

      const response = await api.get<ExpiringStock[]>(
        `/inventory/expiring-stock?${params.toString()}`
      );
      return response.data;
    },
  });
}

export function useExpiredStock(warehouseId?: string) {
  return useQuery({
    queryKey: [EXPIRY_KEY, 'expired', warehouseId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (warehouseId) params.set('warehouseId', warehouseId);

      const response = await api.get<ExpiringStock[]>(
        `/inventory/expired-stock?${params.toString()}`
      );
      return response.data;
    },
  });
}

// Adjustment queries
export function useAdjustments(params: QueryParams & { status?: string }) {
  return useQuery({
    queryKey: [ADJUSTMENT_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResult<Adjustment>>(
        `/inventory/adjustments?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useAdjustment(id: string | undefined) {
  return useQuery({
    queryKey: [ADJUSTMENT_KEY, id],
    queryFn: async () => {
      const response = await api.get<Adjustment>(`/inventory/adjustments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useAdjustmentLines(adjustmentId: string | undefined) {
  return useQuery({
    queryKey: [ADJUSTMENT_KEY, adjustmentId, 'lines'],
    queryFn: async () => {
      const response = await api.get<AdjustmentLine[]>(
        `/inventory/adjustments/${adjustmentId}/lines`
      );
      return response.data;
    },
    enabled: !!adjustmentId,
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      warehouseId: string;
      reason: string;
      notes?: string;
    }) => {
      const response = await api.post<Adjustment>('/inventory/adjustments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY] });
    },
  });
}

export function useAddAdjustmentLine(adjustmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      binId: string;
      itemId: string;
      qtyAfter: number;
      batchNo?: string;
    }) => {
      const response = await api.post<AdjustmentLine>(
        `/inventory/adjustments/${adjustmentId}/lines`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY, adjustmentId, 'lines'] });
    },
  });
}

export function useDeleteAdjustmentLine(adjustmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineId: string) => {
      await api.delete(`/inventory/adjustments/${adjustmentId}/lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY, adjustmentId, 'lines'] });
    },
  });
}

export function useSubmitAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Adjustment>(`/inventory/adjustments/${id}/submit`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY] });
    },
  });
}

export function useApproveAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Adjustment>(`/inventory/adjustments/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY] });
    },
  });
}

export function useDeleteAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/adjustments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY] });
    },
  });
}

export function usePostAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Adjustment>(`/inventory/adjustments/${id}/post`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

// Cycle Count types (extended with joined fields)
export interface CycleCountSummary extends CycleCount {
  warehouseName?: string;
  lineCount?: number;
  varianceCount?: number;
}

export interface CycleCountLineDetail extends CycleCountLine {
  binCode?: string;
  itemSku?: string;
  itemDescription?: string;
}

// Cycle Count queries
export function useCycleCounts(params: QueryParams & { status?: string }) {
  return useQuery({
    queryKey: [CYCLE_COUNT_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);

      const response = await api.get<PaginatedResult<CycleCountSummary>>(
        `/inventory/cycle-counts?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useCycleCount(id: string | undefined) {
  return useQuery({
    queryKey: [CYCLE_COUNT_KEY, id],
    queryFn: async () => {
      const response = await api.get<CycleCountSummary>(`/inventory/cycle-counts/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCycleCountLines(cycleCountId: string | undefined) {
  return useQuery({
    queryKey: [CYCLE_COUNT_KEY, cycleCountId, 'lines'],
    queryFn: async () => {
      const response = await api.get<CycleCountLineDetail[]>(
        `/inventory/cycle-counts/${cycleCountId}/lines`
      );
      return response.data;
    },
    enabled: !!cycleCountId,
  });
}

export function useCreateCycleCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { warehouseId: string }) => {
      const response = await api.post<CycleCountSummary>('/inventory/cycle-counts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY] });
    },
  });
}

export function useAddCycleCountLine(cycleCountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { binId: string; itemId: string }) => {
      const response = await api.post<CycleCountLineDetail>(
        `/inventory/cycle-counts/${cycleCountId}/lines`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY, cycleCountId, 'lines'] });
    },
  });
}

export function useAddCycleCountLinesFromBin(cycleCountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { binId: string }) => {
      const response = await api.post(
        `/inventory/cycle-counts/${cycleCountId}/lines/from-bin`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY, cycleCountId, 'lines'] });
    },
  });
}

export function useRemoveCycleCountLine(cycleCountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineId: string) => {
      await api.delete(`/inventory/cycle-counts/${cycleCountId}/lines/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY, cycleCountId, 'lines'] });
    },
  });
}

export function useStartCycleCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CycleCountSummary>(`/inventory/cycle-counts/${id}/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY] });
    },
  });
}

export function useRecordCount(cycleCountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineId, countedQty }: { lineId: string; countedQty: number }) => {
      const response = await api.post<CycleCountLineDetail>(
        `/inventory/cycle-counts/${cycleCountId}/lines/${lineId}/record`,
        { countedQty }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY, cycleCountId, 'lines'] });
    },
  });
}

export function useCompleteCycleCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CycleCountSummary>(`/inventory/cycle-counts/${id}/complete`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY] });
    },
  });
}

export function useGenerateAdjustmentFromCycleCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Adjustment>(
        `/inventory/cycle-counts/${id}/generate-adjustment`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADJUSTMENT_KEY] });
    },
  });
}

export function useCloseCycleCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CycleCountSummary>(`/inventory/cycle-counts/${id}/close`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY] });
    },
  });
}

export function useDeleteCycleCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/cycle-counts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY] });
    },
  });
}

export function useCancelCycleCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CycleCountSummary>(`/inventory/cycle-counts/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CYCLE_COUNT_KEY] });
    },
  });
}

// ============ Putaway ============

export interface PutawayTaskDetail extends PutawayTask {
  itemSku: string;
  itemDescription: string;
  fromBinCode: string;
  toBinCode: string | null;
  assignedToName: string | null;
  grnId: string;
  batchNo: string | null;
}

export function usePutawayTasks(params: {
  page?: number;
  limit?: number;
  status?: string;
  warehouseId?: string;
  assignedTo?: string;
}) {
  return useQuery({
    queryKey: [PUTAWAY_KEY, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.status) query.set('status', params.status);
      if (params.warehouseId) query.set('warehouseId', params.warehouseId);
      if (params.assignedTo) query.set('assignedTo', params.assignedTo);
      const { data } = await api.get<{ data: PutawayTaskDetail[]; total: number }>(`/inventory/putaway?${query.toString()}`);
      return data;
    },
  });
}

export function usePutawayTask(id: string | undefined) {
  return useQuery({
    queryKey: [PUTAWAY_KEY, id],
    queryFn: async () => {
      const response = await api.get<PutawayTaskDetail>(`/inventory/putaway/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePutawayTasksByGrn(grnId: string | undefined) {
  return useQuery({
    queryKey: [PUTAWAY_KEY, 'grn', grnId],
    queryFn: async () => {
      const response = await api.get<PutawayTaskDetail[]>(`/receiving/grns/${grnId}/putaway-tasks`);
      return response.data;
    },
    enabled: !!grnId,
  });
}

export function useGeneratePutawayTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grnId: string) => {
      const response = await api.post<PutawayTaskDetail[]>(`/receiving/grns/${grnId}/generate-putaway`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUTAWAY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GRN_KEY] });
    },
  });
}

export function useAssignPutawayTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await api.post<PutawayTaskDetail>(`/inventory/putaway/${id}/assign`, { userId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUTAWAY_KEY] });
    },
  });
}

export function useCompletePutawayTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, toBinId }: { id: string; toBinId: string }) => {
      const response = await api.post<PutawayTaskDetail>(`/inventory/putaway/${id}/complete`, { toBinId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUTAWAY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GRN_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEY] });
    },
  });
}

export function useCancelPutawayTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<PutawayTaskDetail>(`/inventory/putaway/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PUTAWAY_KEY] });
    },
  });
}
