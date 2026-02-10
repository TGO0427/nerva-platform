'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCustomer } from '@/lib/queries/customers';
import type { Customer } from '@nerva/shared';

interface CustomerPortalContextType {
  customer: Customer | null;
  isLoading: boolean;
  error: Error | null;
}

const CustomerPortalContext = createContext<CustomerPortalContextType | undefined>(undefined);

interface CustomerPortalProviderProps {
  customerId: string;
  children: ReactNode;
}

export function CustomerPortalProvider({ customerId, children }: CustomerPortalProviderProps) {
  const { data: customer, isLoading, error } = useCustomer(customerId);

  return (
    <CustomerPortalContext.Provider
      value={{
        customer: customer || null,
        isLoading,
        error: error as Error | null,
      }}
    >
      {children}
    </CustomerPortalContext.Provider>
  );
}

export function useCustomerPortal() {
  const context = useContext(CustomerPortalContext);
  if (context === undefined) {
    throw new Error('useCustomerPortal must be used within a CustomerPortalProvider');
  }
  return context;
}
