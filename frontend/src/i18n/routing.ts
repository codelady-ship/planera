import { defineRouting } from 'next-intl/routing'

/**
 * Interface languages (#94). Azerbaijani stays the default at the plain
 * URL (/search); English and Russian get a prefix (/en/search, /ru/search).
 * The last choice is remembered in a cookie by the middleware.
 */
/** The middleware remembers the last language here; the API gateway reads it (#94). */
export const LOCALE_COOKIE = 'rv_locale'

export const routing = defineRouting({
  locales: ['az', 'en', 'ru'],
  defaultLocale: 'az',
  localePrefix: 'as-needed',
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365 },
})

export type Locale = (typeof routing.locales)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  az: 'Azərbaycan',
  en: 'English',
  ru: 'Русский',
}
