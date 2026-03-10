import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface TenantWithStats {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

export interface TenantDetailStats {
  userCount: number;
  itemCount: number;
  warehouseCount: number;
  orderCount: number;
  siteCount: number;
  lastActivity: string | null;
}

const ADMIN_TENANTS_KEY = 'admin-tenants';

export function useAdminTenants() {
  return useQuery({
    queryKey: [ADMIN_TENANTS_KEY],
    queryFn: async () => {
      const response = await api.get<TenantWithStats[]>('/admin/tenants/stats');
      return response.data;
    },
  });
}

export function useAdminTenantStats(tenantId: string | null) {
  return useQuery({
    queryKey: [ADMIN_TENANTS_KEY, tenantId, 'stats'],
    queryFn: async () => {
      const response = await api.get<TenantDetailStats>(`/admin/tenants/${tenantId}/stats`);
      return response.data;
    },
    enabled: !!tenantId,
  });
}
