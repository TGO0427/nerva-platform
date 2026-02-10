import { AuthGuard } from '@/components/auth-guard';

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
