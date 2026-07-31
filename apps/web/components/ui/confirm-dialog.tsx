'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { modalOverlayVariants, modalContentVariants, transitions } from '@/lib/motion';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolver(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolver?.(true);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolver?.(false);
  }, [resolver]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && options && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  className="absolute inset-0 bg-black/50"
                  variants={modalOverlayVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transitions.fast}
                  onClick={handleCancel}
                />

                {/* Dialog */}
                <motion.div
                  className="relative w-full max-w-md bg-surface-card dark:bg-surface-dark-card rounded-lg shadow-md"
                  variants={modalContentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="confirm-title"
                  aria-describedby="confirm-message"
                >
                  <div className="p-6">
                    {/* Icon */}
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                      options.variant === 'danger'
                        ? 'bg-red-50 dark:bg-red-950/40'
                        : 'bg-primary-50 dark:bg-primary-900/30'
                    }`}>
                      {options.variant === 'danger' ? (
                        <WarningIcon className="h-6 w-6 text-danger dark:text-red-400" />
                      ) : (
                        <QuestionIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="mt-4 text-center">
                      <h3 id="confirm-title" className="text-lg font-semibold text-text-primary dark:text-text-dark-primary">
                        {options.title}
                      </h3>
                      <p id="confirm-message" className="mt-2 text-sm text-text-muted dark:text-text-dark-muted">
                        {options.message}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                      <Button
                        variant="secondary"
                        onClick={handleCancel}
                        className="flex-1"
                      >
                        {options.cancelLabel || 'Cancel'}
                      </Button>
                      <Button
                        variant={options.variant === 'danger' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                        className="flex-1"
                      >
                        {options.confirmLabel || 'Confirm'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}
