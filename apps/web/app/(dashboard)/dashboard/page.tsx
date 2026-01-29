'use client';

import Link from 'next/link';
import { useAuth, hasPermission } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/layout';
import { PERMISSIONS } from '@nerva/shared';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

function KpiCard({ title, value, change, changeType = 'neutral', icon }: KpiCardProps) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

function QuickAction({ title, description, href, icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 mr-4">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Placeholder data - will be replaced with real API calls
  const kpis = [
    {
      title: 'Pending Orders',
      value: 24,
      change: '+3 from yesterday',
      changeType: 'neutral' as const,
      icon: <ClipboardIcon />,
    },
    {
      title: 'Ready to Ship',
      value: 12,
      change: '5 dispatching today',
      changeType: 'positive' as const,
      icon: <TruckIcon />,
    },
    {
      title: 'Open Returns',
      value: 7,
      change: '2 awaiting inspection',
      changeType: 'neutral' as const,
      icon: <RefreshIcon />,
    },
    {
      title: 'Stock Alerts',
      value: 3,
      change: 'Low stock items',
      changeType: 'negative' as const,
      icon: <AlertIcon />,
    },
  ];

  const quickActions = [
    {
      title: 'Create Sales Order',
      description: 'Start a new customer order',
      href: '/sales/new',
      icon: <PlusIcon />,
      permission: PERMISSIONS.SALES_ORDER_CREATE,
    },
    {
      title: 'Receive Stock',
      description: 'Create a new GRN',
      href: '/inventory/grn/new',
      icon: <BoxIcon />,
      permission: PERMISSIONS.GRN_CREATE,
    },
    {
      title: 'Plan Dispatch',
      description: 'Create delivery trips',
      href: '/dispatch/trips/new',
      icon: <MapIcon />,
      permission: PERMISSIONS.DISPATCH_PLAN,
    },
    {
      title: 'Process Return',
      description: 'Create new RMA',
      href: '/returns/new',
      icon: <RefreshIcon />,
      permission: PERMISSIONS.RMA_CREATE,
    },
  ].filter(action => hasPermission(user, action.permission));

  const recentActivity = [
    { id: 1, type: 'order', message: 'Sales Order SO-2024-0156 confirmed', time: '5 min ago' },
    { id: 2, type: 'shipment', message: 'Shipment SH-2024-0089 dispatched', time: '15 min ago' },
    { id: 3, type: 'grn', message: 'GRN-2024-0234 received from Supplier ABC', time: '1 hour ago' },
    { id: 4, type: 'return', message: 'RMA-2024-0045 inspection complete', time: '2 hours ago' },
    { id: 5, type: 'adjustment', message: 'Stock adjustment ADJ-0012 approved', time: '3 hours ago' },
  ];

  return (
    <div>
      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s what&apos;s happening in your warehouse today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <QuickAction key={action.title} {...action} />
                ))}
              </div>
              {quickActions.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No actions available with your current permissions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary-500 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple icons
function ClipboardIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3a2.25 2.25 0 00-2.25-2.25h-1.5v-3.75a.75.75 0 00-.75-.75H9.75a.75.75 0 00-.75.75v7.5H3.375c-.621 0-1.125.504-1.125 1.125v.75M8.25 18.75h6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 01-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689A1.125 1.125 0 003 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 011.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}
