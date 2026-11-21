import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

/** Who may show Planera in a frame: CSP frame-ancestors (no X-Frame-Options). */
const FRAME_ANCESTORS = [
  "'self'",
  'https://antiqa-portfolio.vercel.app',
  'https://antiqacode.vercel.app',
]

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The service worker must never be served from a stale cache (#54).
  async headers() {
    return [
      // Only the site itself and the owner's portfolio may frame the pages
      // (the portfolio shows the read-only demo admin in an iframe).
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${FRAME_ANCESTORS.join(' ')}`,
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

// Interface languages (#94): messages and the request config live in src/i18n.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withNextIntl(nextConfig)
