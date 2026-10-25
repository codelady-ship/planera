import type { Metadata } from 'next'
import { PanelShell } from '@/features/panel/panel-shell'

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s | Randevum panel' },
  robots: { index: false },
}

/** Providers and admins only: proxy.ts sends visitors to /login first. */
export default function PanelLayout({ children }: LayoutProps<'/panel'>) {
  return <PanelShell>{children}</PanelShell>
}
