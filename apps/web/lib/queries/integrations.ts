import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { IntegrationConnection, PostingQueueItem } from '@nerva/shared';

const INTEGRATIONS_KEY = 'integrations';
const POSTING_QUEUE_KEY = 'posting-queue';

// Connections
export function useIntegrations() {
  return useQuery({
    queryKey: [INTEGRATIONS_KEY],
    queryFn: async () => {
      const response = await api.get<IntegrationConnection[]>('/integrations');
      return response.data;
    },
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, name }: { type: string; name: string }) => {
      const response = await api.post<IntegrationConnection>(
        `/integrations/${type}/connect`,
        { name },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTEGRATIONS_KEY] });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<IntegrationConnection>(
        `/integrations/${id}/disconnect`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTEGRATIONS_KEY] });
    },
  });
}

// Posting Queue
interface PostingQueueResponse {
  data: PostingQueueItem[];
  meta: { page: number; limit: number };
}

export function usePostingQueue(params: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: [POSTING_QUEUE_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set('status', params.status);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));

      const response = await api.get<PostingQueueResponse>(
        `/integrations/posting-queue?${searchParams.toString()}`,
      );
      return response.data;
    },
  });
}

export function useRetryPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<PostingQueueItem>(
        `/integrations/posting-queue/${id}/retry`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POSTING_QUEUE_KEY] });
    },
  });
}
