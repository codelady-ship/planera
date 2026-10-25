import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { ApiUnavailableError, getPublic } from './server'
import type { Category, Page, ProviderDetail, ProviderSummary } from './types'

/**
 * Public catalog reads for Server Components. Cached reads never throw (an
 * error would not survive the cache boundary as the same class): an outage
 * is returned as 'unavailable' and cached for seconds only.
 */

export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheTag('categories')
  try {
    const categories = (await getPublic<Category[]>('/api/categories')) ?? []
    cacheLife('minutes')
    return categories
  } catch {
    cacheLife('seconds')
    return []
  }
}

/** One provider page: null when it does not exist. */
export async function getProvider(
  slug: string,
): Promise<ProviderDetail | null | 'unavailable'> {
  'use cache'
  cacheTag(`provider:${slug}`)
  try {
    const detail = await getPublic<ProviderDetail>(
      `/api/providers/${encodeURIComponent(slug)}`,
    )
    cacheLife('minutes')
    return detail
  } catch {
    cacheLife('seconds')
    return 'unavailable'
  }
}

export const SEARCH_KEYS = [
  'q',
  'category',
  'city',
  'maxPrice',
  'minRating',
  'sort',
  'page',
] as const

export type SearchParams = Partial<Record<(typeof SEARCH_KEYS)[number], string>>

/** Request-time search; throws {@link ApiUnavailableError} during an outage. */
export async function searchProviders(
  params: SearchParams,
): Promise<Page<ProviderSummary>> {
  const query = new URLSearchParams()
  for (const key of SEARCH_KEYS) {
    const value = params[key]
    if (value) query.set(key, value)
  }
  query.set('size', '12')
  const page = await getPublic<Page<ProviderSummary>>(`/api/providers?${query}`)
  if (!page) throw new ApiUnavailableError()
  return page
}
