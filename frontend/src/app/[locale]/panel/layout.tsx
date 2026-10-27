import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { PanelShell } from '@/features/panel/panel-shell'

export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]/panel'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'panel' })
  return {
    title: { default: t('title'), template: t('titleTemplate') },
    robots: { index: false },
  }
}

/** Providers and admins only: proxy.ts sends visitors to /login first. */
export default async function PanelLayout({
  params,
  children,
}: LayoutProps<'/[locale]/panel'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PanelShell>{children}</PanelShell>
}
