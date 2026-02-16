import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Supplier, SupplierContact, SupplierNote, SupplierNcr, SupplierItem, SupplierContract, PaginatedResult, AuditEntry } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const SUPPLIERS_KEY = 'suppliers';

interface CreateSupplierData {
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  vatNo?: string;
  contactPerson?: string;
  registrationNo?: string;
  // Postal Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  // Trading Address
  tradingAddressLine1?: string;
  tradingAddressLine2?: string;
  tradingCity?: string;
  tradingPostalCode?: string;
  tradingCountry?: string;
}

interface UpdateSupplierData extends Partial<CreateSupplierData> {
  isActive?: boolean;
}

// Fetch paginated suppliers
export function useSuppliers(params: QueryParams) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<Supplier>>(
        `/masterdata/suppliers?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

// Fetch single supplier
export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, id],
    queryFn: async () => {
      const response = await api.get<Supplier>(`/masterdata/suppliers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Fetch supplier activity log
export function useSupplierActivity(id: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, id, 'activity'],
    queryFn: async () => {
      const response = await api.get<AuditEntry[]>(`/masterdata/suppliers/${id}/activity`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create supplier
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSupplierData) => {
      const response = await api.post<Supplier>('/masterdata/suppliers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
}

// Update supplier
export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSupplierData }) => {
      const response = await api.patch<Supplier>(`/masterdata/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.id] });
    },
  });
}

// Delete supplier
export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/masterdata/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY] });
    },
  });
}

// === CONTACTS ===

interface CreateContactData {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
}

interface UpdateContactData extends Partial<CreateContactData> {
  isActive?: boolean;
}

// Fetch supplier contacts
export function useSupplierContacts(supplierId: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, supplierId, 'contacts'],
    queryFn: async () => {
      const response = await api.get<SupplierContact[]>(`/masterdata/suppliers/${supplierId}/contacts`);
      return response.data;
    },
    enabled: !!supplierId,
  });
}

// Create supplier contact
export function useCreateSupplierContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, data }: { supplierId: string; data: CreateContactData }) => {
      const response = await api.post<SupplierContact>(`/masterdata/suppliers/${supplierId}/contacts`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'contacts'] });
    },
  });
}

// Update supplier contact
export function useUpdateSupplierContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, data, supplierId }: { contactId: string; data: UpdateContactData; supplierId: string }) => {
      const response = await api.patch<SupplierContact>(`/masterdata/suppliers/contacts/${contactId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'contacts'] });
    },
  });
}

// Delete supplier contact
export function useDeleteSupplierContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, supplierId }: { contactId: string; supplierId: string }) => {
      await api.delete(`/masterdata/suppliers/contacts/${contactId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'contacts'] });
    },
  });
}

// === NOTES ===

// Fetch supplier notes
export function useSupplierNotes(supplierId: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, supplierId, 'notes'],
    queryFn: async () => {
      const response = await api.get<SupplierNote[]>(`/masterdata/suppliers/${supplierId}/notes`);
      return response.data;
    },
    enabled: !!supplierId,
  });
}

// Create supplier note
export function useCreateSupplierNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, content }: { supplierId: string; content: string }) => {
      const response = await api.post<SupplierNote>(`/masterdata/suppliers/${supplierId}/notes`, { content });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'notes'] });
    },
  });
}

// Delete supplier note
export function useDeleteSupplierNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, supplierId }: { noteId: string; supplierId: string }) => {
      await api.delete(`/masterdata/suppliers/notes/${noteId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'notes'] });
    },
  });
}

// === NCRs ===

interface CreateNcrData {
  ncrType: 'QUALITY' | 'DELIVERY' | 'QUANTITY' | 'DOCUMENTATION' | 'OTHER';
  description: string;
}

// Fetch supplier NCRs
export function useSupplierNcrs(supplierId: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, supplierId, 'ncrs'],
    queryFn: async () => {
      const response = await api.get<SupplierNcr[]>(`/masterdata/suppliers/${supplierId}/ncrs`);
      return response.data;
    },
    enabled: !!supplierId,
  });
}

// Fetch single NCR
export function useSupplierNcr(ncrId: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, 'ncrs', ncrId],
    queryFn: async () => {
      const response = await api.get<SupplierNcr>(`/masterdata/suppliers/ncrs/${ncrId}`);
      return response.data;
    },
    enabled: !!ncrId,
  });
}

// Create supplier NCR
export function useCreateSupplierNcr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, data }: { supplierId: string; data: CreateNcrData }) => {
      const response = await api.post<SupplierNcr>(`/masterdata/suppliers/${supplierId}/ncrs`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'ncrs'] });
    },
  });
}

// Resolve supplier NCR
export function useResolveSupplierNcr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ncrId, resolution, supplierId }: { ncrId: string; resolution: string; supplierId: string }) => {
      const response = await api.post<SupplierNcr>(`/masterdata/suppliers/ncrs/${ncrId}/resolve`, { resolution });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'ncrs'] });
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, 'ncrs', variables.ncrId] });
    },
  });
}

// === SUPPLIER ITEMS (Products & Services) ===

interface CreateSupplierItemData {
  itemId: string;
  supplierSku?: string;
  unitCost?: number;
  leadTimeDays?: number;
  minOrderQty?: number;
  isPreferred?: boolean;
}

interface UpdateSupplierItemData {
  supplierSku?: string;
  unitCost?: number;
  leadTimeDays?: number;
  minOrderQty?: number;
  isPreferred?: boolean;
  isActive?: boolean;
}

// Fetch supplier items
export function useSupplierItems(supplierId: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, supplierId, 'items'],
    queryFn: async () => {
      const response = await api.get<SupplierItem[]>(`/masterdata/suppliers/${supplierId}/items`);
      return response.data;
    },
    enabled: !!supplierId,
  });
}

// Add item to supplier
export function useAddSupplierItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, data }: { supplierId: string; data: CreateSupplierItemData }) => {
      const response = await api.post<SupplierItem>(`/masterdata/suppliers/${supplierId}/items`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'items'] });
    },
  });
}

// Update supplier item
export function useUpdateSupplierItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, data, supplierId }: { itemId: string; data: UpdateSupplierItemData; supplierId: string }) => {
      const response = await api.patch<SupplierItem>(`/masterdata/suppliers/items/${itemId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'items'] });
    },
  });
}

// Remove supplier item
export function useRemoveSupplierItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, supplierId }: { itemId: string; supplierId: string }) => {
      await api.delete(`/masterdata/suppliers/items/${itemId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'items'] });
    },
  });
}

// === SUPPLIER CONTRACTS ===

interface CreateContractData {
  name: string;
  startDate: string;
  endDate: string;
  terms?: string;
  totalValue?: number;
  currency?: string;
}

interface UpdateContractData {
  name?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  terms?: string;
  totalValue?: number;
}

// Fetch supplier contracts
export function useSupplierContracts(supplierId: string | undefined) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, supplierId, 'contracts'],
    queryFn: async () => {
      const response = await api.get<SupplierContract[]>(`/masterdata/suppliers/${supplierId}/contracts`);
      return response.data;
    },
    enabled: !!supplierId,
  });
}

// Create supplier contract
export function useCreateSupplierContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, data }: { supplierId: string; data: CreateContractData }) => {
      const response = await api.post<SupplierContract>(`/masterdata/suppliers/${supplierId}/contracts`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'contracts'] });
    },
  });
}

// Update supplier contract
export function useUpdateSupplierContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, data, supplierId }: { contractId: string; data: UpdateContractData; supplierId: string }) => {
      const response = await api.patch<SupplierContract>(`/masterdata/suppliers/contracts/${contractId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUPPLIERS_KEY, variables.supplierId, 'contracts'] });
    },
  });
}

// === ANALYTICS ===

export interface SupplierDashboardSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  totalPOValue: number;
  avgPOValue: number;
  openNCRs: number;
  activeContracts: number;
  topSuppliersByPO: Array<{
    id: string;
    name: string;
    totalValue: number;
    poCount: number;
  }>;
  recentNCRs: Array<{
    id: string;
    ncrNo: string;
    supplierName: string;
    ncrType: string;
    status: string;
    createdAt: string;
  }>;
}

export interface SupplierPerformanceStats {
  id: string;
  code: string | null;
  name: string;
  totalPOs: number;
  totalPOValue: number;
  avgPOValue: number;
  openNCRs: number;
  closedNCRs: number;
  totalNCRs: number;
  ncrRate: number;
  activeContracts: number;
  lastPODate: string | null;
}

export interface MonthlyTrend {
  month: string;
  count: number;
  value?: number;
}

// Fetch supplier dashboard summary
export function useSupplierDashboardSummary() {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, 'analytics', 'summary'],
    queryFn: async () => {
      const response = await api.get<SupplierDashboardSummary>('/masterdata/suppliers/analytics/summary');
      return response.data;
    },
  });
}

// Fetch supplier performance stats
export function useSupplierPerformanceStats(params: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, 'analytics', 'performance', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      const response = await api.get<PaginatedResult<SupplierPerformanceStats>>(
        `/masterdata/suppliers/analytics/performance?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

// Fetch NCR trends by month
export function useNcrTrends(months: number = 12) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, 'analytics', 'ncr-trends', months],
    queryFn: async () => {
      const response = await api.get<MonthlyTrend[]>(`/masterdata/suppliers/analytics/ncr-trends?months=${months}`);
      return response.data;
    },
  });
}

// Fetch purchase order trends by month
export function usePurchaseOrderTrends(months: number = 12) {
  return useQuery({
    queryKey: [SUPPLIERS_KEY, 'analytics', 'po-trends', months],
    queryFn: async () => {
      const response = await api.get<MonthlyTrend[]>(`/masterdata/suppliers/analytics/po-trends?months=${months}`);
      return response.data;
    },
  });
}
