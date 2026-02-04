import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const REPORTS_KEY = 'reports';

export interface SalesReportSummary {
  totalOrders: number;
  totalValue: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  shippedOrders: number;
  cancelledOrders: number;
}

export interface SalesReportDayData {
  date: string;
  orderCount: number;
  dailyValue: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  orderCount: number;
  totalValue: number;
}

export interface TopItem {
  id: string;
  sku: string;
  description: string;
  qtySold: number;
  totalValue: number;
}

export interface SalesReport {
  summary: SalesReportSummary;
  byDay: SalesReportDayData[];
  topCustomers: TopCustomer[];
  topItems: TopItem[];
}

export interface InventoryReportSummary {
  totalItems: number;
  totalQty: number;
  totalValue: number;
  lowStockCount: number;
  expiringCount: number;
}

export interface WarehouseInventory {
  id: string;
  name: string;
  code: string | null;
  itemCount: number;
  totalQty: number;
  totalValue: number;
}

export interface LowStockItem {
  inventoryId: string;
  itemId: string;
  sku: string;
  description: string;
  warehouseName: string;
  qtyOnHand: number;
  reorderPoint: number;
}

export interface ExpiringItem {
  inventoryId: string;
  itemId: string;
  sku: string;
  description: string;
  warehouseName: string;
  qtyOnHand: number;
  batchNumber: string | null;
  expiryDate: string | null;
}

export interface InventoryReport {
  summary: InventoryReportSummary;
  byWarehouse: WarehouseInventory[];
  lowStock: LowStockItem[];
  expiringSoon: ExpiringItem[];
}

export interface ProcurementReportSummary {
  totalPOs: number;
  totalValue: number;
  avgPOValue: number;
  uniqueSuppliers: number;
  receivedPOs: number;
  pendingPOs: number;
}

export interface ProcurementMonthData {
  month: string;
  poCount: number;
  monthlyValue: number;
}

export interface TopSupplier {
  id: string;
  name: string;
  code: string | null;
  poCount: number;
  totalValue: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  value: number;
}

export interface ProcurementReport {
  summary: ProcurementReportSummary;
  byMonth: ProcurementMonthData[];
  topSuppliers: TopSupplier[];
  byStatus: StatusBreakdown[];
}

// Fetch sales report
export function useSalesReport(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'sales', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const response = await api.get<SalesReport>(`/reports/sales?${params.toString()}`);
      return response.data;
    },
  });
}

// Fetch inventory report
export function useInventoryReport() {
  return useQuery({
    queryKey: [REPORTS_KEY, 'inventory'],
    queryFn: async () => {
      const response = await api.get<InventoryReport>('/reports/inventory');
      return response.data;
    },
  });
}

// Fetch procurement report
export function useProcurementReport(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [REPORTS_KEY, 'procurement', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const response = await api.get<ProcurementReport>(`/reports/procurement?${params.toString()}`);
      return response.data;
    },
  });
}
