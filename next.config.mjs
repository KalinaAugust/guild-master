import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable the native browser View Transitions API for App Router
  // navigations (global page crossfade tuned in src/app/globals.css).
  experimental: {
    viewTransition: true,
  },
  // Static, route-agnostic security headers. The dynamic, nonce-based
  // Content-Security-Policy is set per-request in src/proxy.ts.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/avatars/**',
      },
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/guild-avatars/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
