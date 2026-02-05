'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
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
  integrations: 'Integrations',
  adjustments: 'Stock Adjustments',
  'cycle-counts': 'Cycle Counts',
  'audit-log': 'Audit Log',
  putaway: 'Putaway',
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
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const breadcrumbs: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;

    // Check if segment is a UUID (likely an ID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    return {
      label: isUuid ? 'Details' : (pathLabels[segment] || segment),
      href: isLast ? undefined : href,
    };
  });

  return (
    <nav className="flex items-center space-x-2 text-sm mb-4">
      <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>

      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center space-x-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {crumb.href ? (
            <Link href={crumb.href} className="text-gray-500 hover:text-gray-700">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
