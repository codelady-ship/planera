import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingWizard } from '@/features/booking/booking-wizard'
import { ApiUnavailable } from '@/features/common/api-unavailable'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'
import { getProvider } from '@/lib/api/catalog'

export const metadata: Metadata = { title: 'Randevu götür' }

export default function BookPage({ params }: PageProps<'/book/[slug]'>) {
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
  params: PageProps<'/book/[slug]'>['params']
}) {
  const { slug } = await params
  const provider = await getProvider(slug)
  if (provider === 'unavailable') return <ApiUnavailable />
  if (!provider) notFound()
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Randevu</p>
        <h1 className="text-2xl font-semibold">{provider.summary.name}</h1>
        <p className="text-muted-foreground">{provider.summary.title}</p>
      </div>
      <BookingWizard provider={provider} />
    </div>
  )
}
