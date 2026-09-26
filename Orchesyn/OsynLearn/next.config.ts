import type { NextConfig } from 'next';

/**
 * Two build targets:
 *   (default)            — normal server build for `next start` (sandbox preview)
 *   BUILD_TARGET=static  — fully static export into /out for permanent hosting
 */
const isStatic = process.env.BUILD_TARGET === 'static';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(isStatic
    ? {
        output: 'export' as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        // PWA: allow the service worker + manifest to be served from the app root
        async headers() {
          return [
            {
              source: '/sw.js',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
                { key: 'Service-Worker-Allowed', value: '/' },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
