'use client'

import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RetryButton() {
  const t = useTranslations('offline')
  return (
    <Button className="mt-2" onClick={() => window.location.reload()}>
      <RefreshCw data-icon="inline-start" aria-hidden />
      {t('retry')}
    </Button>
  )
}
