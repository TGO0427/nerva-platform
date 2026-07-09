'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { TabStrip } from './tab-strip';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-surface dark:bg-surface-dark">
      <div className="flex">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          collapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />

        <div className="flex-1 flex flex-col h-screen lg:pl-0">
          {/* Sticky header */}
          <div className="sticky top-0 z-40 print:hidden">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
          </div>

          {/* Sticky tab strip */}
          <div className="sticky top-16 z-30 print:hidden">
            <TabStrip />
          </div>

          <main className="flex-1 overflow-y-auto p-4 lg:p-6 text-text-primary dark:text-text-dark-primary">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
