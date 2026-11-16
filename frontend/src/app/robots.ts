import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { SITE_URL } from '@/lib/site/url'

// Signed-in and booking pages have nothing to index; the API gateway is not a page.
const PRIVATE = [
  '/account',
  '/panel',
  '/login',
  '/register',
  '/book',
  '/offline',
]

export default function robots(): MetadataRoute.Robots {
  const prefixes = [
    '',
    ...routing.locales
      .filter((l) => l !== routing.defaultLocale)
      .map((l) => `/${l}`),
  ]
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        ...prefixes.flatMap((p) => PRIVATE.map((path) => `${p}${path}`)),
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
