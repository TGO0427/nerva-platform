'use client';

import Link from 'next/link';
import { usePortalDashboard } from '@/lib/queries';
import { Spinner } from '@/components/ui/spinner';

export default function PortalDashboardPage() {
  const { data, isLoading } = usePortalDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Orders', value: data?.totalOrders ?? 0, href: '/portal/orders', color: 'bg-blue-50 text-blue-700' },
    { label: 'Pending Deliveries', value: data?.pendingDeliveries ?? 0, href: '/portal/deliveries', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Open Returns', value: data?.openReturns ?? 0, href: '/portal/returns', color: 'bg-orange-50 text-orange-700' },
    { label: 'Outstanding Invoices', value: data?.outstandingInvoices ?? 0, href: '/portal/documents', color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="block">
            <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/portal/orders" className="px-4 py-2 bg-primary-50 text-primary-700 rounded-md text-sm font-medium hover:bg-primary-100">
            View Orders
          </Link>
          <Link href="/portal/documents" className="px-4 py-2 bg-primary-50 text-primary-700 rounded-md text-sm font-medium hover:bg-primary-100">
            Download Documents
          </Link>
          <Link href="/portal/returns/new" className="px-4 py-2 bg-primary-50 text-primary-700 rounded-md text-sm font-medium hover:bg-primary-100">
            Request Return
          </Link>
        </div>
      </div>
    </div>
  );
}
