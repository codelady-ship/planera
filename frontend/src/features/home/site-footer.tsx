'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function SiteFooter() {
  const t = useTranslations('footer')
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <Image
          src="/brand/planera-logo.png"
          alt={t('logoAlt')}
          width={1408}
          height={382}
          className="h-12 w-auto dark:hidden"
        />
        <Image
          src="/brand/planera-logo-dark.png"
          alt={t('logoAlt')}
          width={1408}
          height={382}
          className="hidden h-12 w-auto dark:block"
        />
        <nav className="flex flex-wrap gap-x-4">
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            {t('services')}
          </Link>
          <Link
            href="/register?role=provider"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            {t('join')}
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            {t('privacy')}
          </Link>
          <a
            href="https://github.com/codelady-ship/planera"
            className="inline-flex min-h-11 min-w-11 items-center hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
        <p>{t('note')}</p>
      </div>
    </footer>
  )
}
