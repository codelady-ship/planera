import type { Locale } from '@/i18n/routing'

/**
 * The few texts the Next.js gateway writes itself (#94): when the API is
 * not configured, a bad path, and the fallback of an answer without
 * `detail`. Everything else comes from the API in the request language.
 */
const TEXTS: Record<
  Locale,
  { unavailable: string; badPath: string; error: string }
> = {
  az: {
    unavailable: 'Server hələ qoşulmayıb. Bir az sonra yoxlayın.',
    badPath: 'Yanlış ünvan',
    error: 'Xəta baş verdi ({status})',
  },
  en: {
    unavailable: 'The server is not connected yet. Try again in a moment.',
    badPath: 'Invalid address',
    error: 'Something went wrong ({status})',
  },
  ru: {
    unavailable: 'Сервер ещё не подключён. Попробуйте чуть позже.',
    badPath: 'Неверный адрес',
    error: 'Произошла ошибка ({status})',
  },
}

export function gatewayText(
  locale: Locale,
  key: keyof (typeof TEXTS)['az'],
  status?: number,
): string {
  return TEXTS[locale][key].replace('{status}', String(status ?? ''))
}
