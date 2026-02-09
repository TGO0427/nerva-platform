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
  // Billing Address
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  // Shipping Address
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerContact {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  content: string;
  createdBy: string | null;
  createdByName?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  vatNo: string | null;
  contactPerson: string | null;
  registrationNo: string | null;
  // Postal Address
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  // Trading Address
  tradingAddressLine1: string | null;
  tradingAddressLine2: string | null;
  tradingCity: string | null;
  tradingPostalCode: string | null;
  tradingCountry: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierContact {
  id: string;
  supplierId: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface SupplierNote {
  id: string;
  supplierId: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

export interface SupplierNcr {
  id: string;
  supplierId: string;
  ncrNo: string;
  ncrType: 'QUALITY' | 'DELIVERY' | 'QUANTITY' | 'DOCUMENTATION' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  description: string;
  resolution: string | null;
  createdBy: string | null;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface SupplierItem {
  id: string;
  supplierId: string;
  itemId: string;
  supplierSku: string | null;
  unitCost: number | null;
  leadTimeDays: number | null;
  minOrderQty: number;
  isPreferred: boolean;
  isActive: boolean;
  createdAt: string;
  itemSku?: string;
  itemDescription?: string;
}

export interface SupplierContract {
  id: string;
  supplierId: string;
  contractNo: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  terms: string | null;
  totalValue: number | null;
  currency: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNo: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  shipToWarehouseId: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  supplierName?: string;
  warehouseName?: string;
  createdByName?: string;
  lineCount?: number;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'CONFIRMED'
  | 'PARTIAL'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderLine {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number | null;
  lineTotal: number | null;
  createdAt: string;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
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
  aisle: string | null;
  rack: string | null;
  level: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Adjustments
export interface Adjustment {
  id: string;
  tenantId: string;
  warehouseId: string;
  adjustmentNo: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'POSTED';
  reason: string;
  notes: string | null;
  cycleCountId: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustmentLine {
  id: string;
  tenantId: string;
  adjustmentId: string;
  binId: string;
  itemId: string;
  qtyBefore: number;
  qtyAfter: number;
  qtyDelta: number;
  batchNo: string | null;
  createdAt: string;
}

// Cycle Counts
export type CycleCountStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'CLOSED' | 'CANCELLED';

export interface CycleCount {
  id: string;
  tenantId: string;
  warehouseId: string;
  countNo: string;
  status: CycleCountStatus;
  startedAt: string | null;
  closedAt: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CycleCountLine {
  id: string;
  tenantId: string;
  cycleCountId: string;
  binId: string;
  itemId: string;
  systemQty: number;
  countedQty: number | null;
  varianceQty: number;
  countedBy: string | null;
  countedAt: string | null;
  createdAt: string;
}

export type PutawayTaskStatus = 'PENDING' | 'ASSIGNED' | 'COMPLETE' | 'CANCELLED';

export interface PutawayTask {
  id: string;
  tenantId: string;
  grnLineId: string;
  itemId: string;
  fromBinId: string;
  toBinId: string | null;
  qty: number;
  status: PutawayTaskStatus;
  assignedTo: string | null;
  completedAt: string | null;
  createdAt: string;
}

// IBT (Internal Branch Transfer)
export type IbtStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PICKING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface Ibt {
  id: string;
  tenantId: string;
  ibtNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: IbtStatus;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IbtLine {
  id: string;
  tenantId: string;
  ibtId: string;
  itemId: string;
  qtyRequested: number;
  qtyShipped: number;
  qtyReceived: number;
  fromBinId: string | null;
  toBinId: string | null;
  batchNo: string | null;
  createdAt: string;
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

// Manufacturing

export type WorkstationType = 'MACHINE' | 'ASSEMBLY' | 'PACKAGING' | 'QC';
export type WorkstationStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

export interface Workstation {
  id: string;
  tenantId: string;
  siteId: string;
  code: string;
  name: string;
  description: string | null;
  workstationType: WorkstationType;
  capacityPerHour: number | null;
  costPerHour: number | null;
  status: WorkstationStatus;
  createdAt: string;
  updatedAt: string;
}

export type BomStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'OBSOLETE';

export interface BomHeader {
  id: string;
  tenantId: string;
  itemId: string;
  version: number;
  revision: string;
  status: BomStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  baseQty: number;
  uom: string;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
  approvedByName?: string;
  createdByName?: string;
  lineCount?: number;
}

export interface BomLine {
  id: string;
  tenantId: string;
  bomHeaderId: string;
  lineNo: number;
  itemId: string;
  qtyPer: number;
  uom: string;
  scrapPct: number;
  isCritical: boolean;
  notes: string | null;
  createdAt: string;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
}

export type RoutingStatus = 'DRAFT' | 'APPROVED' | 'OBSOLETE';

export interface Routing {
  id: string;
  tenantId: string;
  itemId: string;
  version: number;
  status: RoutingStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
  approvedByName?: string;
  createdByName?: string;
  operationCount?: number;
}

export interface RoutingOperation {
  id: string;
  tenantId: string;
  routingId: string;
  operationNo: number;
  name: string;
  description: string | null;
  workstationId: string | null;
  setupTimeMins: number;
  runTimeMins: number;
  queueTimeMins: number;
  overlapPct: number;
  isSubcontracted: boolean;
  instructions: string | null;
  createdAt: string;
  // Joined fields
  workstationCode?: string;
  workstationName?: string;
}

export type WorkOrderStatus = 'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface WorkOrder {
  id: string;
  tenantId: string;
  siteId: string;
  warehouseId: string;
  workOrderNo: string;
  itemId: string;
  bomHeaderId: string | null;
  routingId: string | null;
  status: WorkOrderStatus;
  priority: number;
  qtyOrdered: number;
  qtyCompleted: number;
  qtyScrapped: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  salesOrderId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
  warehouseName?: string;
  salesOrderNo?: string;
  createdByName?: string;
}

export type WorkOrderOperationStatus = 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface WorkOrderOperation {
  id: string;
  tenantId: string;
  workOrderId: string;
  routingOperationId: string | null;
  operationNo: number;
  name: string;
  workstationId: string | null;
  assignedUserId: string | null;
  status: WorkOrderOperationStatus;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  qtyCompleted: number;
  qtyScrapped: number;
  setupTimeActual: number | null;
  runTimeActual: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  workstationCode?: string;
  workstationName?: string;
  assignedUserName?: string;
}

export type WorkOrderMaterialStatus = 'PENDING' | 'PARTIAL' | 'ISSUED' | 'RETURNED';

export interface WorkOrderMaterial {
  id: string;
  tenantId: string;
  workOrderId: string;
  bomLineId: string | null;
  itemId: string;
  qtyRequired: number;
  qtyIssued: number;
  qtyReturned: number;
  status: WorkOrderMaterialStatus;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
}

export type ProductionLedgerEntryType = 'MATERIAL_ISSUE' | 'MATERIAL_RETURN' | 'PRODUCTION_OUTPUT' | 'SCRAP' | 'REWORK';

export interface ProductionLedgerEntry {
  id: string;
  tenantId: string;
  workOrderId: string;
  workOrderOperationId: string | null;
  entryType: ProductionLedgerEntryType;
  itemId: string;
  warehouseId: string;
  binId: string | null;
  batchNo: string | null;
  qty: number;
  uom: string;
  workstationId: string | null;
  operatorId: string | null;
  reference: string | null;
  reasonCode: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  // Joined fields
  itemSku?: string;
  itemDescription?: string;
  workOrderNo?: string;
  operatorName?: string;
  warehouseName?: string;
  binCode?: string;
}

export interface BomComparison {
  left: BomHeader & { lines: BomLine[] };
  right: BomHeader & { lines: BomLine[] };
  differences: {
    added: BomLine[];
    removed: BomLine[];
    changed: Array<{
      left: BomLine;
      right: BomLine;
      changedFields: string[];
    }>;
  };
}
