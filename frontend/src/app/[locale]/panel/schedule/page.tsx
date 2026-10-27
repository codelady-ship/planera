import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ProviderOnly } from '@/features/panel/panel-shell'
import { ScheduleEditor } from '@/features/panel/schedule-editor'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/panel/schedule'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'schedule' })
  return { title: t('title') }
}

export default async function PanelSchedulePage({
  params,
}: PageProps<'/[locale]/panel/schedule'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <ProviderOnly>
      <ScheduleEditor />
    </ProviderOnly>
  )
}
