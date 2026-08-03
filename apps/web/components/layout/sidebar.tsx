'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, AlertTriangle, Link2, ClipboardList, RefreshCw, Truck, Package,
  Map, Receipt, Undo2, ShoppingCart, Warehouse, ArrowDownToLine, ArrowLeftRight,
  SlidersHorizontal, ListChecks, Clock, FileBarChart, Tag, GitBranch, Calculator,
  Wrench, Factory, Users, Building2, Star, Search, ChevronDown, ChevronLeft,
  ChevronRight, HelpCircle, Settings, Bell, Server, LogOut, Moon, Sun,
  LayoutDashboard, HardHat, CalendarClock, Boxes, CheckCircle2, BarChart3,
  PackageCheck, PackageOpen, BookOpen, Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, hasAnyPermission, hasPermission } from '@/lib/auth';
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
  '/documents': ['document centre', 'documents', 'compliance', 'certificates', 'COA', 'SADC', 'SGS'],
  '/exceptions': ['exception', 'exceptions', 'issues', 'alerts', 'operational queues'],
  '/manufacturing/quality': ['non-conformance', 'holds'],
  '/procurement/supplier-ncrs': ['NCR', 'supplier ncr', 'non-conformance report', 'supplier quality'],
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
      { name: 'Exceptions', href: '/exceptions', icon: <AlertIcon /> },
      { name: 'Document Centre', href: '/documents', icon: <ReportIcon />, permissions: [PERMISSIONS.DOCUMENT_READ] },
      { name: 'Import Schedule', href: '/import-schedule', icon: <LinkIcon />, permissions: [PERMISSIONS.IMPORT_SHIPMENT_READ] },
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
      { name: 'Capacity Planning', href: '/inventory/capacity', icon: <CapacityIcon />, permissions: [PERMISSIONS.WAREHOUSE_MANAGE] },
    ],
  },
  {
    name: 'Procurement',
    items: [
      { name: 'Purchase Orders', href: '/procurement/purchase-orders', icon: <ShoppingCartIcon />, permissions: [PERMISSIONS.PURCHASE_ORDER_READ] },
      { name: 'Supplier NCRs', href: '/procurement/supplier-ncrs', icon: <AlertIcon />, permissions: [PERMISSIONS.SUPPLIER_READ] },
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
  { name: 'Create Purchase Order', href: '/procurement/purchase-orders/new', icon: <ShoppingCartIcon />, permissions: [PERMISSIONS.PURCHASE_ORDER_WRITE], groupName: 'Action' },
  { name: 'Create Work Order', href: '/manufacturing/work-orders/new', icon: <WorkOrderIcon />, permissions: [PERMISSIONS.WORK_ORDER_CREATE], groupName: 'Action' },
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
    if (stats.openNCRs > 0) badgeCounts['/procurement/supplier-ncrs'] = stats.openNCRs;
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-primary-sidebar transform transition-transform duration-200 ease-in-out lg:hidden print:hidden',
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
        className="hidden lg:block h-screen shrink-0 overflow-hidden bg-primary-sidebar print:!hidden"
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
          {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          <div
            className={cn(
              'relative flex items-center text-sm font-medium rounded-md transition-colors',
              collapsed ? 'justify-center px-2 py-2.5' : cn('px-3 py-2', opts.showStar && 'pr-7'),
              isActive
                ? 'text-white'
                : 'text-primary-subtitle/80 hover:text-white hover:bg-white/10'
            )}
          >
            {isActive && opts.useLayoutId ? (
              <motion.div
                layoutId="navActiveIndicator"
                className="absolute inset-0 bg-white/10 rounded-md border-l-[3px] border-primary-active"
                transition={springs.snappy}
              />
            ) : isActive ? (
              <div className="absolute inset-0 bg-white/10 rounded-md border-l-[3px] border-primary-active" />
            ) : null}
            <span className={cn(
              'relative h-5 w-5 shrink-0',
              isActive && 'text-primary-active',
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
                : 'opacity-0 group-hover/nav:opacity-100 text-primary-subtitle/60 hover:text-primary-subtitle'
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
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
      {/* Logo */}
      <div className={cn(
        'sticky top-0 z-10 flex items-center h-16 border-b border-white/10 bg-primary-sidebar',
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
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-subtitle/70 pointer-events-none" />
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
              className="w-full rounded-md bg-white/10 py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-primary-subtitle/60 outline-none focus:bg-white/15 focus:ring-1 focus:ring-primary-active/60 transition-colors"
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
              className="bg-white/10 hover:bg-white/15 text-primary-subtitle text-[11px] rounded-md px-2 py-1 transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        'flex-1 py-4',
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
                  {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <div
                    className={cn(
                      'relative flex items-center text-sm font-medium rounded-md transition-colors px-3 py-2',
                      isActive
                        ? 'text-white'
                        : 'text-primary-subtitle/80 hover:text-white hover:bg-white/10'
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-white/10 rounded-md border-l-[3px] border-primary-active" />
                    )}
                    <span className={cn('relative h-5 w-5 shrink-0 mr-3', isActive && 'text-primary-active')}>
                      {item.icon}
                    </span>
                    <span className="relative whitespace-nowrap flex-1">{item.name}</span>
                    <span className={cn(
                      'relative text-[10px] ml-2',
                      item.groupName === 'Action'
                        ? 'text-primary-active bg-white/10 rounded px-1.5 py-0.5'
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
                        <h3 className="px-3 text-[11px] font-semibold text-primary-subtitle/70 uppercase tracking-wider mb-1.5">
                          {group.name}
                        </h3>
                      ) : (
                        <button
                          onClick={() => toggleGroup(group.name)}
                          className="flex items-center justify-between w-full px-3 py-1 text-[11px] font-semibold text-primary-subtitle/70 uppercase tracking-wider hover:text-primary-subtitle transition-colors mb-0.5"
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
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nerva:dark-mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nerva:dark-mode', 'false');
    }
  };

  // Hydrate dark mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('nerva:dark-mode');
    if (stored === 'true') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

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
              className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white uppercase"
              title={user.displayName}
            >
              {user.displayName.charAt(0)}
            </div>
          )}
          {hasAdminAccess && (
            <Link
              href="/settings"
              className="p-2 text-primary-subtitle/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Settings"
            >
              <span className="h-5 w-5 block"><CogIcon /></span>
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 text-primary-subtitle/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
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
      label: darkMode ? 'Light Mode' : 'Dark Mode',
      icon: darkMode ? <SunIcon /> : <MoonIcon />,
      onClick: toggleDarkMode,
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
      label: 'User Management',
      icon: <UsersIcon />,
      href: '/settings/users',
      show: hasAdminAccess,
    },
    {
      label: 'Tenant Admin',
      icon: <ServerIcon />,
      href: '/admin/tenants',
      show: hasPermission(user, 'system.admin'),
    },
    {
      label: 'Logout',
      icon: <LogoutIcon />,
      onClick: handleLogout,
    },
  ];

  return (
    <div className="border-t border-white/10 shrink-0">
      {/* Quick Stats */}
      {stats && (
        <div className="px-4 py-3 border-b border-white/10">
          <h4 className="text-[10px] font-semibold text-primary-subtitle/70 uppercase tracking-wider mb-2">Quick Stats</h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary-subtitle/80">Pending Orders</span>
              <span className="text-slate-200 font-medium">{stats.pendingOrders}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary-subtitle/80">Low Stock</span>
              <span className={cn('font-medium', stats.lowStockItems > 0 ? 'text-amber-400' : 'text-slate-200')}>
                {stats.lowStockItems}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary-subtitle/80">Late Orders</span>
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
              <div className="flex items-center gap-3 px-3 py-1.5 text-sm text-primary-subtitle/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer">
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
          className="flex items-center justify-center w-full p-2 text-primary-subtitle/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          title="Collapse sidebar"
        >
          <span className="h-5 w-5 block"><ChevronLeftIcon /></span>
        </button>
      </div>
    </div>
  );
}

// ── Icon Components (lucide-react) ──────────────────────────────────────────
// Thin wrappers keep every call site above unchanged; icons fill whatever
// box their parent span sizes them to (h-full w-full), matching the
// previous hand-drawn SVGs' auto-fill behaviour.

function ChevronLeftIcon() {
  return <ChevronLeft className="h-full w-full" strokeWidth={1.5} />;
}

function ChevronRightIcon() {
  return <ChevronRight className="h-full w-full" strokeWidth={1.5} />;
}

function ChevronDownIcon({ className }: { className?: string }) {
  return <ChevronDown className={className} strokeWidth={1.5} />;
}

function SearchIcon({ className }: { className?: string }) {
  return <Search className={className} strokeWidth={1.5} />;
}

function HelpCircleIcon() {
  return <HelpCircle className="h-full w-full" strokeWidth={1.5} />;
}

// Star icons for favorites
function StarIcon({ className }: { className?: string }) {
  return <Star className={className} strokeWidth={1.5} />;
}

function StarFilledIcon({ className }: { className?: string }) {
  return <Star className={className} fill="currentColor" stroke="none" />;
}

function HomeIcon() {
  return <Home className="h-full w-full" strokeWidth={1.5} />;
}

function AlertIcon() {
  return <AlertTriangle className="h-full w-full" strokeWidth={1.5} />;
}

function BoxIcon() {
  return <Package className="h-full w-full" strokeWidth={1.5} />;
}

function ClockIcon() {
  return <Clock className="h-full w-full" strokeWidth={1.5} />;
}

function CapacityIcon() {
  return <Gauge className="h-full w-full" strokeWidth={1.5} />;
}

function ClipboardIcon() {
  return <ClipboardList className="h-full w-full" strokeWidth={1.5} />;
}

function TruckIcon() {
  return <Truck className="h-full w-full" strokeWidth={1.5} />;
}

function MapIcon() {
  return <Map className="h-full w-full" strokeWidth={1.5} />;
}

function RefreshIcon() {
  return <RefreshCw className="h-full w-full" strokeWidth={1.5} />;
}

function TagIcon() {
  return <Tag className="h-full w-full" strokeWidth={1.5} />;
}

function UsersIcon() {
  return <Users className="h-full w-full" strokeWidth={1.5} />;
}

function BuildingIcon() {
  return <Building2 className="h-full w-full" strokeWidth={1.5} />;
}

function WarehouseIcon() {
  return <Warehouse className="h-full w-full" strokeWidth={1.5} />;
}

function LinkIcon() {
  return <Link2 className="h-full w-full" strokeWidth={1.5} />;
}

function CogIcon() {
  return <Settings className="h-full w-full" strokeWidth={1.5} />;
}

function ShoppingCartIcon() {
  return <ShoppingCart className="h-full w-full" strokeWidth={1.5} />;
}

function ChartIcon() {
  return <BarChart3 className="h-full w-full" strokeWidth={1.5} />;
}

function CycleCountIcon() {
  return <ListChecks className="h-full w-full" strokeWidth={1.5} />;
}

function AdjustIcon() {
  return <SlidersHorizontal className="h-full w-full" strokeWidth={1.5} />;
}

function TransferIcon() {
  return <ArrowLeftRight className="h-full w-full" strokeWidth={1.5} />;
}

function PutawayIcon() {
  return <ArrowDownToLine className="h-full w-full" strokeWidth={1.5} />;
}

function ReceiveIcon() {
  return <PackageCheck className="h-full w-full" strokeWidth={1.5} />;
}

function ReportIcon() {
  return <FileBarChart className="h-full w-full" strokeWidth={1.5} />;
}

// Manufacturing icons
function WorkOrderIcon() {
  return <Wrench className="h-full w-full" strokeWidth={1.5} />;
}

function BomIcon() {
  return <GitBranch className="h-full w-full" strokeWidth={1.5} />;
}

function RoutingIcon() {
  return <ArrowLeftRight className="h-full w-full" strokeWidth={1.5} />;
}

function FactoryIcon() {
  return <Factory className="h-full w-full" strokeWidth={1.5} />;
}

function CalculatorIcon() {
  return <Calculator className="h-full w-full" strokeWidth={1.5} />;
}

function LedgerIcon() {
  return <BookOpen className="h-full w-full" strokeWidth={1.5} />;
}

function PackageIcon() {
  return <PackageOpen className="h-full w-full" strokeWidth={1.5} />;
}

function InvoiceIcon() {
  return <Receipt className="h-full w-full" strokeWidth={1.5} />;
}

function CreditNoteIcon() {
  return <Undo2 className="h-full w-full" strokeWidth={1.5} />;
}

// Manufacturing icons
function DashboardIcon() {
  return <LayoutDashboard className="h-full w-full" strokeWidth={1.5} />;
}

function ShopFloorIcon() {
  return <HardHat className="h-full w-full" strokeWidth={1.5} />;
}

function ScheduleIcon() {
  return <CalendarClock className="h-full w-full" strokeWidth={1.5} />;
}

function MrpIcon() {
  return <Boxes className="h-full w-full" strokeWidth={1.5} />;
}

function QualityIcon() {
  return <CheckCircle2 className="h-full w-full" strokeWidth={1.5} />;
}

function TraceabilityIcon() {
  return <ArrowLeftRight className="h-full w-full" strokeWidth={1.5} />;
}

function MoonIcon() {
  return <Moon className="h-full w-full" strokeWidth={1.5} />;
}

function SunIcon() {
  return <Sun className="h-full w-full" strokeWidth={1.5} />;
}

function BellIcon() {
  return <Bell className="h-full w-full" strokeWidth={1.5} />;
}

function ServerIcon() {
  return <Server className="h-full w-full" strokeWidth={1.5} />;
}

function LogoutIcon() {
  return <LogOut className="h-full w-full" strokeWidth={1.5} />;
}
