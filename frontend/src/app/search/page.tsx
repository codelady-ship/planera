import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiUnavailable } from '@/features/common/api-unavailable'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { ProviderResultCard } from '@/features/search/provider-result-card'
import { SearchFilters } from '@/features/search/search-filters'
import {
  SEARCH_KEYS,
  getCategories,
  searchProviders,
  type SearchParams,
} from '@/lib/api/catalog'
import { ApiUnavailableError } from '@/lib/api/server'
import type { Category, Page, ProviderSummary } from '@/lib/api/types'

export const metadata: Metadata = {
  title: 'Mütəxəssis axtarışı',
  description: 'Kateqoriya, şəhər, qiymət və reytinqə görə mütəxəssis tapın.',
}

export default function SearchPage({ searchParams }: PageProps<'/search'>) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold md:text-3xl">
          Mütəxəssis axtarışı
        </h1>
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}

async function Results({
  searchParams,
}: {
  searchParams: PageProps<'/search'>['searchParams']
}) {
  const raw = await searchParams
  const params: SearchParams = {}
  for (const key of SEARCH_KEYS) {
    const value = raw[key]
    if (typeof value === 'string' && value) params[key] = value
  }

  let categories: Category[] = []
  let page: Page<ProviderSummary>
  try {
    ;[categories, page] = await Promise.all([
      getCategories(),
      searchProviders(params),
    ])
  } catch (error) {
    if (error instanceof ApiUnavailableError) return <ApiUnavailable />
    throw error
  }

  const current = Number(params.page ?? 0)
  const pageLink = (n: number) => {
    const query = new URLSearchParams(params as Record<string, string>)
    query.set('page', String(n))
    return `/search?${query}`
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <SearchFilters categories={categories} />
      <section className="flex flex-1 flex-col gap-4" aria-live="polite">
        <p className="text-sm text-muted-foreground">
          {page.totalElements} mütəxəssis tapıldı
        </p>
        {page.content.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
            <SearchX className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Heç nə tapılmadı</p>
            <p className="text-sm text-muted-foreground">
              Filtrləri dəyişin və ya sıfırlayın.
            </p>
            <Link href="/search" className={buttonVariants()}>
              Bütün mütəxəssislər
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {page.content.map((provider) => (
              <li key={provider.slug}>
                <ProviderResultCard provider={provider} />
              </li>
            ))}
          </ul>
        )}
        {page.totalPages > 1 && (
          <nav className="flex justify-center gap-2" aria-label="Səhifələr">
            {current > 0 && (
              <Link
                href={pageLink(current - 1)}
                className={buttonVariants({ variant: 'outline' })}
              >
                Əvvəlki
              </Link>
            )}
            {current < page.totalPages - 1 && (
              <Link
                href={pageLink(current + 1)}
                className={buttonVariants({ variant: 'outline' })}
              >
                Növbəti
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-56 rounded-xl" />
      ))}
    </div>
  )
}
