import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiUnavailable } from '@/features/common/api-unavailable'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { ProviderProfile } from '@/features/provider/provider-profile'
import { getProvider } from '@/lib/api/catalog'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/providers/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const provider = await getProvider(slug)
  if (!provider || provider === 'unavailable') return { title: 'Mütəxəssis' }
  const { summary } = provider
  return {
    title: `${summary.name} - ${summary.title}`,
    description:
      provider.bio ??
      `${summary.name}, ${summary.city}. Boş saatı seçin və onlayn randevu götürün.`,
  }
}

export default function ProviderPage({
  params,
}: PageProps<'/[locale]/providers/[slug]'>) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <Profile params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}

async function Profile({
  params,
}: {
  params: PageProps<'/[locale]/providers/[slug]'>['params']
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const provider = await getProvider(slug)
  if (provider === 'unavailable') return <ApiUnavailable />
  if (!provider) notFound()
  return <ProviderProfile provider={provider} />
}
