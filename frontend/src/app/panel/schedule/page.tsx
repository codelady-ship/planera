import type { Metadata } from 'next'
import { ProviderOnly } from '@/features/panel/panel-shell'
import { ScheduleEditor } from '@/features/panel/schedule-editor'

export const metadata: Metadata = { title: 'İş qrafiki' }

export default function PanelSchedulePage() {
  return (
    <ProviderOnly>
      <ScheduleEditor />
    </ProviderOnly>
  )
}
