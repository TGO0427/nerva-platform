'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, getHomeRoute } from '@/lib/auth';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredUserType?: 'internal' | 'customer' | 'driver';
}

export function AuthGuard({ children, requiredUserType }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, fetchUser } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // If we have a token but no user, try to fetch the user
  useEffect(() => {
    if (hydrated && isAuthenticated && !user && !isLoading) {
      fetchUser();
    }
  }, [hydrated, isAuthenticated, user, isLoading, fetchUser]);

  // Handle unauthenticated state
  useEffect(() => {
    if (hydrated && !isLoading && !isAuthenticated) {
      const hadSession = sessionStorage.getItem('nerva_had_session');
      if (hadSession) {
        setShowExpiredMessage(true);
        sessionStorage.removeItem('nerva_had_session');
      } else {
        router.replace('/login');
      }
    }

    if (hydrated && isAuthenticated) {
      sessionStorage.setItem('nerva_had_session', 'true');
    }
  }, [hydrated, isAuthenticated, isLoading, router]);

  // Redirect if user type doesn't match
  useEffect(() => {
    if (user && requiredUserType && user.userType !== requiredUserType) {
      router.replace(getHomeRoute(user.userType));
    }
  }, [user, requiredUserType, router]);

  // Wait for hydration before showing anything
  if (!hydrated) {
    return null;
  }

  if (showExpiredMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-sm text-gray-600 mb-6">
            Your session has expired. Please sign in again to continue.
          </p>
          <Link href="/login">
            <Button className="w-full">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || (!isAuthenticated && !showExpiredMessage)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (requiredUserType && user.userType !== requiredUserType) {
    return null;
  }

  return <>{children}</>;
}
