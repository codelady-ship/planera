import type { Metadata } from 'next'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiUnavailable } from '@/features/common/api-unavailable'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { ProviderResultCard } from '@/features/search/provider-result-card'
import { SearchFilters } from '@/features/search/search-filters'
import { Link } from '@/i18n/navigation'
import {
  SEARCH_KEYS,
  getCategories,
  searchProviders,
  type SearchParams,
} from '@/lib/api/catalog'
import { ApiUnavailableError } from '@/lib/api/server'
import type { Category, Page, ProviderSummary } from '@/lib/api/types'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/search'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'search' })
  return { title: t('title'), description: t('description') }
}

export default async function SearchPage({
  params,
  searchParams,
}: PageProps<'/[locale]/search'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'search' })

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold md:text-3xl">{t('title')}</h1>
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
  searchParams: PageProps<'/[locale]/search'>['searchParams']
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
      <ResultList page={page} current={current} pageLink={pageLink} />
    </div>
  )
}

function ResultList({
  page,
  current,
  pageLink,
}: {
  page: Page<ProviderSummary>
  current: number
  pageLink: (n: number) => string
}) {
  const t = useTranslations('search')
  return (
    <section className="flex flex-1 flex-col gap-4" aria-live="polite">
      <p className="text-sm text-muted-foreground">
        {t('found', { count: page.totalElements })}
      </p>
      {page.content.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{t('empty')}</p>
          <p className="text-sm text-muted-foreground">{t('emptyHint')}</p>
          <Link href="/search" className={buttonVariants()}>
            {t('all')}
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
        <nav className="flex justify-center gap-2" aria-label={t('pages')}>
          {current > 0 && (
            <Link
              href={pageLink(current - 1)}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('previous')}
            </Link>
          )}
          {current < page.totalPages - 1 && (
            <Link
              href={pageLink(current + 1)}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t('next')}
            </Link>
          )}
        </nav>
      )}
    </section>
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
