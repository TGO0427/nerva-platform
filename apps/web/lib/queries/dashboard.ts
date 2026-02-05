import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const DASHBOARD_KEY = 'dashboard';

export interface DashboardStats {
  pendingOrders: number;
  allocatedOrders: number;
  shippedOrders: number;
  activePickWaves: number;
  pendingPickTasks: number;
  openReturns: number;
  lowStockItems: number;
  expiringItems: number;
  openNCRs: number;
  weeklySalesValue: number;
  weeklyOrdersCount: number;
  tripsInProgress: number;
  tripsCompletedToday: number;
  lateOrders: number;
}

export interface RecentActivity {
  type: string;
  id: string;
  reference: string;
  status: string;
  message: string;
  createdAt: string;
}

// Fetch dashboard stats
export function useDashboardStats() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'stats'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/dashboard/stats');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// Fetch recent activity
export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'activity', limit],
    queryFn: async () => {
      const response = await api.get<RecentActivity[]>(`/dashboard/activity?limit=${limit}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
