import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AppointmentsBoard } from '@/features/panel/appointments-board'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/panel/appointments'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'panel' })
  return { title: t('appointments') }
}

export default async function PanelAppointmentsPage({
  params,
}: PageProps<'/[locale]/panel/appointments'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AppointmentsBoard />
}
