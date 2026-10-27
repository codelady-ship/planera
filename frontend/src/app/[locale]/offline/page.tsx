import type { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { WifiOff } from 'lucide-react'
import { RetryButton } from '@/features/pwa/retry-button'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/offline'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'offline' })
  return { title: t('title'), robots: { index: false } }
}

// Served by the service worker when a page cannot be fetched (#54).
export default async function OfflinePage({
  params,
}: PageProps<'/[locale]/offline'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <OfflineCard />
}

function OfflineCard() {
  const t = useTranslations('offline')
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
        <WifiOff className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('text')}</p>
        <RetryButton />
      </div>
    </main>
  )
}
