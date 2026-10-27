import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { AppointmentsBoard } from '@/features/panel/appointments-board'

export const metadata: Metadata = { title: 'Randevular' }

export default async function PanelAppointmentsPage({
  params,
}: PageProps<'/[locale]/panel/appointments'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AppointmentsBoard />
}
