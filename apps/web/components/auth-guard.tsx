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
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);

  useEffect(() => {
    // If we have a token but no user, try to fetch the user
    if (isAuthenticated && !user && !isLoading) {
      fetchUser();
    }
  }, [isAuthenticated, user, isLoading, fetchUser]);

  useEffect(() => {
    // After a short delay, show session expired message or redirect
    if (!isLoading && !isAuthenticated) {
      // Check if user previously had a session (had a token that's now invalid)
      const hadSession = typeof window !== 'undefined' && sessionStorage.getItem('nerva_had_session');

      if (hadSession) {
        setShowExpiredMessage(true);
        sessionStorage.removeItem('nerva_had_session');
      } else {
        // Fast redirect for fresh visits
        router.replace('/login');
      }
    }

    // Track that user has an active session
    if (isAuthenticated && typeof window !== 'undefined') {
      sessionStorage.setItem('nerva_had_session', 'true');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show session expired message
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

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated and not showing expired message - will redirect
  if (!isAuthenticated) {
    return null;
  }

  // Wait for user data to be loaded before rendering
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

  // Redirect if user type doesn't match required type
  if (requiredUserType && user.userType !== requiredUserType) {
    router.replace(getHomeRoute(user.userType));
    return null;
  }

  return <>{children}</>;
}
