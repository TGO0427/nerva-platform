'use client';

import { ReactNode, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { modalOverlayVariants, drawerVariants, transitions } from '@/lib/motion';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Drawer({ isOpen, onClose, children, title, subtitle, size = 'md' }: DrawerProps) {
  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      const focusable = document.querySelector('[data-drawer-content] button, [data-drawer-content] input');
      if (focusable) {
        (focusable as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            variants={modalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.fast}
            onClick={onClose}
          />

          {/* Drawer content */}
          <motion.div
            className={`relative w-full ${sizeClasses[size]} h-full bg-surface-card dark:bg-surface-dark-card shadow-md flex flex-col`}
            variants={drawerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            data-drawer-content
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'drawer-title' : undefined}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-surface-border dark:border-surface-dark-border flex-shrink-0">
              <div>
                {title && (
                  <h2 id="drawer-title" className="text-lg font-semibold text-text-primary dark:text-text-dark-primary">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 text-text-muted dark:text-text-dark-muted hover:text-text-secondary dark:hover:text-text-dark-primary rounded-md hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary transition-colors ml-auto"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Progress bar for stops - used by dispatch
interface StopsProgressProps {
  completed: number;
  total: number;
  failed?: number;
  className?: string;
}

export function StopsProgress({ completed, total, failed = 0, className }: StopsProgressProps) {
  const completedPct = total > 0 ? (completed / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div className="flex-1 h-2 bg-surface-secondary dark:bg-surface-dark-secondary rounded-full overflow-hidden flex min-w-[60px]">
        {completedPct > 0 && (
          <div
            className="bg-success transition-all"
            style={{ width: `${completedPct}%` }}
          />
        )}
        {failedPct > 0 && (
          <div
            className="bg-danger transition-all"
            style={{ width: `${failedPct}%` }}
          />
        )}
      </div>
      <span className="text-xs font-medium text-text-secondary dark:text-text-dark-secondary tabular-nums whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}
