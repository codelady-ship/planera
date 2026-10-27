import { hasLocale } from 'next-intl'
import { routing, type Locale } from './routing'

/**
 * The page language outside React (#94): alarms, speech and native
 * notifications read it from <html lang>, which the layout sets per locale.
 */
export function currentLocale(): Locale {
  if (typeof document === 'undefined') return routing.defaultLocale
  const lang = document.documentElement.lang
  return hasLocale(routing.locales, lang) ? lang : routing.defaultLocale
}
