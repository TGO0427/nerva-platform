'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
          Nerva
        </p>
        <h1 className="mt-2 text-6xl font-bold text-gray-900 dark:text-slate-100">
          500
        </h1>
        <h2 className="mt-2 text-xl font-semibold text-gray-700 dark:text-slate-300">
          Something went wrong
        </h2>
        <p className="mt-4 text-gray-500 dark:text-slate-400">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-md bg-gray-200 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
