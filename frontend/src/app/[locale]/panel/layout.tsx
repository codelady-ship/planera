import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { PanelShell } from '@/features/panel/panel-shell'

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s | Planera panel' },
  robots: { index: false },
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
