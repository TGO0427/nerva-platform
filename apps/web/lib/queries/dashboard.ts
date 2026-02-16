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
  // Operational KPIs
  otifPercent: number;
  returnsRate: number;
  podCompletionPercent: number;
  avgDispatchCycleHours: number;
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

// Weekly trend (orders + shipments per week)
export interface WeeklyTrend {
  week: string;
  orders: number;
  shipments: number;
}

export function useWeeklyTrend() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'weekly-trend'],
    queryFn: async () => {
      const response = await api.get<WeeklyTrend[]>('/dashboard/weekly-trend');
      return response.data;
    },
    refetchInterval: 60000,
  });
}

// Status distribution (order statuses)
export interface StatusDistribution {
  status: string;
  count: number;
}

export function useStatusDistribution() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'status-distribution'],
    queryFn: async () => {
      const response = await api.get<StatusDistribution[]>('/dashboard/status-distribution');
      return response.data;
    },
    refetchInterval: 60000,
  });
}

// Orders by warehouse
export interface WarehouseBreakdown {
  warehouse: string;
  orders: number;
}

export function useOrdersByWarehouse() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'by-warehouse'],
    queryFn: async () => {
      const response = await api.get<WarehouseBreakdown[]>('/dashboard/by-warehouse');
      return response.data;
    },
    refetchInterval: 60000,
  });
}

// Top customers
interface DashboardTopCustomer {
  name: string;
  orders: number;
}

export function useTopCustomers() {
  return useQuery({
    queryKey: [DASHBOARD_KEY, 'top-customers'],
    queryFn: async () => {
      const response = await api.get<DashboardTopCustomer[]>('/dashboard/top-customers');
      return response.data;
    },
    refetchInterval: 60000,
  });
}
