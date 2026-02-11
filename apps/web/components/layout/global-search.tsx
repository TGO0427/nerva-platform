'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { api } from '@/lib/api';

// Types for search results
type ResultType = 'order' | 'customer' | 'item' | 'trip' | 'purchase_order' | 'shipment' | 'supplier' | 'command' | 'recent';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon?: string;
}

// Command definitions
const COMMANDS: SearchResult[] = [
  { type: 'command', id: 'new-order', title: 'Create Sales Order', subtitle: 'Start a new customer order', href: '/sales/new', icon: 'plus' },
  { type: 'command', id: 'new-po', title: 'Create Purchase Order', subtitle: 'Order from supplier', href: '/procurement/purchase-orders/new', icon: 'plus' },
  { type: 'command', id: 'new-customer', title: 'Create Customer', subtitle: 'Add new customer', href: '/master-data/customers/new', icon: 'plus' },
  { type: 'command', id: 'new-item', title: 'Create Item', subtitle: 'Add new product/SKU', href: '/master-data/items/new', icon: 'plus' },
  { type: 'command', id: 'dispatch', title: 'Go to Dispatch', subtitle: 'Manage delivery trips', href: '/dispatch', icon: 'truck' },
  { type: 'command', id: 'inventory', title: 'Go to Inventory', subtitle: 'View stock levels', href: '/inventory', icon: 'box' },
  { type: 'command', id: 'fulfilment', title: 'Go to Fulfilment', subtitle: 'Picking & packing', href: '/fulfilment', icon: 'clipboard' },
  { type: 'command', id: 'dashboard', title: 'Go to Dashboard', subtitle: 'Overview & KPIs', href: '/dashboard', icon: 'home' },
];

// Recent items storage key
const RECENT_ITEMS_KEY = 'nerva-recent-items';
const MAX_RECENT_ITEMS = 5;

// Get recent items from localStorage
function getRecentItems(): SearchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save recent item to localStorage
function saveRecentItem(item: SearchResult) {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentItems().filter(r => r.id !== item.id);
    const updated = [{ ...item, type: 'recent' as ResultType }, ...recent].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  // Load recent items on mount
  useEffect(() => {
    setRecentItems(getRecentItems());
  }, [isOpen]);

  // Detect query mode
  const queryMode = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.startsWith('/')) return 'command';
    if (q.startsWith('so-') || q.startsWith('so ')) return 'order';
    if (q.startsWith('trip-') || q.startsWith('trip ')) return 'trip';
    if (q.startsWith('po-') || q.startsWith('po ')) return 'purchase_order';
    if (q.startsWith('shp-') || q.startsWith('shp ')) return 'shipment';
    if (q.startsWith('@')) return 'customer';
    if (q.startsWith('#')) return 'item';
    return 'all';
  }, [query]);

  // Filter commands when in command mode
  const filteredCommands = useMemo(() => {
    if (queryMode !== 'command') return [];
    const searchTerm = query.slice(1).toLowerCase();
    return COMMANDS.filter(cmd =>
      cmd.title.toLowerCase().includes(searchTerm) ||
      cmd.subtitle.toLowerCase().includes(searchTerm)
    );
  }, [query, queryMode]);

  // Search API
  useEffect(() => {
    // Handle command mode locally
    if (queryMode === 'command') {
      setResults(filteredCommands);
      setSelectedIndex(0);
      return;
    }

    // Show recent items when empty
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const searchResults: SearchResult[] = [];
        const searchTerm = debouncedQuery.replace(/^[@#]/, '').replace(/^(so|trip|po|shp)[-\s]/i, '');

        // Search based on mode or search all
        const shouldSearchOrders = queryMode === 'all' || queryMode === 'order';
        const shouldSearchCustomers = queryMode === 'all' || queryMode === 'customer';
        const shouldSearchItems = queryMode === 'all' || queryMode === 'item';
        const shouldSearchTrips = queryMode === 'all' || queryMode === 'trip';
        const shouldSearchPOs = queryMode === 'all' || queryMode === 'purchase_order';
        const shouldSearchShipments = queryMode === 'all' || queryMode === 'shipment';

        // Parallel searches
        const promises: Promise<void>[] = [];

        if (shouldSearchOrders) {
          promises.push(
            api.get('/sales/orders', { params: { search: searchTerm, limit: 5 } })
              .then(res => {
                res.data?.data?.forEach((order: { id: string; orderNo: string; customerName?: string; status: string }) => {
                  searchResults.push({
                    type: 'order',
                    id: order.id,
                    title: order.orderNo,
                    subtitle: `${order.customerName || 'No customer'} • ${order.status}`,
                    href: `/sales/${order.id}`,
                  });
                });
              })
              .catch(() => {})
          );
        }

        if (shouldSearchCustomers) {
          promises.push(
            api.get('/master-data/customers', { params: { search: searchTerm, limit: 3 } })
              .then(res => {
                res.data?.data?.forEach((customer: { id: string; name: string; code?: string }) => {
                  searchResults.push({
                    type: 'customer',
                    id: customer.id,
                    title: customer.name,
                    subtitle: customer.code || 'Customer',
                    href: `/master-data/customers/${customer.id}`,
                  });
                });
              })
              .catch(() => {})
          );
        }

        if (shouldSearchItems) {
          promises.push(
            api.get('/master-data/items', { params: { search: searchTerm, limit: 3 } })
              .then(res => {
                res.data?.data?.forEach((item: { id: string; sku: string; description: string }) => {
                  searchResults.push({
                    type: 'item',
                    id: item.id,
                    title: item.sku,
                    subtitle: item.description || 'Item',
                    href: `/master-data/items/${item.id}`,
                  });
                });
              })
              .catch(() => {})
          );
        }

        if (shouldSearchTrips) {
          promises.push(
            api.get('/dispatch/trips', { params: { limit: 50 } })
              .then(res => {
                res.data?.data?.filter((trip: { tripNo: string }) =>
                  trip.tripNo.toLowerCase().includes(searchTerm.toLowerCase())
                ).slice(0, 5).forEach((trip: { id: string; tripNo: string; status: string; driverName?: string }) => {
                  searchResults.push({
                    type: 'trip',
                    id: trip.id,
                    title: trip.tripNo,
                    subtitle: `${trip.driverName || 'Unassigned'} • ${trip.status}`,
                    href: `/dispatch/${trip.id}`,
                  });
                });
              })
              .catch(() => {})
          );
        }

        if (shouldSearchPOs) {
          promises.push(
            api.get('/procurement/purchase-orders', { params: { search: searchTerm, limit: 3 } })
              .then(res => {
                res.data?.data?.forEach((po: { id: string; poNo: string; supplierName?: string; status: string }) => {
                  searchResults.push({
                    type: 'purchase_order',
                    id: po.id,
                    title: po.poNo,
                    subtitle: `${po.supplierName || 'No supplier'} • ${po.status}`,
                    href: `/procurement/purchase-orders/${po.id}`,
                  });
                });
              })
              .catch(() => {})
          );
        }

        if (shouldSearchShipments) {
          promises.push(
            api.get('/fulfilment/shipments', { params: { search: searchTerm, limit: 3 } })
              .then(res => {
                res.data?.data?.forEach((shipment: { id: string; shipmentNo: string; status: string }) => {
                  searchResults.push({
                    type: 'shipment',
                    id: shipment.id,
                    title: shipment.shipmentNo,
                    subtitle: shipment.status,
                    href: `/fulfilment/shipments/${shipment.id}`,
                  });
                });
              })
              .catch(() => {})
          );
        }

        await Promise.all(promises);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery, queryMode, filteredCommands]);

  // Keyboard navigation
  const displayResults = query.length < 2 && queryMode !== 'command' ? recentItems : results;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, displayResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && displayResults[selectedIndex]) {
      e.preventDefault();
      handleResultClick(displayResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [displayResults, selectedIndex]);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    // Save to recent items (except commands)
    if (result.type !== 'command' && result.type !== 'recent') {
      saveRecentItem(result);
    }
    router.push(result.href);
    setIsOpen(false);
    setQuery('');
  };

  // Get placeholder based on mode
  const getPlaceholder = () => {
    switch (queryMode) {
      case 'command': return 'Type command name...';
      case 'order': return 'Search sales orders...';
      case 'trip': return 'Search dispatch trips...';
      case 'purchase_order': return 'Search purchase orders...';
      case 'shipment': return 'Search shipments...';
      case 'customer': return 'Search customers...';
      case 'item': return 'Search items/SKUs...';
      default: return 'Search or type / for commands...';
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Search trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 text-sm"
      >
        <SearchIcon className="h-4 w-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded text-xs text-slate-400 border border-slate-200">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>

      {/* Search modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Search panel */}
            <motion.div
              className="fixed left-1/2 top-24 -translate-x-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                <SearchIcon className="h-5 w-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={getPlaceholder()}
                  className="flex-1 outline-none text-sm placeholder:text-slate-400"
                />
                {isLoading && (
                  <div className="h-4 w-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-100"
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {/* Show recent items when empty */}
                {query.length < 2 && queryMode !== 'command' && recentItems.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Recent</p>
                    {recentItems.map((result, index) => (
                      <ResultItem
                        key={`recent-${result.id}`}
                        result={result}
                        isSelected={index === selectedIndex}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      />
                    ))}
                  </div>
                )}

                {/* Show quick tips when empty and no recent */}
                {query.length < 2 && queryMode !== 'command' && recentItems.length === 0 && (
                  <div className="py-6 px-4">
                    <p className="text-sm text-slate-600 font-medium mb-3">Quick Tips</p>
                    <div className="space-y-2 text-xs text-slate-500">
                      <p><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">/</kbd> Commands (create, navigate)</p>
                      <p><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">SO-</kbd> Search sales orders</p>
                      <p><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">TRIP-</kbd> Search dispatch trips</p>
                      <p><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">@</kbd> Search customers</p>
                      <p><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">#</kbd> Search items/SKUs</p>
                    </div>
                  </div>
                )}

                {/* Commands mode */}
                {queryMode === 'command' && filteredCommands.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Commands</p>
                    {filteredCommands.map((result, index) => (
                      <ResultItem
                        key={result.id}
                        result={result}
                        isSelected={index === selectedIndex}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      />
                    ))}
                  </div>
                )}

                {/* Search results */}
                {query.length >= 2 && queryMode !== 'command' && results.length > 0 && (
                  <div className="py-2">
                    {/* Group by type */}
                    {['order', 'customer', 'item', 'trip', 'purchase_order', 'shipment'].map(type => {
                      const typeResults = results.filter(r => r.type === type);
                      if (typeResults.length === 0) return null;

                      const label = {
                        order: 'Sales Orders',
                        customer: 'Customers',
                        item: 'Items',
                        trip: 'Trips',
                        purchase_order: 'Purchase Orders',
                        shipment: 'Shipments',
                      }[type];

                      const baseIndex = results.findIndex(r => r.type === type);

                      return (
                        <div key={type}>
                          <p className="px-4 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
                          {typeResults.map((result, i) => (
                            <ResultItem
                              key={`${result.type}-${result.id}`}
                              result={result}
                              isSelected={baseIndex + i === selectedIndex}
                              onClick={() => handleResultClick(result)}
                              onMouseEnter={() => setSelectedIndex(baseIndex + i)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No results */}
                {query.length >= 2 && queryMode !== 'command' && results.length === 0 && !isLoading && (
                  <div className="py-8 text-center text-slate-500">
                    <p className="text-sm">No results found</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different search term or use / for commands</p>
                  </div>
                )}

                {/* No commands found */}
                {queryMode === 'command' && filteredCommands.length === 0 && (
                  <div className="py-8 text-center text-slate-500">
                    <p className="text-sm">No matching commands</p>
                    <p className="text-xs text-slate-400 mt-1">Try: /new, /dispatch, /inventory</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white rounded border border-slate-200">↑</kbd>
                    <kbd className="px-1 py-0.5 bg-white rounded border border-slate-200">↓</kbd>
                    to navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200">↵</kbd>
                    to select
                  </span>
                </div>
                <span className="text-slate-300">Nerva Command Palette</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Result item component
function ResultItem({
  result,
  isSelected,
  onClick,
  onMouseEnter
}: {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
        isSelected ? 'bg-primary-50' : 'hover:bg-slate-50'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <ResultIcon type={result.type} icon={result.icon} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary-900' : 'text-slate-900'}`}>
          {result.title}
        </p>
        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
      </div>
      <TypeBadge type={result.type} />
    </button>
  );
}

// Result icon component
function ResultIcon({ type, icon }: { type: ResultType; icon?: string }) {
  const baseClass = 'h-8 w-8 rounded-lg flex items-center justify-center';

  // Command icons
  if (type === 'command') {
    const iconClass = 'h-4 w-4';
    switch (icon) {
      case 'plus':
        return (
          <div className={`${baseClass} bg-emerald-100 text-emerald-600`}>
            <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
        );
      case 'truck':
        return (
          <div className={`${baseClass} bg-orange-100 text-orange-600`}>
            <TruckIcon />
          </div>
        );
      case 'box':
        return (
          <div className={`${baseClass} bg-purple-100 text-purple-600`}>
            <ItemIcon />
          </div>
        );
      case 'clipboard':
        return (
          <div className={`${baseClass} bg-blue-100 text-blue-600`}>
            <OrderIcon />
          </div>
        );
      case 'home':
        return (
          <div className={`${baseClass} bg-slate-100 text-slate-600`}>
            <HomeIcon />
          </div>
        );
      default:
        return (
          <div className={`${baseClass} bg-slate-100 text-slate-600`}>
            <CommandIcon />
          </div>
        );
    }
  }

  // Entity icons
  const config: Record<ResultType, { bg: string; color: string; Icon: () => JSX.Element }> = {
    order: { bg: 'bg-blue-100', color: 'text-blue-600', Icon: OrderIcon },
    customer: { bg: 'bg-emerald-100', color: 'text-emerald-600', Icon: CustomerIcon },
    item: { bg: 'bg-purple-100', color: 'text-purple-600', Icon: ItemIcon },
    trip: { bg: 'bg-orange-100', color: 'text-orange-600', Icon: TruckIcon },
    purchase_order: { bg: 'bg-amber-100', color: 'text-amber-600', Icon: OrderIcon },
    shipment: { bg: 'bg-cyan-100', color: 'text-cyan-600', Icon: ShipmentIcon },
    supplier: { bg: 'bg-rose-100', color: 'text-rose-600', Icon: SupplierIcon },
    recent: { bg: 'bg-slate-100', color: 'text-slate-600', Icon: ClockIcon },
    command: { bg: 'bg-slate-100', color: 'text-slate-600', Icon: CommandIcon },
  };

  const { bg, color, Icon } = config[type] || config.recent;

  return (
    <div className={`${baseClass} ${bg} ${color}`}>
      <Icon />
    </div>
  );
}

// Type badge component
function TypeBadge({ type }: { type: ResultType }) {
  const labels: Record<ResultType, string> = {
    order: 'Order',
    customer: 'Customer',
    item: 'Item',
    trip: 'Trip',
    purchase_order: 'PO',
    shipment: 'Shipment',
    supplier: 'Supplier',
    recent: 'Recent',
    command: 'Action',
  };

  if (type === 'command') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
        {labels[type]}
      </span>
    );
  }

  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
      {labels[type]}
    </span>
  );
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}

function CustomerIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ItemIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function ShipmentIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function SupplierIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CommandIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}
