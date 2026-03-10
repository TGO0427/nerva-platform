'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { AxiosError } from 'axios';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendTenantId, setResendTenantId] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!tokenFromUrl) {
      setStatus('error');
      setError('No verification token provided. Please check the link in your email.');
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        await api.post('/auth/verify-email', { token: tokenFromUrl });
        setStatus('success');
      } catch (err) {
        const axiosError = err as AxiosError<{ message: string | string[] }>;
        if (axiosError.response?.data?.message) {
          const message = axiosError.response.data.message;
          setError(Array.isArray(message) ? message.join(', ') : message);
        } else {
          setError('Verification failed. The link may be invalid or expired.');
        }
        setStatus('error');
      }
    };

    verify();
  }, [tokenFromUrl]);

  const handleResend = async () => {
    if (!resendEmail.trim() || !resendTenantId.trim()) return;

    setResendLoading(true);
    setResendSuccess(false);

    try {
      await api.post('/auth/resend-verification', {
        tenantId: resendTenantId,
        email: resendEmail,
      });
      setResendSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string | string[] }>;
      if (axiosError.response?.data?.message) {
        const message = axiosError.response.data.message;
        setError(Array.isArray(message) ? message.join(', ') : message);
      } else {
        setError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="card">
        <div className="space-y-5 text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Verifying your email...
          </h2>
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
          </div>
          <p className="text-sm text-gray-500">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="card">
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 text-center">
            Email verified
          </h2>

          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">
              Your email address has been verified successfully. You can now sign in to your account.
            </p>
          </div>

          <Link
            href="/login"
            className="block w-full text-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="card">
      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          Verification failed
        </h2>

        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>

        {!resendSuccess ? (
          <>
            <p className="text-sm text-gray-600 text-center">
              Need a new verification link? Enter your details below.
            </p>

            <Input
              label="Tenant ID"
              type="text"
              value={resendTenantId}
              onChange={(e) => setResendTenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
            />

            <Input
              label="Email address"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />

            <Button
              type="button"
              className="w-full"
              isLoading={resendLoading}
              disabled={resendLoading || !resendEmail.trim() || !resendTenantId.trim()}
              onClick={handleResend}
            >
              Resend verification email
            </Button>
          </>
        ) : (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">
              If an account exists with that email, a new verification link has been sent. Please check your inbox.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="card">
          <div className="space-y-5 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
          </div>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
