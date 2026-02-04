import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Customer, CustomerContact, CustomerNote, PaginatedResult, AuditEntry } from '@nerva/shared';
import type { QueryParams } from './use-query-params';

const CUSTOMERS_KEY = 'customers';
const CUSTOMER_CONTACTS_KEY = 'customer-contacts';
const CUSTOMER_NOTES_KEY = 'customer-notes';
const CUSTOMER_ACTIVITY_KEY = 'customer-activity';

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

// Activity Log
export function useCustomerActivity(customerId: string | undefined) {
  return useQuery({
    queryKey: [CUSTOMER_ACTIVITY_KEY, customerId],
    queryFn: async () => {
      const response = await api.get<AuditEntry[]>(`/masterdata/customers/${customerId}/activity`);
      return response.data;
    },
    enabled: !!customerId,
  });
}

// Contacts
export function useCustomerContacts(customerId: string | undefined) {
  return useQuery({
    queryKey: [CUSTOMER_CONTACTS_KEY, customerId],
    queryFn: async () => {
      const response = await api.get<CustomerContact[]>(`/masterdata/customers/${customerId}/contacts`);
      return response.data;
    },
    enabled: !!customerId,
  });
}

interface CreateContactData {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary?: boolean;
}

export function useCreateCustomerContact(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContactData) => {
      const response = await api.post<CustomerContact>(`/masterdata/customers/${customerId}/contacts`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_CONTACTS_KEY, customerId] });
    },
  });
}

interface UpdateContactData extends Partial<CreateContactData> {
  isActive?: boolean;
}

export function useUpdateCustomerContact(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, data }: { contactId: string; data: UpdateContactData }) => {
      const response = await api.patch<CustomerContact>(`/masterdata/customers/contacts/${contactId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_CONTACTS_KEY, customerId] });
    },
  });
}

export function useDeleteCustomerContact(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      await api.delete(`/masterdata/customers/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_CONTACTS_KEY, customerId] });
    },
  });
}

// Notes
export function useCustomerNotes(customerId: string | undefined) {
  return useQuery({
    queryKey: [CUSTOMER_NOTES_KEY, customerId],
    queryFn: async () => {
      const response = await api.get<CustomerNote[]>(`/masterdata/customers/${customerId}/notes`);
      return response.data;
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomerNote(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post<CustomerNote>(`/masterdata/customers/${customerId}/notes`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_NOTES_KEY, customerId] });
    },
  });
}

export function useDeleteCustomerNote(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      await api.delete(`/masterdata/customers/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_NOTES_KEY, customerId] });
    },
  });
}
