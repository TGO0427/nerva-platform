'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/driver', label: 'Trips', icon: Truck },
  { href: '/driver/profile', label: 'Profile', icon: User },
];

export function DriverShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/driver') return pathname === '/driver' || pathname.startsWith('/driver/trips') || pathname.startsWith('/driver/stops');
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark flex flex-col">
      {/* Header */}
      <header className="bg-primary-950 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Nerva Driver</h1>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-surface-card dark:bg-surface-dark-card border-t border-surface-border dark:border-surface-dark-border z-50">
        <div className="flex h-16">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                  active ? 'text-primary-600 dark:text-primary-400' : 'text-text-muted dark:text-text-dark-muted'
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
                <span className="text-xs font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
