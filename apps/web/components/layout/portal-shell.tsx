'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/portal', label: 'Dashboard', exact: true },
  { href: '/portal/orders', label: 'Orders' },
  { href: '/portal/documents', label: 'Documents' },
  { href: '/portal/deliveries', label: 'Deliveries' },
  { href: '/portal/returns', label: 'Returns' },
  { href: '/portal/settings', label: 'Settings' },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: typeof NAV_ITEMS[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark">
      {/* Top nav */}
      <nav className="bg-surface-card dark:bg-surface-dark-card border-b border-surface-border dark:border-surface-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: logo + nav */}
            <div className="flex items-center gap-8">
              <Link href="/portal" className="text-xl font-semibold text-primary-600 dark:text-primary-400">
                Nerva
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive(item)
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-text-secondary dark:text-text-dark-secondary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: user + logout */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-text-muted dark:text-text-dark-muted">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-text-muted dark:text-text-dark-muted hover:text-text-secondary dark:hover:text-text-dark-primary px-3 py-1.5 rounded-md hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary transition-colors"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-md text-text-muted dark:text-text-dark-muted hover:text-text-secondary dark:hover:text-text-dark-primary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary"
              >
                {mobileOpen ? <X className="h-6 w-6" strokeWidth={2} /> : <Menu className="h-6 w-6" strokeWidth={2} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-surface-border dark:border-surface-dark-border bg-surface-card dark:bg-surface-dark-card">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-sm font-medium',
                    isActive(item)
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-text-secondary dark:text-text-dark-secondary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary'
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-surface-border dark:border-surface-dark-border pt-3 mt-3">
                <p className="px-3 text-sm text-text-muted dark:text-text-dark-muted">{user?.email}</p>
                <button
                  onClick={logout}
                  className="mt-2 w-full text-left px-3 py-2 rounded-md text-sm text-text-secondary dark:text-text-dark-secondary hover:text-text-primary dark:hover:text-text-dark-primary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-text-primary dark:text-text-dark-primary">
        {children}
      </main>
    </div>
  );
}
