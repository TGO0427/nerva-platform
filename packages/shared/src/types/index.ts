// Common types shared between API and Web

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

// Auth
export interface LoginRequest {
  tenantId: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    tenantId: string;
  };
}

export interface CurrentUser {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  permissions: string[];
}

// Master Data
export interface Item {
  id: string;
  tenantId: string;
  sku: string;
  description: string;
  uom: string;
  weightKg: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  vatNo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bin {
  id: string;
  tenantId: string;
  warehouseId: string;
  code: string;
  binType: string;
  isActive: boolean;
}

// Inventory
export interface StockOnHand {
  itemId: string;
  binId: string;
  batchNo: string | null;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

// Sales
export interface SalesOrder {
  id: string;
  tenantId: string;
  orderNo: string;
  customerId: string;
  status: SalesOrderStatus;
  priority: number;
  requestedShipDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'ALLOCATED'
  | 'PICKING'
  | 'PACKING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface SalesOrderLine {
  id: string;
  salesOrderId: string;
  lineNo: number;
  itemId: string;
  qtyOrdered: number;
  qtyAllocated: number;
  qtyPicked: number;
  qtyShipped: number;
  unitPrice: number | null;
}

// Dispatch
export interface DispatchTrip {
  id: string;
  tripNo: string;
  status: TripStatus;
  vehicleId: string | null;
  driverId: string | null;
  plannedDate: string | null;
  totalStops: number;
  createdAt: string;
}

export type TripStatus =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'LOADING'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'CANCELLED';

export interface DispatchStop {
  id: string;
  tripId: string;
  sequence: number;
  customerId: string | null;
  addressLine1: string;
  city: string | null;
  status: StopStatus;
}

export type StopStatus =
  | 'PENDING'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'FAILED'
  | 'PARTIAL'
  | 'SKIPPED';

// Returns
export interface Rma {
  id: string;
  rmaNo: string;
  customerId: string;
  status: RmaStatus;
  returnType: string;
  createdAt: string;
}

export type RmaStatus =
  | 'OPEN'
  | 'AWAITING_RETURN'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'DISPOSITION_COMPLETE'
  | 'CREDIT_PENDING'
  | 'CREDIT_APPROVED'
  | 'CLOSED'
  | 'CANCELLED';

export type Disposition =
  | 'PENDING'
  | 'RESTOCK'
  | 'QUARANTINE'
  | 'SCRAP'
  | 'RETURN_TO_SUPPLIER';

// Integrations
export interface IntegrationConnection {
  id: string;
  type: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING_AUTH';
  lastSyncAt: string | null;
  errorMessage: string | null;
}

export interface PostingQueueItem {
  id: string;
  docType: string;
  docId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  attempts: number;
  lastError: string | null;
  externalRef: string | null;
  createdAt: string;
}
