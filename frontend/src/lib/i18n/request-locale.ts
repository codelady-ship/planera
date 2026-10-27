import 'server-only'
import { cookies } from 'next/headers'
import { hasLocale } from 'next-intl'
import { LOCALE_COOKIE, routing, type Locale } from '@/i18n/routing'

/**
 * The visitor's interface language on the server side of the gateway
 * (#94): the cookie the next-intl middleware keeps, Azerbaijani when it
 * is missing. Sent to the API as Accept-Language so error texts match.
 */
export async function requestLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale
}
