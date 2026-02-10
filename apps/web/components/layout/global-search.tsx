'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { api } from '@/lib/api';

interface SearchResult {
  type: 'order' | 'customer' | 'item';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Search API
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const searchResults: SearchResult[] = [];

        // Search orders
        const ordersRes = await api.get('/sales/orders', {
          params: { search: debouncedQuery, limit: 3 }
        });
        if (ordersRes.data?.data) {
          ordersRes.data.data.forEach((order: { id: string; orderNo: string; customerName?: string; status: string }) => {
            searchResults.push({
              type: 'order',
              id: order.id,
              title: order.orderNo,
              subtitle: order.customerName || order.status,
              href: `/sales/${order.id}`,
            });
          });
        }

        // Search customers
        const customersRes = await api.get('/master-data/customers', {
          params: { search: debouncedQuery, limit: 3 }
        });
        if (customersRes.data?.data) {
          customersRes.data.data.forEach((customer: { id: string; name: string; code?: string }) => {
            searchResults.push({
              type: 'customer',
              id: customer.id,
              title: customer.name,
              subtitle: customer.code || 'Customer',
              href: `/master-data/customers/${customer.id}`,
            });
          });
        }

        // Search items
        const itemsRes = await api.get('/master-data/items', {
          params: { search: debouncedQuery, limit: 3 }
        });
        if (itemsRes.data?.data) {
          itemsRes.data.data.forEach((item: { id: string; sku: string; description: string }) => {
            searchResults.push({
              type: 'item',
              id: item.id,
              title: item.sku,
              subtitle: item.description,
              href: `/master-data/items/${item.id}`,
            });
          });
        }

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
  }, [debouncedQuery]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [results, selectedIndex, router]);

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
    router.push(result.href);
    setIsOpen(false);
    setQuery('');
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
              className="fixed left-1/2 top-24 -translate-x-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
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
                  placeholder="Search orders, customers, items..."
                  className="flex-1 outline-none text-sm placeholder:text-slate-400"
                />
                {isLoading && (
                  <div className="h-4 w-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {results.length > 0 ? (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                          index === selectedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          result.type === 'order' ? 'bg-blue-100 text-blue-600' :
                          result.type === 'customer' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {result.type === 'order' && <OrderIcon />}
                          {result.type === 'customer' && <CustomerIcon />}
                          {result.type === 'item' && <ItemIcon />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{result.title}</p>
                          <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                        </div>
                        <span className="text-xs text-slate-400 capitalize">{result.type}</span>
                      </button>
                    ))}
                  </div>
                ) : query.length >= 2 && !isLoading ? (
                  <div className="py-8 text-center text-slate-500">
                    <p className="text-sm">No results found</p>
                    <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                  </div>
                ) : !isLoading ? (
                  <div className="py-6 px-4 text-center text-slate-500">
                    <p className="text-sm">Type to search</p>
                    <p className="text-xs text-slate-400 mt-1">Search by order number, customer name, or SKU</p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

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
