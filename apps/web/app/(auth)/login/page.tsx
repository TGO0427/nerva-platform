'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import type { ApiError } from '@nerva/shared';
import { AxiosError } from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    tenantId?: string;
    email?: string;
    password?: string;
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

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
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

    try {
      await login({ tenantId, email, password });
      router.push('/dashboard');
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.data?.message) {
        const message = axiosError.response.data.message;
        setError(Array.isArray(message) ? message.join(', ') : message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          Sign in to your account
        </h2>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

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

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          placeholder="Enter your password"
          error={fieldErrors.password}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Sign in
        </Button>

        <p className="text-center text-sm text-gray-600">
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to home
          </Link>
        </p>
      </form>
    </div>
  );
}
