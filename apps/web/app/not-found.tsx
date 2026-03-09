import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
          Nerva
        </p>
        <h1 className="mt-2 text-6xl font-bold text-gray-900 dark:text-slate-100">
          404
        </h1>
        <h2 className="mt-2 text-xl font-semibold text-gray-700 dark:text-slate-300">
          Page not found
        </h2>
        <p className="mt-4 text-gray-500 dark:text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
