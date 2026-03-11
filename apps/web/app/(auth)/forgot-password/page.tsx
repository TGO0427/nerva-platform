'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { AxiosError } from 'axios';

export default function ForgotPasswordPage() {
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    tenantId?: string;
    email?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!tenantId.trim()) {
      errors.tenantId = 'Tenant ID is required';
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      errors.tenantId = 'Invalid Tenant ID format';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', {
        tenantId,
        email,
      });

      setSubmitted(true);
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string | string[] }>;
      if (axiosError.response?.data?.message) {
        const message = axiosError.response.data.message;
        setError(Array.isArray(message) ? message.join(', ') : message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card">
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-gray-900 text-center">
            Check your email
          </h2>

          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">
              If an account exists with that email, a password reset link has been sent.
            </p>
          </div>

          <p className="text-center text-sm text-gray-600">
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          Reset your password
        </h2>

        <p className="text-sm text-gray-600 text-center">
          Enter your Tenant ID and email address and we&apos;ll send you a link to reset your password.
        </p>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <Input
            label="Tenant ID"
            type="text"
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setFieldErrors((prev) => ({ ...prev, tenantId: undefined }));
            }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            error={fieldErrors.tenantId}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-gray-500">
            Ask your administrator for your organization&apos;s Tenant ID
          </p>
        </div>

        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="you@company.com"
          error={fieldErrors.email}
          autoComplete="email"
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Send reset link
        </Button>

        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
