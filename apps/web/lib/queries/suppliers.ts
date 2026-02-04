import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Supplier, PaginatedResult, AuditEntry } from '@nerva/shared';
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
