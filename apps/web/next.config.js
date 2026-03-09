const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@nerva/shared'],
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
