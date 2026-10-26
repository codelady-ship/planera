'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RetryButton() {
  return (
    <Button className="mt-2" onClick={() => window.location.reload()}>
      <RefreshCw data-icon="inline-start" aria-hidden />
      Yenidən yoxla
    </Button>
  )
}
