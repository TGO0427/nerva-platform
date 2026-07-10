export const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  exceptions: 'Exceptions',
  documents: 'Document Centre',
  'import-schedule': 'Import Schedule',
  inventory: 'Inventory',
  sales: 'Sales Orders',
  fulfilment: 'Fulfilment',
  dispatch: 'Dispatch',
  returns: 'Returns',
  'master-data': 'Master Data',
  items: 'Items',
  customers: 'Customers',
  suppliers: 'Suppliers',
  warehouses: 'Warehouses',
  settings: 'Settings',
  users: 'Users',
  roles: 'Roles',
  sites: 'Sites',
  company: 'Company Profile',
  integrations: 'Integrations',
  adjustments: 'Stock Adjustments',
  'cycle-counts': 'Cycle Counts',
  'audit-log': 'Audit Log',
  putaway: 'Putaway',
  ibts: 'Internal Transfers',
  grn: 'Goods Receiving',
  receive: 'Receive',
  'purchase-orders': 'Purchase Orders',
  'customer-analytics': 'Customer Analytics',
  'supplier-analytics': 'Supplier Analytics',
  'expiry-alerts': 'Expiry Alerts',
  'pick-waves': 'Pick Waves',
  profile: 'Profile',
  new: 'New',
  edit: 'Edit',
  manufacturing: 'Manufacturing',
  'shop-floor': 'Shop Floor',
  'work-orders': 'Work Orders',
  schedule: 'Schedule',
  mrp: 'MRP',
  quality: 'Quality',
  traceability: 'Traceability',
  ledger: 'Production Ledger',
  boms: 'BOMs',
  'bom-calculator': 'BOM Costing',
  routings: 'Routings',
  workstations: 'Workstations',
  reports: 'Reports',
  invoices: 'Invoices',
  'credit-notes': 'Credit Notes',
  notifications: 'Notifications',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function resolvePageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';

  const last = segments[segments.length - 1];
  if (UUID_RE.test(last)) return 'Details';

  return pathLabels[last] || formatSegment(last);
}
