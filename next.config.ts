// Admin-Dashboard/next.config.ts
// Part 31 — Next.js 16 configuration for the admin dashboard.

import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Fix: Turbopack detected multiple lockfiles (RN app root + admin-dashboard).
  // Explicitly set root to THIS project's directory so Turbopack never looks
  // at the parent React Native package-lock.json.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/render/**',
      },
      // DiceBear avatars
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
            ].join('; '),
          },
        ],
      },
    ];
  },

};

export default nextConfig;