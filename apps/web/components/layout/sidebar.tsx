'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth, hasAnyPermission } from '@/lib/auth';
import { PERMISSIONS, type CurrentUser } from '@nerva/shared';
import { springs } from '@/lib/motion';
import { useDashboardStats } from '@/lib/queries/dashboard';
import { useRouter } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permissions?: string[];
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

// Step 3a: Synonym map for command-palette search
const searchSynonyms: Record<string, string[]> = {
  '/inventory/grn': ['GRN', 'goods received', 'receive'],
  '/inventory/ibts': ['IBT', 'inter-branch', 'bin transfer', 'stock transfer'],
  '/inventory/cycle-counts': ['stock take', 'physical count'],
  '/inventory/adjustments': ['stock adjustment'],
  '/manufacturing/quality': ['NCR', 'non-conformance', 'holds'],
  '/procurement/purchase-orders': ['PO'],
  '/fulfilment': ['pick', 'wave'],
  '/fulfilment/packing': ['pack'],
};

// Step 4: Merged Reports + Analytics (renamed to Insights), Step 6: Administration removed
const navigation: NavGroup[] = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
    ],
  },
  {
    name: 'Orders',
    items: [
      { name: 'Sales Orders', href: '/sales', icon: <ClipboardIcon />, permissions: [PERMISSIONS.SALES_ORDER_READ] },
      { name: 'Returns', href: '/returns', icon: <RefreshIcon />, permissions: [PERMISSIONS.RMA_CREATE, PERMISSIONS.RMA_RECEIVE] },
    ],
  },
  {
    name: 'Fulfilment',
    items: [
      { name: 'Fulfilment', href: '/fulfilment', icon: <TruckIcon />, permissions: [PERMISSIONS.PICK_WAVE_CREATE, PERMISSIONS.PICK_TASK_EXECUTE] },
      { name: 'Packing Station', href: '/fulfilment/packing', icon: <PackageIcon />, permissions: [PERMISSIONS.SHIPMENT_CREATE] },
      { name: 'Dispatch', href: '/dispatch', icon: <MapIcon />, permissions: [PERMISSIONS.DISPATCH_PLAN, PERMISSIONS.DISPATCH_EXECUTE] },
    ],
  },
  {
    name: 'Finance',
    items: [
      { name: 'Invoices', href: '/finance/invoices', icon: <InvoiceIcon />, permissions: [PERMISSIONS.INVOICE_READ] },
      { name: 'Credit Notes', href: '/returns/credit-notes', icon: <CreditNoteIcon />, permissions: [PERMISSIONS.CREDIT_CREATE] },
    ],
  },
  {
    name: 'Manufacturing',
    items: [
      { name: 'Production Dashboard', href: '/manufacturing/dashboard', icon: <DashboardIcon />, permissions: [PERMISSIONS.PRODUCTION_VIEW_LEDGER] },
      { name: 'Shop Floor', href: '/manufacturing/shop-floor', icon: <ShopFloorIcon />, permissions: [PERMISSIONS.WORK_ORDER_VIEW] },
      { name: 'Work Orders', href: '/manufacturing/work-orders', icon: <WorkOrderIcon />, permissions: [PERMISSIONS.WORK_ORDER_VIEW] },
      { name: 'Schedule', href: '/manufacturing/schedule', icon: <ScheduleIcon />, permissions: [PERMISSIONS.WORK_ORDER_VIEW] },
      { name: 'MRP', href: '/manufacturing/mrp', icon: <MrpIcon />, permissions: [PERMISSIONS.WORK_ORDER_VIEW] },
      { name: 'Quality', href: '/manufacturing/quality', icon: <QualityIcon />, permissions: [PERMISSIONS.QUALITY_VIEW] },
      { name: 'Traceability', href: '/manufacturing/traceability', icon: <TraceabilityIcon />, permissions: [PERMISSIONS.PRODUCTION_VIEW_LEDGER] },
      { name: 'Production Ledger', href: '/manufacturing/ledger', icon: <LedgerIcon />, permissions: [PERMISSIONS.PRODUCTION_VIEW_LEDGER] },
    ],
  },
  {
    name: 'Warehouse',
    items: [
      { name: 'Inventory', href: '/inventory', icon: <BoxIcon />, permissions: [PERMISSIONS.INVENTORY_READ] },
      { name: 'Receiving', href: '/inventory/grn', icon: <ReceiveIcon />, permissions: [PERMISSIONS.INVENTORY_READ] },
      { name: 'Putaway', href: '/inventory/putaway', icon: <PutawayIcon />, permissions: [PERMISSIONS.PUTAWAY_EXECUTE] },
      { name: 'Transfers', href: '/inventory/ibts', icon: <TransferIcon />, permissions: [PERMISSIONS.IBT_CREATE] },
      { name: 'Adjustments', href: '/inventory/adjustments', icon: <AdjustIcon />, permissions: [PERMISSIONS.INVENTORY_ADJUST] },
      { name: 'Cycle Counts', href: '/inventory/cycle-counts', icon: <CycleCountIcon />, permissions: [PERMISSIONS.CYCLE_COUNT_MANAGE] },
      { name: 'Expiry Alerts', href: '/inventory/expiry-alerts', icon: <ClockIcon />, permissions: [PERMISSIONS.INVENTORY_READ] },
    ],
  },
  {
    name: 'Procurement',
    items: [
      { name: 'Purchase Orders', href: '/procurement/purchase-orders', icon: <ShoppingCartIcon />, permissions: [PERMISSIONS.PURCHASE_ORDER_READ] },
    ],
  },
  {
    name: 'Reports',
    items: [
      { name: 'Sales Reports', href: '/reports/sales', icon: <ReportIcon />, permissions: [PERMISSIONS.SALES_ORDER_READ] },
      { name: 'Inventory Reports', href: '/reports/inventory', icon: <ReportIcon />, permissions: [PERMISSIONS.INVENTORY_READ] },
      { name: 'Procurement Reports', href: '/reports/procurement', icon: <ReportIcon />, permissions: [PERMISSIONS.PURCHASE_ORDER_READ] },
      { name: 'Manufacturing Reports', href: '/reports/manufacturing', icon: <ReportIcon />, permissions: [PERMISSIONS.PRODUCTION_VIEW_LEDGER] },
      { name: 'Customer Insights', href: '/sales/customer-analytics', icon: <ChartIcon />, permissions: [PERMISSIONS.CUSTOMER_READ] },
      { name: 'Supplier Insights', href: '/procurement/supplier-analytics', icon: <ChartIcon />, permissions: [PERMISSIONS.SUPPLIER_READ] },
    ],
  },
  {
    name: 'Master Data',
    items: [
      { name: 'Items', href: '/master-data/items', icon: <TagIcon />, permissions: [PERMISSIONS.ITEM_READ] },
      { name: 'BOMs', href: '/manufacturing/boms', icon: <BomIcon />, permissions: [PERMISSIONS.BOM_VIEW] },
      { name: 'BOM Costing', href: '/manufacturing/bom-calculator', icon: <CalculatorIcon />, permissions: [PERMISSIONS.BOM_VIEW] },
      { name: 'Routings', href: '/manufacturing/routings', icon: <RoutingIcon />, permissions: [PERMISSIONS.ROUTING_VIEW] },
      { name: 'Workstations', href: '/manufacturing/workstations', icon: <FactoryIcon />, permissions: [PERMISSIONS.WORKSTATION_VIEW] },
      { name: 'Customers', href: '/master-data/customers', icon: <UsersIcon />, permissions: [PERMISSIONS.CUSTOMER_READ] },
      { name: 'Suppliers', href: '/master-data/suppliers', icon: <BuildingIcon />, permissions: [PERMISSIONS.SUPPLIER_READ] },
      { name: 'Warehouses', href: '/master-data/warehouses', icon: <WarehouseIcon />, permissions: [PERMISSIONS.WAREHOUSE_MANAGE] },
    ],
  },
];

// Step 2: Quick action definitions
const quickActions = [
  { label: '+ Order', href: '/sales/new', permissions: [PERMISSIONS.SALES_ORDER_CREATE] },
  { label: '+ Receive', href: '/inventory/grn', permissions: [PERMISSIONS.GRN_CREATE] },
  { label: '+ Transfer', href: '/inventory/ibts', permissions: [PERMISSIONS.IBT_CREATE] },
];

// Step 3b: Search action entries (virtual items for search only)
const searchActions: (NavItem & { groupName: string })[] = [
  { name: 'Create Sales Order', href: '/sales/new', icon: <ClipboardIcon />, permissions: [PERMISSIONS.SALES_ORDER_CREATE], groupName: 'Action' },
  { name: 'Create Transfer', href: '/inventory/ibts', icon: <TransferIcon />, permissions: [PERMISSIONS.IBT_CREATE], groupName: 'Action' },
  { name: 'Create Purchase Order', href: '/procurement/purchase-orders', icon: <ShoppingCartIcon />, permissions: [PERMISSIONS.PURCHASE_ORDER_WRITE], groupName: 'Action' },
  { name: 'Create Work Order', href: '/manufacturing/work-orders', icon: <WorkOrderIcon />, permissions: [PERMISSIONS.WORK_ORDER_CREATE], groupName: 'Action' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();

  const isItemVisible = (item: NavItem) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return hasAnyPermission(user, item.permissions);
  };

  const isGroupVisible = (group: NavGroup) => {
    return group.items.some(isItemVisible);
  };

  // Step 5c: Badge counts from dashboard stats
  const badgeCounts: Record<string, number> = {};
  if (stats) {
    if (stats.pendingGrns > 0) badgeCounts['/inventory/grn'] = stats.pendingGrns;
    if (stats.openCycleCounts > 0) badgeCounts['/inventory/cycle-counts'] = stats.openCycleCounts;
    if (stats.openNCRs > 0) badgeCounts['/manufacturing/quality'] = stats.openNCRs;
    if (stats.expiringItems > 0) badgeCounts['/inventory/expiry-alerts'] = stats.expiringItems;
  }

  // Check if user has any admin permission (for settings gear visibility)
  const hasAdminAccess = hasAnyPermission(user, [
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.INTEGRATION_MANAGE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.TENANT_MANAGE,
    PERMISSIONS.SITE_MANAGE,
  ]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden print:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-950 to-slate-900 transform transition-transform duration-200 ease-in-out lg:hidden print:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent
          collapsed={false}
          onClose={onClose}
          pathname={pathname}
          navigation={navigation}
          isItemVisible={isItemVisible}
          isGroupVisible={isGroupVisible}
          badgeCounts={badgeCounts}
          user={user}
          hasAdminAccess={hasAdminAccess}
        />
      </aside>

      {/* Desktop sidebar with animated width */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={springs.snappy}
        className="hidden lg:block h-screen shrink-0 overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 print:!hidden"
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          pathname={pathname}
          navigation={navigation}
          isItemVisible={isItemVisible}
          isGroupVisible={isGroupVisible}
          badgeCounts={badgeCounts}
          user={user}
          hasAdminAccess={hasAdminAccess}
        />
      </motion.aside>
    </>
  );
}

interface SidebarContentProps {
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  pathname: string;
  navigation: NavGroup[];
  isItemVisible: (item: NavItem) => boolean;
  isGroupVisible: (group: NavGroup) => boolean;
  badgeCounts: Record<string, number>;
  user: CurrentUser | null;
  hasAdminAccess: boolean;
}

function SidebarContent({
  collapsed,
  onClose,
  onToggleCollapse,
  pathname,
  navigation,
  isItemVisible,
  isGroupVisible,
  badgeCounts,
  user,
  hasAdminAccess,
}: SidebarContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // Default: all groups collapsed except Overview (non-collapsible) and Orders
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navigation
        .filter(g => g.name !== 'Overview' && g.name !== 'Orders')
        .map(g => [g.name, true])
    )
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  // Hydrate from localStorage (overrides defaults on returning visits)
  useEffect(() => {
    try {
      const cg = localStorage.getItem('nerva:nav-collapsed');
      if (cg) setCollapsedGroups(JSON.parse(cg));
    } catch {}
    try {
      const fv = localStorage.getItem('nerva:nav-favorites');
      if (fv) setFavorites(JSON.parse(fv));
    } catch {}
    hydrated.current = true;
  }, []);

  // Persist collapsed groups
  useEffect(() => {
    if (hydrated.current) {
      localStorage.setItem('nerva:nav-collapsed', JSON.stringify(collapsedGroups));
    }
  }, [collapsedGroups]);

  // Persist favorites
  useEffect(() => {
    if (hydrated.current) {
      localStorage.setItem('nerva:nav-favorites', JSON.stringify(favorites));
    }
  }, [favorites]);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !collapsed) {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  const toggleGroup = useCallback((name: string) => {
    setCollapsedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const toggleFavorite = useCallback((href: string) => {
    setFavorites(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );
  }, []);

  // All visible items with group name (for search + favorites lookup)
  const allItems = navigation
    .filter(isGroupVisible)
    .flatMap(group =>
      group.items.filter(isItemVisible).map(item => ({ ...item, groupName: group.name }))
    );

  const visibleGroups = navigation.filter(isGroupVisible);

  // Step 1: Find the active group (the one containing the current page)
  const activeGroup = visibleGroups.find(g =>
    g.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
  );

  const isSearching = searchQuery.length > 0;

  // Step 3c: Enhanced search with synonyms + action entries
  const searchResults = isSearching
    ? (() => {
        const q = searchQuery.toLowerCase();
        // Filter nav items by name, group name, or synonyms
        const navMatches = allItems.filter(item => {
          if (item.name.toLowerCase().includes(q)) return true;
          if (item.groupName.toLowerCase().includes(q)) return true;
          const synonyms = searchSynonyms[item.href];
          if (synonyms && synonyms.some(s => s.toLowerCase().includes(q))) return true;
          return false;
        });
        // Filter action entries
        const actionMatches = searchActions
          .filter(action => {
            if (!action.permissions || action.permissions.length === 0) return true;
            return hasAnyPermission(user, action.permissions);
          })
          .filter(action => action.name.toLowerCase().includes(q));
        // Deduplicate by href (nav items take priority)
        const seenHrefs = new Set(navMatches.map(i => i.href));
        const uniqueActions = actionMatches.filter(a => !seenHrefs.has(a.href));
        return [...navMatches, ...uniqueActions];
      })()
    : [];

  const favoriteItems = favorites
    .map(href => allItems.find(item => item.href === href))
    .filter((item): item is NavItem & { groupName: string } => item != null);

  // Step 2: Visible quick actions (permission-gated)
  const visibleQuickActions = quickActions.filter(action =>
    hasAnyPermission(user, action.permissions)
  );

  // Shared nav item renderer (Step 5d: badge support added)
  const renderNavItem = (
    item: NavItem,
    opts: { useLayoutId?: boolean; keyPrefix?: string; showStar?: boolean }
  ) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const isFav = favorites.includes(item.href);
    const key = opts.keyPrefix ? `${opts.keyPrefix}-${item.href}` : item.href;
    const badgeCount = badgeCounts[item.href];

    return (
      <div key={key} className="relative group/nav">
        <Link
          href={item.href}
          onClick={onClose}
          title={collapsed ? item.name : undefined}
          className="relative block"
        >
          <div
            className={cn(
              'relative flex items-center text-sm font-medium rounded-md transition-colors',
              collapsed ? 'justify-center px-2 py-2.5' : cn('px-3 py-2', opts.showStar && 'pr-7'),
              isActive
                ? 'text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            )}
          >
            {isActive && opts.useLayoutId ? (
              <motion.div
                layoutId="navActiveIndicator"
                className="absolute inset-0 bg-white/[0.08] rounded-md border-l-[3px] border-emerald-400"
                transition={springs.snappy}
              />
            ) : isActive ? (
              <div className="absolute inset-0 bg-white/[0.08] rounded-md border-l-[3px] border-emerald-400" />
            ) : null}
            <span className={cn(
              'relative h-5 w-5 shrink-0',
              isActive && 'text-emerald-400',
              !collapsed && 'mr-3'
            )}>
              {item.icon}
              {/* Collapsed badge: tiny red dot */}
              {collapsed && badgeCount != null && badgeCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </span>
            {!collapsed && (
              <>
                <span className="relative whitespace-nowrap">{item.name}</span>
                {/* Expanded badge: pill counter */}
                {badgeCount != null && badgeCount > 0 && (
                  <span className="ml-auto relative text-[10px] bg-red-500/20 text-red-400 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </>
            )}
          </div>
        </Link>
        {!collapsed && opts.showStar && (
          <button
            onClick={() => toggleFavorite(item.href)}
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity z-10',
              isFav
                ? 'opacity-100 text-amber-400 hover:text-amber-300'
                : 'opacity-0 group-hover/nav:opacity-100 text-slate-500 hover:text-slate-300'
            )}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? <StarFilledIcon className="h-3.5 w-3.5" /> : <StarIcon className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-white/10',
        collapsed ? 'justify-center px-2' : 'px-6'
      )}>
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <span className="text-xl font-bold text-white">
            {collapsed ? 'N' : 'Nerva'}
          </span>
        </Link>
      </div>

      {/* Search input */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search… ( / )"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  searchInputRef.current?.blur();
                }
              }}
              className="w-full rounded-md bg-white/5 py-1.5 pl-8 pr-3 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Step 2: Quick actions row */}
      {!collapsed && visibleQuickActions.length > 0 && !isSearching && (
        <div className="px-3 pt-1.5 pb-0.5 flex gap-1.5">
          {visibleQuickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              onClick={onClose}
              className="bg-white/5 hover:bg-white/10 text-slate-400 text-[11px] rounded-md px-2 py-1 transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden py-4',
        collapsed ? 'px-2 space-y-2' : 'px-3'
      )}>
        {isSearching ? (
          /* Search results — flat list with group/action labels */
          <div className="space-y-0.5">
            {searchResults.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-600 text-center">No results</p>
            )}
            {searchResults.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { setSearchQuery(''); onClose?.(); }}
                  className="relative block"
                >
                  <div
                    className={cn(
                      'relative flex items-center text-sm font-medium rounded-md transition-colors px-3 py-2',
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-white/[0.08] rounded-md border-l-[3px] border-emerald-400" />
                    )}
                    <span className={cn('relative h-5 w-5 shrink-0 mr-3', isActive && 'text-emerald-400')}>
                      {item.icon}
                    </span>
                    <span className="relative whitespace-nowrap flex-1">{item.name}</span>
                    <span className={cn(
                      'relative text-[10px] ml-2',
                      item.groupName === 'Action'
                        ? 'text-emerald-500/70 bg-emerald-500/10 rounded px-1.5 py-0.5'
                        : 'text-slate-600'
                    )}>
                      {item.groupName}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <>
            {/* Favorites section */}
            {!collapsed && favoriteItems.length > 0 && (
              <div className="mb-2">
                <h3 className="px-3 text-[11px] font-semibold text-amber-500/70 uppercase tracking-wider mb-1.5">
                  Favorites
                </h3>
                <div className="space-y-0.5">
                  {favoriteItems.map(item =>
                    renderNavItem(item, { useLayoutId: false, keyPrefix: 'fav', showStar: true })
                  )}
                </div>
              </div>
            )}

            {/* Nav groups */}
            {visibleGroups.map((group, groupIndex) => {
              const isOverview = group.name === 'Overview';
              // Step 1: Auto-expand active section — never collapse the group the user is currently in
              const isGroupCollapsed = group.name === activeGroup?.name
                ? false
                : (collapsedGroups[group.name] ?? false);
              const showDivider = !collapsed && (groupIndex > 0 || favoriteItems.length > 0);
              const visibleItems = group.items.filter(isItemVisible);

              return (
                <div key={group.name} className={cn(!collapsed && groupIndex > 0 && 'mt-2')}>
                  {/* Group header */}
                  {collapsed ? (
                    <div className="border-t border-white/10 mb-2 mx-1" />
                  ) : (
                    <>
                      {showDivider && <div className="border-t border-white/5 mx-1 mb-1.5" />}
                      {isOverview ? (
                        <h3 className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          {group.name}
                        </h3>
                      ) : (
                        <button
                          onClick={() => toggleGroup(group.name)}
                          className="flex items-center justify-between w-full px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors mb-0.5"
                        >
                          <span>{group.name}</span>
                          <ChevronDownIcon
                            className={cn(
                              'h-3 w-3 transition-transform duration-200',
                              isGroupCollapsed && 'rotate-180'
                            )}
                          />
                        </button>
                      )}
                    </>
                  )}

                  {/* Group items */}
                  {isOverview || collapsed ? (
                    <div className="space-y-0.5">
                      {visibleItems.map(item =>
                        renderNavItem(item, { useLayoutId: true, showStar: !collapsed })
                      )}
                    </div>
                  ) : (
                    <div
                      className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                      style={{ gridTemplateRows: isGroupCollapsed ? '0fr' : '1fr' }}
                    >
                      <div className="overflow-hidden min-h-0">
                        <div className="space-y-0.5">
                          {visibleItems.map(item =>
                            renderNavItem(item, { useLayoutId: true, showStar: true })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom utility area */}
      <SidebarFooter
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        hasAdminAccess={hasAdminAccess}
        user={user}
      />
    </div>
  );
}

// ── Sidebar Footer ──────────────────────────────────────────────────────────

function SidebarFooter({
  collapsed,
  onToggleCollapse,
  hasAdminAccess,
  user,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  hasAdminAccess: boolean;
  user: CurrentUser | null;
}) {
  const { data: stats } = useDashboardStats();
  const { logout } = useAuth();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!onToggleCollapse) return null;

  if (collapsed) {
    return (
      <div className="border-t border-white/10 p-2">
        <div className="flex flex-col items-center gap-1.5">
          {user && (
            <div
              className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-slate-300 uppercase"
              title={user.displayName}
            >
              {user.displayName.charAt(0)}
            </div>
          )}
          {hasAdminAccess && (
            <Link
              href="/settings"
              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-md transition-colors"
              title="Settings"
            >
              <span className="h-5 w-5 block"><CogIcon /></span>
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-md transition-colors"
            title="Expand sidebar"
          >
            <span className="h-5 w-5 block"><ChevronRightIcon /></span>
          </button>
        </div>
      </div>
    );
  }

  const footerLinks: { label: string; icon: React.ReactNode; href?: string; onClick?: () => void; show?: boolean }[] = [
    {
      label: 'Dark Mode',
      icon: <MoonIcon />,
      onClick: () => setDarkMode(!darkMode),
    },
    {
      label: 'Help & Guide',
      icon: <HelpCircleIcon />,
      href: '/help',
    },
    {
      label: 'Settings',
      icon: <CogIcon />,
      href: '/settings',
      show: hasAdminAccess,
    },
    {
      label: 'Notifications',
      icon: <BellIcon />,
      href: '/notifications',
    },
    {
      label: 'Supplier Portal',
      icon: <BuildingOfficeIcon />,
      href: '/portal',
    },
    {
      label: 'User Management',
      icon: <UsersIcon />,
      href: '/settings/users',
      show: hasAdminAccess,
    },
    {
      label: 'Logout',
      icon: <LogoutIcon />,
      onClick: handleLogout,
    },
  ];

  return (
    <div className="border-t border-white/10">
      {/* Quick Stats */}
      {stats && (
        <div className="px-4 py-3 border-b border-white/10">
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Stats</h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Items</span>
              <span className="text-slate-200 font-medium">{stats.lowStockItems + stats.expiringItems}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">In Transit</span>
              <span className="text-slate-200 font-medium">{stats.tripsInProgress}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Delayed</span>
              <span className={cn('font-medium', stats.lateOrders > 0 ? 'text-red-400' : 'text-slate-200')}>
                {stats.lateOrders}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="px-2 py-2 space-y-0.5">
        {footerLinks
          .filter((item) => item.show !== false)
          .map((item) => {
            const content = (
              <div className="flex items-center gap-3 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer">
                <span className="h-4 w-4 shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.label} href={item.href}>
                  {content}
                </Link>
              );
            }
            return (
              <div key={item.label} onClick={item.onClick}>
                {content}
              </div>
            );
          })}
      </div>

      {/* Collapse toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-md transition-colors"
          title="Collapse sidebar"
        >
          <span className="h-5 w-5 block"><ChevronLeftIcon /></span>
        </button>
      </div>
    </div>
  );
}

// ── Icon Components ─────────────────────────────────────────────────────────

// Chevron icons for collapse toggle
function ChevronLeftIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

// Chevron for collapsible group headers
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

// Search icon for sidebar search input
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

// Help circle icon for utility area
function HelpCircleIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

// Star icons for favorites
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function StarFilledIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  );
}

// Simple SVG icons
function HomeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3a2.25 2.25 0 00-2.25-2.25h-1.5v-3.75a.75.75 0 00-.75-.75H9.75a.75.75 0 00-.75.75v7.5H3.375c-.621 0-1.125.504-1.125 1.125v.75M8.25 18.75h6" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 01-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689A1.125 1.125 0 003 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 011.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function WarehouseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShoppingCartIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function CycleCountIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.049 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function AdjustIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function PutawayIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function ReceiveIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

// Manufacturing icons
function WorkOrderIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function BomIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  );
}

function RoutingIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function FactoryIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm3.75-2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-2.625 0a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function CreditNoteIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function BuildingOfficeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

// Manufacturing icons
function DashboardIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  );
}

function ShopFloorIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  );
}

function MrpIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function QualityIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function TraceabilityIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}
