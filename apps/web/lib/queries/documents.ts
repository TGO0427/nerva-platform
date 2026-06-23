import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginationMeta } from '@/components/ui/data-table';

export type DocumentStatus = 'APPROVED' | 'PENDING' | 'MISSING' | 'REJECTED';
export type ExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

export interface ComplianceDocument {
  id: string;
  entityType: string;
  entityId: string | null;
  linkedLabel: string | null;
  documentType: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number | null;
  s3Key: string;
  s3Bucket: string;
  status: DocumentStatus;
  expiryDate: string | null;
  expiryStatus: ExpiryStatus;
  ownerName: string | null;
  notes: string | null;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsResponse {
  data: ComplianceDocument[];
  meta: PaginationMeta;
}

export interface DocumentStats {
  approved: number;
  pending: number;
  missing: number;
  needsAction: number;
}

export interface DocumentFilters {
  search?: string;
  documentType?: string;
  entityType?: string;
  status?: string;
  expiryStatus?: string;
  page?: number;
  limit?: number;
}

export interface CreateDocumentInput {
  entityType: string;
  entityId?: string;
  linkedLabel?: string;
  documentType: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number;
  s3Key: string;
  s3Bucket: string;
  status?: DocumentStatus;
  expiryDate?: string;
  ownerName?: string;
  notes?: string;
}

const DOCUMENTS_KEY = 'documents';

export function useDocuments(filters: DocumentFilters) {
  return useQuery({
    queryKey: [DOCUMENTS_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'All') {
          params.set(key, String(value));
        }
      });
      const response = await api.get<DocumentsResponse>(`/documents?${params.toString()}`);
      return response.data;
    },
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useDocumentStats() {
  return useQuery({
    queryKey: [DOCUMENTS_KEY, 'stats'],
    queryFn: async () => {
      const response = await api.get<DocumentStats>('/documents/stats');
      return response.data;
    },
    retry: false,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDocumentInput) => {
      const response = await api.post<ComplianceDocument>('/documents', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENTS_KEY] });
    },
  });
}
