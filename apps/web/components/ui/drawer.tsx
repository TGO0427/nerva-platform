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
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Drawer({ isOpen, onClose, children, title, size = 'md' }: DrawerProps) {
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
            className={`relative w-full ${sizeClasses[size]} h-full bg-white shadow-xl flex flex-col`}
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              {title && (
                <h2 id="drawer-title" className="text-lg font-semibold text-gray-900">
                  {title}
                </h2>
              )}
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors ml-auto"
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
