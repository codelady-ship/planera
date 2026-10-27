import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingWizard } from '@/features/booking/booking-wizard'
import { ApiUnavailable } from '@/features/common/api-unavailable'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { getProvider } from '@/lib/api/catalog'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/book/[slug]'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking' })
  return { title: t('title') }
}

export default function BookPage({
  params,
}: PageProps<'/[locale]/book/[slug]'>) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <Booking params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}

async function Booking({
  params,
}: {
  params: PageProps<'/[locale]/book/[slug]'>['params']
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'booking' })
  const provider = await getProvider(slug)
  if (provider === 'unavailable') return <ApiUnavailable />
  if (!provider) notFound()
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{t('label')}</p>
        <h1 className="text-2xl font-semibold">{provider.summary.name}</h1>
        <p className="text-muted-foreground">{provider.summary.title}</p>
      </div>
      <BookingWizard provider={provider} />
    </div>
  )
}
