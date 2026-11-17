import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ScrollScene } from '@/components/motion/scroll-scene'
import { Skeleton } from '@/components/ui/skeleton'
import { WakingServerHint } from '@/features/common/waking-server'
import { CategoryGrid } from '@/features/home/category-grid'
import { HeroSearch } from '@/features/home/hero-search'
import { HowItWorks } from '@/features/home/how-it-works'
import { LiveReminders } from '@/features/home/live-reminders'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { TopProviders } from '@/features/home/top-providers'
import type { Locale } from '@/i18n/routing'
import { getCategories, getTopProviders } from '@/lib/api/catalog'
import { jsonLd, localizedUrl, publicPageMetadata } from '@/lib/site/seo'
import { SITE_URL } from '@/lib/site/url'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return publicPageMetadata({
    locale: locale as Locale,
    path: '',
    title: t('title'),
    description: t('description'),
    imageAlt: t('ogImageAlt'),
    absoluteTitle: true,
  })
}

/** Organization and WebSite (with the real /search?q= endpoint) for search and AI engines. */
function siteJsonLd(locale: string, title: string, description: string) {
  const home = localizedUrl('', locale)
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Planera',
        url: SITE_URL,
        logo: `${SITE_URL}/brand/planera-mark.png`,
        slogan: title.replace(/^Planera - /, ''),
      },
      {
        '@type': 'WebSite',
        '@id': `${home}#website`,
        name: 'Planera',
        url: home,
        description,
        inLanguage: locale,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${localizedUrl('/search', locale)}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
  return jsonLd(data)
}

async function Categories() {
  return <CategoryGrid categories={await getCategories()} />
}

async function Providers() {
  const { providers, today } = await getTopProviders()
  return <TopProviders providers={providers} today={today} />
}

function SectionSkeleton({ hint = false }: { hint?: boolean }) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {hint && <WakingServerHint />}
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  )
}

export default async function Home({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'meta' })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: siteJsonLd(locale, t('title'), t('description')),
        }}
      />
      <ScrollScene />
      <SiteHeader />
      <main className="flex-1">
        <HeroSearch />
        <LiveReminders />
        <Suspense fallback={<SectionSkeleton hint />}>
          <Categories />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <Providers />
        </Suspense>
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  )
}
