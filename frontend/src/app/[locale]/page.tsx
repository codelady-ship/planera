import { Suspense } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { ScrollScene } from '@/components/motion/scroll-scene'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryGrid } from '@/features/home/category-grid'
import { HeroSearch } from '@/features/home/hero-search'
import { HowItWorks } from '@/features/home/how-it-works'
import { LiveReminders } from '@/features/home/live-reminders'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { TopProviders } from '@/features/home/top-providers'
import { getCategories, getTopProviders } from '@/lib/api/catalog'

async function Categories() {
  return <CategoryGrid categories={await getCategories()} />
}

async function Providers() {
  const { providers, today } = await getTopProviders()
  return <TopProviders providers={providers} today={today} />
}

function SectionSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  )
}

export default async function Home({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <ScrollScene />
      <SiteHeader />
      <main className="flex-1">
        <HeroSearch />
        <LiveReminders />
        <Suspense fallback={<SectionSkeleton />}>
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
