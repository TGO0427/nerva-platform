'use client';

import { AuthGuard } from '@/components/auth-guard';
import { DriverShell } from '@/components/layout/driver-shell';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard requiredUserType="driver">
      <DriverShell>{children}</DriverShell>
    </AuthGuard>
  );
}
