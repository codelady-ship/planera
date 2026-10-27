import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { ProviderOnly } from '@/features/panel/panel-shell'
import { ServicesManager } from '@/features/panel/services-manager'

export const metadata: Metadata = { title: 'Xidmətlər' }

export default async function PanelServicesPage({
  params,
}: PageProps<'/[locale]/panel/services'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <ProviderOnly>
      <ServicesManager />
    </ProviderOnly>
  )
}
