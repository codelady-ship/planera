import type { Metadata } from 'next'
import { AppointmentsBoard } from '@/features/panel/appointments-board'

export const metadata: Metadata = { title: 'Randevular' }

export default function PanelAppointmentsPage() {
  return <AppointmentsBoard />
}
