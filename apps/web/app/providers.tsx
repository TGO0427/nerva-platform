'use client';

import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

// Extract error message from various error formats
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for API error response
    if ('response' in error && typeof (error as { response?: { data?: { message?: string } } }).response === 'object') {
      const response = (error as { response: { data?: { message?: string } } }).response;
      if (response.data?.message) {
        return response.data.message;
      }
    }
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// Inner component that has access to toast context
function QueryClientProviderWithToast({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);

  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors
              if (error instanceof Error && 'response' in error) {
                const status = (error as { response?: { status?: number } }).response?.status;
                if (status && status >= 400 && status < 500) {
                  return false;
                }
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
        mutationCache: new MutationCache({
          onError: (error) => {
            const message = getErrorMessage(error);
            addToastRef.current(message, 'error');
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <QueryClientProviderWithToast>{children}</QueryClientProviderWithToast>
      </ConfirmProvider>
    </ToastProvider>
  );
}
