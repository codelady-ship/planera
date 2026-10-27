import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { ProviderOnly } from '@/features/panel/panel-shell'
import { ScheduleEditor } from '@/features/panel/schedule-editor'

export const metadata: Metadata = { title: 'İş qrafiki' }

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
