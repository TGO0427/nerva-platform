'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import type { ApiError } from '@nerva/shared';
import { AxiosError } from 'axios';

const TENANT_STORAGE_KEY = 'nerva_remembered_tenant';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberTenant, setRememberTenant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    tenantId?: string;
    email?: string;
    password?: string;
  }>({});

  // Load remembered tenant on mount
  useEffect(() => {
    const remembered = localStorage.getItem(TENANT_STORAGE_KEY);
    if (remembered) {
      setTenantId(remembered);
      setRememberTenant(true);
    }
  }, []);

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

    // Save or clear remembered tenant
    if (rememberTenant) {
      localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
    } else {
      localStorage.removeItem(TENANT_STORAGE_KEY);
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          Sign in to your account
        </h2>

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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberTenant"
            checked={rememberTenant}
            onChange={(e) => setRememberTenant(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="rememberTenant" className="text-sm text-gray-600">
            Remember tenant ID on this device
          </label>
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

        <div>
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Enter your password"
              error={fieldErrors.password}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className="mt-1 text-right">
            <button
              type="button"
              className="text-xs text-primary-600 hover:text-primary-700"
              onClick={() => alert('Contact your administrator to reset your password.')}
            >
              Forgot password?
            </button>
          </div>
        </div>

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

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}
