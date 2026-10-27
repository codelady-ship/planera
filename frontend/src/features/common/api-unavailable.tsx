import { useTranslations } from 'next-intl'
import { ServerCrash } from 'lucide-react'

/** Shown while the API is not deployed or not reachable. */
export function ApiUnavailable() {
  const t = useTranslations('api')
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
      <ServerCrash className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{t('title')}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{t('text')}</p>
    </div>
  )
}
