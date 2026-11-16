/**
 * Public origin of the site for robots.txt, sitemap.xml and absolute links.
 * Vercel production is https://planera-az.vercel.app; NEXT_PUBLIC_SITE_URL
 * overrides it (for example on a custom domain).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://planera-az.vercel.app'
).replace(/\/+$/, '')
