import type { MetadataRoute } from 'next'
import { cacheLife } from 'next/cache'
import { routing } from '@/i18n/routing'
import { getPublic } from '@/lib/api/server'
import type { Page, ProviderSummary } from '@/lib/api/types'
import { languageAlternates, localizedUrl } from '@/lib/site/seo'

const STATIC_PATHS = ['', '/search', '/privacy']

/** Provider pages for the sitemap; an outage or a sleeping API just leaves them out. */
async function providerSlugs(): Promise<string[]> {
  'use cache'
  try {
    const page = await getPublic<Page<ProviderSummary>>(
      '/api/providers?size=50',
    )
    cacheLife('hours')
    return page?.content.map((p) => p.slug) ?? []
  } catch {
    cacheLife('minutes')
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await providerSlugs()
  const paths = [
    ...STATIC_PATHS,
    ...slugs.map((slug) => `/providers/${encodeURIComponent(slug)}`),
  ]
  return paths.map((path) => ({
    url: localizedUrl(path, routing.defaultLocale),
    changeFrequency: path.startsWith('/providers/') ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/search' ? 0.8 : 0.6,
    alternates: { languages: languageAlternates(path) },
  }))
}
