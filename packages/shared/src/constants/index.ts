// Permission codes
export const PERMISSIONS = {
  // System
  SYSTEM_ADMIN: 'system.admin',
  TENANT_MANAGE: 'tenant.manage',
  SITE_MANAGE: 'site.manage',
  USER_MANAGE: 'user.manage',

  // Master Data
  ITEM_READ: 'item.read',
  ITEM_WRITE: 'item.write',
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_WRITE: 'customer.write',
  SUPPLIER_READ: 'supplier.read',
  SUPPLIER_WRITE: 'supplier.write',

  // Warehouse
  WAREHOUSE_MANAGE: 'warehouse.manage',
  GRN_CREATE: 'grn.create',
  GRN_RECEIVE: 'grn.receive',
  PUTAWAY_EXECUTE: 'putaway.execute',

  // Inventory
  INVENTORY_READ: 'inventory.read',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_ADJUST_APPROVE: 'inventory.adjust.approve',
  IBT_CREATE: 'ibt.create',
  IBT_APPROVE: 'ibt.approve',
  CYCLE_COUNT_MANAGE: 'cycle_count.manage',

  // Sales
  SALES_ORDER_READ: 'sales_order.read',
  SALES_ORDER_CREATE: 'sales_order.create',
  SALES_ORDER_EDIT: 'sales_order.edit',
  SALES_ORDER_CANCEL: 'sales_order.cancel',
  SALES_ORDER_ALLOCATE: 'sales_order.allocate',

  // Fulfilment
  PICK_WAVE_CREATE: 'pick_wave.create',
  PICK_TASK_EXECUTE: 'pick_task.execute',
  PACK_EXECUTE: 'pack.execute',
  SHIPMENT_CREATE: 'shipment.create',
  SHIPMENT_READY: 'shipment.ready',

  // Dispatch
  DISPATCH_PLAN: 'dispatch.plan',
  DISPATCH_ASSIGN: 'dispatch.assign',
  DISPATCH_EXECUTE: 'dispatch.execute',
  POD_CAPTURE: 'pod.capture',

  // Returns
  RMA_CREATE: 'rma.create',
  RMA_RECEIVE: 'rma.receive',
  RMA_DISPOSITION: 'rma.disposition',
  CREDIT_CREATE: 'credit.create',
  CREDIT_APPROVE: 'credit.approve',

  // Integration
  INTEGRATION_MANAGE: 'integration.manage',
  POSTING_VIEW: 'posting.view',
  POSTING_RETRY: 'posting.retry',

  // Reporting
  REPORT_OPERATIONAL: 'report.operational',
  REPORT_FINANCIAL: 'report.financial',
  AUDIT_READ: 'audit.read',
} as const;

// Reason codes for returns
export const RETURN_REASON_CODES = {
  DAMAGED: 'DAMAGED',
  DEFECTIVE: 'DEFECTIVE',
  WRONG_ITEM: 'WRONG_ITEM',
  NOT_ORDERED: 'NOT_ORDERED',
  CHANGE_OF_MIND: 'CHANGE_OF_MIND',
  OTHER: 'OTHER',
} as const;

// Stock movement reasons
export const STOCK_MOVEMENT_REASONS = {
  RECEIVE: 'RECEIVE',
  PUTAWAY: 'PUTAWAY',
  PICK: 'PICK',
  PACK: 'PACK',
  SHIP: 'SHIP',
  RETURN: 'RETURN',
  ADJUST: 'ADJUST',
  TRANSFER: 'TRANSFER',
  IBT_OUT: 'IBT_OUT',
  IBT_IN: 'IBT_IN',
  SCRAP: 'SCRAP',
  WO_CONSUME: 'WO_CONSUME', // Manufacturing ready
  WO_PRODUCE: 'WO_PRODUCE', // Manufacturing ready
} as const;

// Bin types
export const BIN_TYPES = {
  STORAGE: 'STORAGE',
  PICKING: 'PICKING',
  RECEIVING: 'RECEIVING',
  QUARANTINE: 'QUARANTINE',
  SHIPPING: 'SHIPPING',
  SCRAP: 'SCRAP',
} as const;

// Integration types
export const INTEGRATION_TYPES = {
  XERO: 'xero',
  SAGE: 'sage',
  QUICKBOOKS: 'quickbooks',
  EVOLUTION: 'evolution',
  SAP_B1: 'sap_b1',
  CUSTOM_API: 'custom_api',
} as const;

// Document types for posting
export const POSTING_DOC_TYPES = {
  INVOICE: 'invoice',
  CREDIT_NOTE: 'credit_note',
  STOCK_JOURNAL: 'stock_journal',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
} as const;
