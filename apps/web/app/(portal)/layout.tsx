'use client';

import { AuthGuard } from '@/components/auth-guard';
import { PortalShell } from '@/components/layout/portal-shell';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredUserType="customer">
      <PortalShell>{children}</PortalShell>
    </AuthGuard>
  );
}
