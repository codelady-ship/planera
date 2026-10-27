import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProviderOnly } from '@/features/panel/panel-shell'
import { ServicesManager } from '@/features/panel/services-manager'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/panel/services'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'services' })
  return { title: t('title') }
}

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
