import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Workstation,
  BomHeader,
  BomLine,
  Routing,
  RoutingOperation,
  WorkOrder,
  WorkOrderOperation,
  WorkOrderMaterial,
  ProductionLedgerEntry,
  BomComparison,
  PaginatedResult,
} from '@nerva/shared';
import type { QueryParams } from './use-query-params';

// Keys
const WORKSTATIONS_KEY = 'workstations';
const BOMS_KEY = 'boms';
const ROUTINGS_KEY = 'routings';
const WORK_ORDERS_KEY = 'work-orders';
const PRODUCTION_LEDGER_KEY = 'production-ledger';

// ============ Workstations ============
interface WorkstationFilters {
  siteId?: string;
  status?: string;
  search?: string;
}

export function useWorkstations(params: QueryParams & WorkstationFilters) {
  return useQuery({
    queryKey: [WORKSTATIONS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.siteId) searchParams.set('siteId', params.siteId);
      if (params.status) searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<Workstation>>(
        `/manufacturing/workstations?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useWorkstation(id: string | undefined) {
  return useQuery({
    queryKey: [WORKSTATIONS_KEY, id],
    queryFn: async () => {
      const response = await api.get<Workstation>(`/manufacturing/workstations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateWorkstation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      description?: string;
      workstationType: string;
      capacityPerHour?: number;
      costPerHour?: number;
    }) => {
      const response = await api.post<Workstation>('/manufacturing/workstations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKSTATIONS_KEY] });
    },
  });
}

export function useUpdateWorkstation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Workstation>) => {
      const response = await api.patch<Workstation>(`/manufacturing/workstations/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [WORKSTATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORKSTATIONS_KEY, id] });
    },
  });
}

export function useDeleteWorkstation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/manufacturing/workstations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKSTATIONS_KEY] });
    },
  });
}

// ============ BOMs ============
interface BomFilters {
  itemId?: string;
  status?: string;
  search?: string;
}

export interface BomWithLines extends BomHeader {
  lines: (BomLine & { itemSku?: string; itemDescription?: string })[];
}

export function useBoms(params: QueryParams & BomFilters) {
  return useQuery({
    queryKey: [BOMS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.itemId) searchParams.set('itemId', params.itemId);
      if (params.status) searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<BomHeader & { itemSku?: string; itemDescription?: string; lineCount?: number }>>(
        `/manufacturing/boms?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useBom(id: string | undefined) {
  return useQuery({
    queryKey: [BOMS_KEY, id],
    queryFn: async () => {
      const response = await api.get<BomWithLines>(`/manufacturing/boms/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateBom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      itemId: string;
      baseQty?: number;
      uom?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      notes?: string;
      lines: Array<{
        itemId: string;
        qtyPer: number;
        uom?: string;
        scrapPct?: number;
        isCritical?: boolean;
        notes?: string;
      }>;
    }) => {
      const response = await api.post<BomWithLines>('/manufacturing/boms', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY] });
    },
  });
}

export function useUpdateBom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<BomHeader>) => {
      const response = await api.patch<BomHeader>(`/manufacturing/boms/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY, id] });
    },
  });
}

export function useDeleteBom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/manufacturing/boms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY] });
    },
  });
}

export function useCreateBomVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<BomWithLines>(`/manufacturing/boms/${id}/new-version`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY] });
    },
  });
}

export function useSubmitBom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<BomHeader>(`/manufacturing/boms/${id}/submit`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY, id] });
    },
  });
}

export function useApproveBom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<BomHeader>(`/manufacturing/boms/${id}/approve`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY, id] });
    },
  });
}

export function useObsoleteBom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<BomHeader>(`/manufacturing/boms/${id}/obsolete`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [BOMS_KEY, id] });
    },
  });
}

export function useCompareBoms(id1: string | undefined, id2: string | undefined) {
  return useQuery({
    queryKey: [BOMS_KEY, 'compare', id1, id2],
    queryFn: async () => {
      const response = await api.get<BomComparison>(`/manufacturing/boms/${id1}/compare/${id2}`);
      return response.data;
    },
    enabled: !!id1 && !!id2,
  });
}

// ============ Routings ============
interface RoutingFilters {
  itemId?: string;
  status?: string;
  search?: string;
}

export interface RoutingWithOperations extends Routing {
  operations: (RoutingOperation & { workstationCode?: string; workstationName?: string })[];
}

export function useRoutings(params: QueryParams & RoutingFilters) {
  return useQuery({
    queryKey: [ROUTINGS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.itemId) searchParams.set('itemId', params.itemId);
      if (params.status) searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<Routing & { itemSku?: string; itemDescription?: string; operationCount?: number }>>(
        `/manufacturing/routings?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useRouting(id: string | undefined) {
  return useQuery({
    queryKey: [ROUTINGS_KEY, id],
    queryFn: async () => {
      const response = await api.get<RoutingWithOperations>(`/manufacturing/routings/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateRouting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      itemId: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      notes?: string;
      operations: Array<{
        name: string;
        description?: string;
        workstationId?: string;
        setupTimeMins?: number;
        runTimeMins: number;
        queueTimeMins?: number;
        overlapPct?: number;
        isSubcontracted?: boolean;
        instructions?: string;
      }>;
    }) => {
      const response = await api.post<RoutingWithOperations>('/manufacturing/routings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ROUTINGS_KEY] });
    },
  });
}

export function useApproveRouting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Routing>(`/manufacturing/routings/${id}/approve`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [ROUTINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ROUTINGS_KEY, id] });
    },
  });
}

export function useObsoleteRouting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Routing>(`/manufacturing/routings/${id}/obsolete`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [ROUTINGS_KEY] });
      queryClient.invalidateQueries({ queryKey: [ROUTINGS_KEY, id] });
    },
  });
}

// ============ Work Orders ============
interface WorkOrderFilters {
  status?: string;
  itemId?: string;
  warehouseId?: string;
  search?: string;
}

export interface WorkOrderDetail extends WorkOrder {
  operations: (WorkOrderOperation & { workstationCode?: string; workstationName?: string; assignedUserName?: string })[];
  materials: (WorkOrderMaterial & { itemSku?: string; itemDescription?: string })[];
}

export function useWorkOrders(params: QueryParams & WorkOrderFilters) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.itemId) searchParams.set('itemId', params.itemId);
      if (params.warehouseId) searchParams.set('warehouseId', params.warehouseId);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<WorkOrder & { itemSku?: string; itemDescription?: string; warehouseName?: string }>>(
        `/manufacturing/work-orders?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useWorkOrder(id: string | undefined) {
  return useQuery({
    queryKey: [WORK_ORDERS_KEY, id],
    queryFn: async () => {
      const response = await api.get<WorkOrderDetail>(`/manufacturing/work-orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useGenerateWorkOrderNumber() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ workOrderNo: string }>('/manufacturing/work-orders/next-number');
      return response.data.workOrderNo;
    },
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      warehouseId: string;
      workOrderNo?: string;
      itemId: string;
      bomHeaderId?: string;
      routingId?: string;
      priority?: number;
      qtyOrdered: number;
      plannedStart?: string;
      plannedEnd?: string;
      salesOrderId?: string;
      notes?: string;
    }) => {
      const response = await api.post<WorkOrderDetail>('/manufacturing/work-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<WorkOrder>) => {
      const response = await api.patch<WorkOrder>(`/manufacturing/work-orders/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, id] });
    },
  });
}

export function useReleaseWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<WorkOrder>(`/manufacturing/work-orders/${id}/release`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, id] });
    },
  });
}

export function useStartWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<WorkOrder>(`/manufacturing/work-orders/${id}/start`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, id] });
    },
  });
}

export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<WorkOrder>(`/manufacturing/work-orders/${id}/complete`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, id] });
    },
  });
}

export function useCancelWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<WorkOrder>(`/manufacturing/work-orders/${id}/cancel`);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, id] });
    },
  });
}

export function useIssueMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workOrderId, ...data }: {
      workOrderId: string;
      materialId: string;
      qty: number;
      binId: string;
      batchNo?: string;
    }) => {
      const response = await api.post<WorkOrderMaterial>(`/manufacturing/work-orders/${workOrderId}/issue-material`, data);
      return response.data;
    },
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, workOrderId] });
    },
  });
}

export function useRecordOutput() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workOrderId, ...data }: {
      workOrderId: string;
      qty: number;
      binId: string;
      batchNo?: string;
      operationId?: string;
      workstationId?: string;
      notes?: string;
    }) => {
      const response = await api.post<WorkOrderDetail>(`/manufacturing/work-orders/${workOrderId}/record-output`, data);
      return response.data;
    },
    onSuccess: (_, { workOrderId }) => {
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY, workOrderId] });
    },
  });
}

// ============ Production Ledger ============
interface ProductionLedgerFilters {
  workOrderId?: string;
  itemId?: string;
  entryType?: string;
  startDate?: string;
  endDate?: string;
}

export function useProductionLedger(params: QueryParams & ProductionLedgerFilters) {
  return useQuery({
    queryKey: [PRODUCTION_LEDGER_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.workOrderId) searchParams.set('workOrderId', params.workOrderId);
      if (params.itemId) searchParams.set('itemId', params.itemId);
      if (params.entryType) searchParams.set('entryType', params.entryType);
      if (params.startDate) searchParams.set('startDate', params.startDate);
      if (params.endDate) searchParams.set('endDate', params.endDate);

      const response = await api.get<PaginatedResult<ProductionLedgerEntry & {
        itemSku?: string;
        itemDescription?: string;
        workOrderNo?: string;
        operatorName?: string;
        warehouseName?: string;
        binCode?: string;
      }>>(
        `/manufacturing/production-ledger?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useProductionSummaryByWorkOrder() {
  return useQuery({
    queryKey: [PRODUCTION_LEDGER_KEY, 'summary', 'by-work-order'],
    queryFn: async () => {
      const response = await api.get<Array<{
        workOrderId: string;
        workOrderNo: string;
        itemSku: string;
        totalIssued: number;
        totalOutput: number;
        totalScrap: number;
      }>>('/manufacturing/production-ledger/summary/by-work-order');
      return response.data;
    },
  });
}

export function useProductionSummaryByItem(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [PRODUCTION_LEDGER_KEY, 'summary', 'by-item', startDate, endDate],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (startDate) searchParams.set('startDate', startDate);
      if (endDate) searchParams.set('endDate', endDate);

      const response = await api.get<Array<{
        itemId: string;
        itemSku: string;
        itemDescription: string;
        totalConsumed: number;
        totalProduced: number;
        totalScrapped: number;
      }>>(`/manufacturing/production-ledger/summary/by-item?${searchParams.toString()}`);
      return response.data;
    },
  });
}
