'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/i18n/navigation'
import { LOCALE_LABELS, routing, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'

/**
 * Three languages side by side (#94). Switching keeps the current page and
 * query; the middleware remembers the choice in a cookie.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('header')
  const locale = useLocale()
  const router = useRouter()

  function choose(next: Locale) {
    // Read at click time: URL hooks here would make every page dynamic.
    const { pathname, search } = window.location
    const path = pathname.replace(/^\/(en|ru)(?=\/|$)/, '') || '/'
    router.replace(`${path}${search}`, { locale: next })
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('language')}
      className={cn('flex items-center gap-1', className)}
    >
      <Languages className="size-4 text-muted-foreground" aria-hidden />
      {routing.locales.map((code) => (
        <Button
          key={code}
          role="radio"
          aria-checked={locale === code}
          aria-label={LOCALE_LABELS[code]}
          variant="ghost"
          size="sm"
          className={cn(
            'px-2 uppercase',
            locale === code && 'bg-muted font-semibold',
          )}
          onClick={() => choose(code)}
        >
          {code}
        </Button>
      ))}
    </div>
  )
}
