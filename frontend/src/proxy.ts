import { hasLocale } from 'next-intl'
import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import {
  FRAME_LOCALE_COOKIE,
  LOCALE_COOKIE,
  routing,
  type Locale,
} from '@/i18n/routing'

// The names from lib/auth/session.ts (that module is server-only).
const SESSION_COOKIES = ['rv_rt', 'rv_demo_rt']

const intl = createMiddleware(routing)

/**
 * Keeps an explicit language choice where a frame on another site can read
 * it back (#144): partitioned, SameSite=None, one year like the main cookie.
 */
function rememberInFrame(response: NextResponse, locale: Locale) {
  response.cookies.set(FRAME_LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'none',
    secure: true,
    partitioned: true,
  })
  return response
}

/**
 * Two jobs on every page request:
 * - language (#94): the URL prefix (/en, /ru) or the remembered cookie picks
 *   the locale; Azerbaijani stays at the plain URL. An explicit /az prefix or
 *   ?lang=az|en|ru (#144, links from the portfolio) always wins over the
 *   browser language, also inside a frame where the usual cookie is blocked;
 * - optimistic route guard (#27): pages that need a session redirect to the
 *   login page when there is no refresh cookie (of a real or the demo
 *   account). The API still checks every
 *   request; this only spares a round trip.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl

  // ?lang=xx: go to the same page under that language's prefix; next-intl
  // then keeps the choice (and drops the /az prefix of the default language).
  const lang = searchParams.get('lang')
  if (hasLocale(routing.locales, lang)) {
    const url = request.nextUrl.clone()
    url.searchParams.delete('lang')
    url.pathname = `/${lang}${pathname.replace(/^\/(az|en|ru)(?=\/|$)/, '')}`
    return rememberInFrame(NextResponse.redirect(url), lang)
  }

  const prefix = pathname.match(/^\/(en|ru)(?=\/|$)/)?.[0] ?? ''
  const path = pathname.slice(prefix.length) || '/'
  if (
    /^\/(account|panel)(\/|$)/.test(path) &&
    !SESSION_COOKIES.some((name) => request.cookies.has(name))
  ) {
    const login = new URL(`${prefix}/login`, request.url)
    login.searchParams.set('next', path + search)
    return NextResponse.redirect(login)
  }

  const explicit = pathname.match(/^\/(az|en|ru)(?=\/|$)/)?.[1]
  if (hasLocale(routing.locales, explicit)) {
    return rememberInFrame(intl(request), explicit)
  }

  // A plain URL in a frame: no main cookie, so use the frame's choice
  // instead of the browser language.
  const framed = request.cookies.get(FRAME_LOCALE_COOKIE)?.value
  if (
    !request.cookies.has(LOCALE_COOKIE) &&
    hasLocale(routing.locales, framed)
  ) {
    const headers = new Headers(request.headers)
    const cookie = headers.get('cookie')
    headers.set(
      'cookie',
      `${cookie ? `${cookie}; ` : ''}${LOCALE_COOKIE}=${framed}`,
    )
    return intl(new NextRequest(request, { headers }))
  }
  return intl(request)
}

export const config = {
  // Pages only: not the API, Next internals or files (sw.js, manifest, icons).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
