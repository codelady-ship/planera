import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountView } from '@/features/account/account-view'
import { AlarmReader } from '@/features/diary/alarm-reader'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/account'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })
  return { title: t('title'), robots: { index: false } }
}

/** Signed-in only: proxy.ts redirects visitors without a session to /login. */
export default async function AccountPage({
  params,
}: PageProps<'/[locale]/account'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {/* useSearchParams inside: rendered on the client past this boundary. */}
        <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
          <AccountView />
        </Suspense>
        <Suspense>
          <AlarmReader />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
