import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const intl = createMiddleware(routing)

/**
 * Two jobs on every page request:
 * - language (#94): the URL prefix (/en, /ru) or the remembered cookie picks
 *   the locale; Azerbaijani stays at the plain URL;
 * - optimistic route guard (#27): pages that need a session redirect to the
 *   login page when there is no refresh cookie. The API still checks every
 *   request; this only spares a round trip.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const prefix = pathname.match(/^\/(en|ru)(?=\/|$)/)?.[0] ?? ''
  const path = pathname.slice(prefix.length) || '/'
  if (/^\/(account|panel)(\/|$)/.test(path) && !request.cookies.has('rv_rt')) {
    const login = new URL(`${prefix}/login`, request.url)
    login.searchParams.set('next', path + search)
    return NextResponse.redirect(login)
  }
  return intl(request)
}

export const config = {
  // Pages only: not the API, Next internals or files (sw.js, manifest, icons).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
