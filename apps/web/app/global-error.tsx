'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Poppins, system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
            padding: '1rem',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#0284c7',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Nerva
            </p>
            <h1
              style={{
                marginTop: '0.5rem',
                fontSize: '3.75rem',
                fontWeight: 700,
                color: '#111827',
                lineHeight: 1,
              }}
            >
              500
            </h1>
            <h2
              style={{
                marginTop: '0.5rem',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#374151',
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                marginTop: '1rem',
                color: '#6b7280',
                fontSize: '0.875rem',
                lineHeight: 1.625,
              }}
            >
              A critical error occurred. Please try again or contact support if
              the problem persists.
            </p>
            {error.digest && (
              <p
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
            <div
              style={{
                marginTop: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}
            >
              <button
                onClick={reset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '0.375rem',
                  backgroundColor: '#0284c7',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <a
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '0.375rem',
                  backgroundColor: '#e5e7eb',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#111827',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
