'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ClipboardList, Users, FileText, Clock, Settings, ArrowLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springs } from '@/lib/motion';

interface CustomerPortalShellProps {
  children: React.ReactNode;
  customer: {
    id: string;
    name: string;
    code: string | null;
    email: string | null;
  } | null;
  isLoading?: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export function CustomerPortalShell({ children, customer, isLoading }: CustomerPortalShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const customerId = customer?.id || '';

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: `/customers/${customerId}`, icon: <LayoutDashboard className="h-full w-full" strokeWidth={1.5} /> },
    { name: 'Orders', href: `/customers/${customerId}/orders`, icon: <ClipboardList className="h-full w-full" strokeWidth={1.5} /> },
    { name: 'Contacts', href: `/customers/${customerId}/contacts`, icon: <Users className="h-full w-full" strokeWidth={1.5} /> },
    { name: 'Notes', href: `/customers/${customerId}/notes`, icon: <FileText className="h-full w-full" strokeWidth={1.5} /> },
    { name: 'Activity', href: `/customers/${customerId}/activity`, icon: <Clock className="h-full w-full" strokeWidth={1.5} /> },
  ];

  const isActive = (href: string) => {
    if (href === `/customers/${customerId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.snappy}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-primary-950 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Customer Header */}
          <div className="p-5 border-b border-white/10">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-5 bg-white/20 rounded w-3/4 mb-2" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
            ) : customer ? (
              <>
                <h2 className="text-lg font-semibold text-white truncate">
                  {customer.name}
                </h2>
                <p className="text-sm text-primary-subtitle truncate">
                  {customer.email || customer.code || 'No email'}
                </p>
              </>
            ) : (
              <div className="text-white">Loading customer...</div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-primary-subtitle/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <span className="w-5 h-5 shrink-0">
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-white/10">
            <Link
              href={`/master-data/customers/${customerId}`}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-primary-subtitle/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <Settings className="w-5 h-5 shrink-0" strokeWidth={1.5} />
              Edit Customer
            </Link>
            <Link
              href="/master-data/customers"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-primary-subtitle/80 hover:text-white hover:bg-white/10 rounded-md transition-colors mt-0.5"
            >
              <ArrowLeft className="w-5 h-5 shrink-0" strokeWidth={1.5} />
              Back to Customers
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-surface-card dark:bg-surface-dark-card border-b border-surface-border dark:border-surface-dark-border">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-text-muted dark:text-text-dark-muted hover:text-text-secondary dark:hover:text-text-dark-primary rounded-md hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary"
            >
              <Menu className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <div className="flex-1 lg:hidden text-center">
              <span className="font-semibold text-text-primary dark:text-text-dark-primary truncate">
                {customer?.name || 'Customer Portal'}
              </span>
            </div>
            <div className="hidden lg:block" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 text-text-primary dark:text-text-dark-primary">
          {children}
        </main>
      </div>
    </div>
  );
}
