'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  ({ options, value, onChange, placeholder = 'Search...', label, error, className, disabled }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find selected option label
    const selectedOption = options.find((o) => o.value === value);

    // Filter options based on search
    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearch('');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset highlight when filtered options change
    useEffect(() => {
      setHighlightedIndex(0);
    }, [search]);

    const handleSelect = (option: ComboboxOption) => {
      onChange?.(option.value);
      setIsOpen(false);
      setSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearch('');
          break;
      }
    };

    return (
      <div className="w-full" ref={containerRef}>
        {label && (
          <label className="block text-sm font-medium text-text-secondary dark:text-text-dark-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? search : selectedOption?.label || ''}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'block w-full h-9 rounded-md border bg-surface-card px-3 pr-8 text-sm text-text-primary transition-colors focus:outline-none focus:ring-1',
              'dark:bg-surface-dark-card dark:text-text-dark-primary',
              error
                ? 'border-danger focus:border-danger focus:ring-danger'
                : 'border-surface-border focus:border-primary-500 focus:ring-primary-500 dark:border-surface-dark-border',
              disabled && 'bg-surface-secondary dark:bg-surface-dark-secondary cursor-not-allowed opacity-50',
              className
            )}
          />
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="absolute inset-y-0 right-0 flex items-center px-2 text-text-muted dark:text-text-dark-muted"
            tabIndex={-1}
          >
            <ChevronIcon className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-surface-card dark:bg-surface-dark-card border border-surface-border dark:border-surface-dark-border rounded-md shadow-md max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-text-muted dark:text-text-dark-muted">No results found</div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'px-3 py-2 text-sm text-text-primary dark:text-text-dark-primary cursor-pointer',
                      index === highlightedIndex && 'bg-primary-50 dark:bg-primary-900/30',
                      option.value === value && 'bg-primary-100 dark:bg-primary-900/50 font-medium',
                      index !== highlightedIndex && option.value !== value && 'hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary'
                    )}
                  >
                    {option.label}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Combobox.displayName = 'Combobox';

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
