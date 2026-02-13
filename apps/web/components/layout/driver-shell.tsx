'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/driver',
    label: 'Trips',
    icon: (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h3.75m0 0V9.375A1.125 1.125 0 018.25 8.25h3.375M7.125 14.25h9.75M15.75 8.25l2.625 3.375m0 0H21a.75.75 0 01.75.75v1.875m-3.375-2.625h-1.5" />
      </svg>
    ),
  },
  {
    href: '/driver/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-primary-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
];

export function DriverShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/driver') return pathname === '/driver' || pathname.startsWith('/driver/trips') || pathname.startsWith('/driver/stops');
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Nerva Driver</h1>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20 overflow-y-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50">
        <div className="flex h-16">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                  active ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                {item.icon(active)}
                <span className={`text-xs font-medium ${active ? 'text-primary-600' : 'text-gray-500'}`}>
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
