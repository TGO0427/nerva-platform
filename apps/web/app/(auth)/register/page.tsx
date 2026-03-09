'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { AxiosError } from 'axios';

export default function RegisterPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [tenantCodeTouched, setTenantCodeTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    tenantId: string;
    tenantCode: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auto-suggest tenant code from company name (until user edits it manually)
  useEffect(() => {
    if (!tenantCodeTouched && companyName) {
      const suggested = companyName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 10);
      setTenantCode(suggested);
    }
  }, [companyName, tenantCodeTouched]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!companyName.trim()) {
      errors.companyName = 'Company name is required';
    }

    if (!tenantCode.trim()) {
      errors.tenantCode = 'Tenant code is required';
    } else if (tenantCode.length < 2 || tenantCode.length > 10) {
      errors.tenantCode = 'Must be 2-10 characters';
    } else if (!/^[A-Z0-9]+$/.test(tenantCode)) {
      errors.tenantCode = 'Only uppercase letters and numbers';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email address';
    }

    if (!displayName.trim()) {
      errors.displayName = 'Your name is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      const response = await api.post('/tenants/register', {
        companyName,
        tenantCode,
        email,
        displayName,
        password,
      });

      setSuccess({
        tenantId: response.data.tenant.id,
        tenantCode: response.data.tenant.code,
      });
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string | string[] }>;
      if (axiosError.response?.data?.message) {
        const message = axiosError.response.data.message;
        setError(Array.isArray(message) ? message.join(', ') : message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckIcon className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Account Created
          </h2>
          <p className="text-sm text-gray-600">
            Your organization has been set up successfully.
          </p>
          <div className="rounded-md bg-gray-50 p-4 text-left space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase">
                Tenant ID
              </span>
              <p className="text-sm font-mono text-gray-900 break-all">
                {success.tenantId}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase">
                Tenant Code
              </span>
              <p className="text-sm font-mono text-gray-900">
                {success.tenantCode}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Save your Tenant ID -- you will need it to sign in.
          </p>
          <Button
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Continue to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          Create your account
        </h2>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Organization
          </p>

          <Input
            label="Company Name"
            type="text"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, companyName: '' } ));
            }}
            placeholder="Acme Logistics"
            error={fieldErrors.companyName}
            autoComplete="organization"
          />

          <div>
            <Input
              label="Tenant Code"
              type="text"
              value={tenantCode}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                setTenantCode(val);
                setTenantCodeTouched(true);
                setFieldErrors((prev) => ({ ...prev, tenantCode: '' } ));
              }}
              placeholder="ACME"
              error={fieldErrors.tenantCode}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">
              2-10 characters, uppercase letters and numbers only
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Admin Account
          </p>

          <Input
            label="Your Name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, displayName: '' } ));
            }}
            placeholder="John Smith"
            error={fieldErrors.displayName}
            autoComplete="name"
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: '' } ));
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
                  setFieldErrors((prev) => ({ ...prev, password: '' } ));
                }}
                placeholder="Minimum 8 characters"
                error={fieldErrors.password}
                autoComplete="new-password"
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
          </div>

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, confirmPassword: '' } ));
            }}
            placeholder="Re-enter your password"
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          Create Account
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Sign in
          </Link>
        </p>

        <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
          <Link href="/terms" className="hover:text-gray-600">
            Terms of Service
          </Link>
          <span className="mx-2">&middot;</span>
          <Link href="/privacy" className="hover:text-gray-600">
            Privacy Policy
          </Link>
        </div>
      </form>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
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
