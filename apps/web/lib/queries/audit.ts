import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const AUDIT_KEY = 'audit';

export interface AuditEntryWithActor {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditSearchParams {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  actorUserId?: string;
  fromDate?: string;
  toDate?: string;
}

export function useAuditLogs(params: AuditSearchParams) {
  return useQuery({
    queryKey: [AUDIT_KEY, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      if (params.entityType) query.set('entityType', params.entityType);
      if (params.action) query.set('action', params.action);
      if (params.actorUserId) query.set('actorUserId', params.actorUserId);
      if (params.fromDate) query.set('fromDate', params.fromDate);
      if (params.toDate) query.set('toDate', params.toDate);
      const { data } = await api.get<{
        data: AuditEntryWithActor[];
        total: number;
        page: number;
        limit: number;
      }>(`/audit?${query.toString()}`);
      return data;
    },
  });
}
