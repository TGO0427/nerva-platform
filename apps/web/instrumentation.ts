export async function register() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    return;
  }

  const Sentry = await import('@sentry/nextjs');

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
