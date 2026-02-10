'use client';

import { useParams } from 'next/navigation';
import { CustomerPortalShell } from '@/components/layout/customer-portal-shell';
import { CustomerPortalProvider, useCustomerPortal } from '@/lib/contexts/customer-portal-context';

function CustomerPortalLayoutInner({ children }: { children: React.ReactNode }) {
  const { customer, isLoading } = useCustomerPortal();

  return (
    <CustomerPortalShell
      customer={customer ? {
        id: customer.id,
        name: customer.name,
        code: customer.code,
        email: customer.email,
      } : null}
      isLoading={isLoading}
    >
      {children}
    </CustomerPortalShell>
  );
}

export default function CustomerPortalCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const customerId = params.customerId as string;

  return (
    <CustomerPortalProvider customerId={customerId}>
      <CustomerPortalLayoutInner>{children}</CustomerPortalLayoutInner>
    </CustomerPortalProvider>
  );
}
