import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { RetryButton } from '@/features/pwa/retry-button'

export const metadata: Metadata = {
  title: 'İnternet yoxdur',
  robots: { index: false },
}

// Served by the service worker when a page cannot be fetched (#54).
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
        <WifiOff className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">İnternet bağlantısı yoxdur</h1>
        <p className="text-sm text-muted-foreground">
          Randevular və boş saatlar yalnız internet olanda görünür. Bağlantı
          qayıdanda yenidən yoxlayın.
        </p>
        <RetryButton />
      </div>
    </main>
  )
}
