import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { QueryParams } from './use-query-params';

const INVOICES_KEY = 'invoices';

// Types
export interface Invoice {
  id: string;
  tenantId: string;
  siteId: string;
  salesOrderId: string | null;
  customerId: string;
  invoiceNo: string;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  paymentTerms: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  notes: string | null;
  createdBy: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  orderNo?: string;
}

export interface InvoiceLine {
  id: string;
  tenantId: string;
  invoiceId: string;
  salesOrderLineId: string | null;
  itemId: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
  createdAt: string;
  sku?: string;
  itemDescription?: string;
}

export interface InvoicePayment {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  recordedBy: string | null;
  recordedByName?: string;
  createdAt: string;
}

export interface InvoiceStats {
  outstandingCount: number;
  outstandingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  paidThisMonth: number;
  totalThisMonth: number;
}

export interface InvoiceWithDetails extends Invoice {
  lines: InvoiceLine[];
  payments: InvoicePayment[];
}

// Queries
export function useInvoices(params: QueryParams & { status?: string; customerId?: string }) {
  return useQuery({
    queryKey: [INVOICES_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page));
      searchParams.set('limit', String(params.limit));
      if (params.status) searchParams.set('status', params.status);
      if (params.customerId) searchParams.set('customerId', params.customerId);

      const response = await api.get<{ data: Invoice[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        `/finance/invoices?${searchParams.toString()}`
      );
      return response.data;
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [INVOICES_KEY, id],
    queryFn: async () => {
      const response = await api.get<InvoiceWithDetails>(`/finance/invoices/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: [INVOICES_KEY, 'stats'],
    queryFn: async () => {
      const response = await api.get<InvoiceStats>('/finance/invoices/stats');
      return response.data;
    },
  });
}

export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ salesOrderId, siteId }: { salesOrderId: string; siteId: string }) => {
      const response = await api.post<Invoice>(`/finance/invoices/from-order/${salesOrderId}?siteId=${siteId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post<Invoice>(`/finance/invoices/${invoiceId}/send`);
      return response.data;
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, invoiceId] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      ...data
    }: {
      invoiceId: string;
      amount: number;
      paymentDate?: string;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
    }) => {
      const response = await api.post<InvoicePayment>(`/finance/invoices/${invoiceId}/payments`, data);
      return response.data;
    },
    onSuccess: (_, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, invoiceId] });
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post<Invoice>(`/finance/invoices/${invoiceId}/cancel`);
      return response.data;
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, invoiceId] });
    },
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await api.post<Invoice>(`/finance/invoices/${invoiceId}/void`);
      return response.data;
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY, invoiceId] });
    },
  });
}
