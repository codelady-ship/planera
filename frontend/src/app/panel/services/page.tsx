import type { Metadata } from 'next'
import { ProviderOnly } from '@/features/panel/panel-shell'
import { ServicesManager } from '@/features/panel/services-manager'

export const metadata: Metadata = { title: 'Xidmətlər' }

export default function PanelServicesPage() {
  return (
    <ProviderOnly>
      <ServicesManager />
    </ProviderOnly>
  )
}
