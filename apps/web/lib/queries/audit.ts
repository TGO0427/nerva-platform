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

// Dispatch-specific activity feed
const DISPATCH_ENTITY_TYPES = ['Trip', 'TripStop', 'Shipment'];

export function useDispatchActivity(limit = 15) {
  return useQuery({
    queryKey: [AUDIT_KEY, 'dispatch-activity', limit],
    queryFn: async () => {
      // Fetch recent activity for dispatch-related entities
      // Use Promise.allSettled to handle failures gracefully
      const results = await Promise.allSettled(
        DISPATCH_ENTITY_TYPES.map(async (entityType) => {
          const { data } = await api.get<{
            data: AuditEntryWithActor[];
          }>(`/audit?entityType=${entityType}&limit=${limit}`);
          return data.data;
        })
      );
      // Extract successful results, ignore failures
      const successfulResults = results
        .filter((r): r is PromiseFulfilledResult<AuditEntryWithActor[]> => r.status === 'fulfilled')
        .map(r => r.value);

      // Merge and sort by createdAt descending
      const merged = successfulResults.flat().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return merged.slice(0, limit);
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    retry: false, // Don't retry on failure
  });
}
