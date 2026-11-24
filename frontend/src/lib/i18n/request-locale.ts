import 'server-only'
import { cookies } from 'next/headers'
import { hasLocale } from 'next-intl'
import {
  FRAME_LOCALE_COOKIE,
  LOCALE_COOKIE,
  routing,
  type Locale,
} from '@/i18n/routing'

/**
 * The visitor's interface language on the server side of the gateway
 * (#94): the cookie the next-intl middleware keeps (in a frame on another
 * site its partitioned copy, #144), Azerbaijani when it is missing. Sent to
 * the API as Accept-Language so error texts match.
 */
export async function requestLocale(): Promise<Locale> {
  const jar = await cookies()
  const value =
    jar.get(LOCALE_COOKIE)?.value ?? jar.get(FRAME_LOCALE_COOKIE)?.value
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale
}
