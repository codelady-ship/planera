import { StatsOverview } from '@/features/panel/stats-overview'
import { setRequestLocale } from 'next-intl/server'

export default async function PanelPage({
  params,
}: PageProps<'/[locale]/panel'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return <StatsOverview />
}
