import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Customer, PaginatedResult } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const CUSTOMERS_KEY = 'customers';

interface CreateCustomerData {
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  vatNo?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
}

interface UpdateCustomerData extends Partial<CreateCustomerData> {
  isActive?: boolean;
}

// Fetch paginated customers
export function useCustomers(params: QueryParams) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
      if (params.search) searchParams.set('search', params.search);

      const response = await api.get<PaginatedResult<Customer>>(
        `/masterdata/customers?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

// Fetch single customer
export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: async () => {
      const response = await api.get<Customer>(`/masterdata/customers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerData) => {
      const response = await api.post<Customer>('/masterdata/customers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}

// Update customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCustomerData }) => {
      const response = await api.patch<Customer>(`/masterdata/customers/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY, variables.id] });
    },
  });
}

// Delete customer
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/masterdata/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}
