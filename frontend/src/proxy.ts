import { NextResponse, type NextRequest } from 'next/server'

/**
 * Optimistic route guard (#27): pages that need a session redirect to the
 * login page when there is no refresh cookie. The API still checks every
 * request; this only spares a round trip.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has('rv_rt')) return NextResponse.next()
  const login = new URL('/login', request.url)
  login.searchParams.set(
    'next',
    request.nextUrl.pathname + request.nextUrl.search,
  )
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/account/:path*'],
}
