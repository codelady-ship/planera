import 'server-only'
import { cookies, headers } from 'next/headers'
import { gatewayText } from '@/lib/api/gateway-messages'
import { apiUrl } from '@/lib/api/server'
import type { TokenResponse } from '@/lib/api/types'
import { requestLocale } from '@/lib/i18n/request-locale'

/**
 * Session cookies on the site's own domain (#25, #27). Both tokens are
 * httpOnly, so page scripts can never read them; the refresh token is sent
 * to the API only to rotate or revoke it.
 */
export const ACCESS_COOKIE = 'rv_at'
export const REFRESH_COOKIE = 'rv_rt'
/** Marks a session of the public read-only demo account (portfolio admin demo). */
export const DEMO_COOKIE = 'rv_demo'

const REFRESH_MAX_AGE = 14 * 24 * 60 * 60

type CookieStore = Awaited<ReturnType<typeof cookies>>

function base() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
}

/**
 * The public demo admin is shown inside the portfolio's iframe, a
 * cross-site context where SameSite=Lax cookies are never sent. Only its
 * cookies are SameSite=None (Secure, Partitioned per top-level site, so they
 * also work where third-party cookies are blocked). The API refuses every
 * write from a demo token, so a cross-site request can change nothing; real
 * accounts keep SameSite=Lax.
 */
function demoBase() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    partitioned: true,
    path: '/',
  }
}

export function storeTokens(store: CookieStore, tokens: TokenResponse) {
  const demo = tokens.user.demo === true
  const options = demo ? demoBase() : base()
  // Expire the access cookie a little early so a request never carries a
  // token that dies on the way.
  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...options,
    maxAge: Math.max(tokens.expiresIn - 30, 30),
  })
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...options,
    maxAge: REFRESH_MAX_AGE,
  })
  if (demo) {
    store.set(DEMO_COOKIE, '1', { ...options, maxAge: REFRESH_MAX_AGE })
  } else if (store.has(DEMO_COOKIE)) {
    store.set(DEMO_COOKIE, '', { ...demoBase(), maxAge: 0 })
  }
}

export function clearTokens(store: CookieStore) {
  if (store.has(DEMO_COOKIE)) {
    // A partitioned cookie is only removed by one with the same attributes.
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, DEMO_COOKIE]) {
      store.set(name, '', { ...demoBase(), maxAge: 0 })
    }
    return
  }
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

/** Rotates the refresh token; clears the session when it is no longer valid. */
async function refresh(store: CookieStore): Promise<string | null> {
  const refreshToken = store.get(REFRESH_COOKIE)?.value
  const url = apiUrl('/api/auth/refresh')
  if (!refreshToken || !url) return null
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!response.ok) {
    if (response.status === 401) clearTokens(store)
    return null
  }
  const tokens = (await response.json()) as TokenResponse
  storeTokens(store, tokens)
  return tokens.accessToken
}

/**
 * Calls the API as the signed-in user. A missing or rejected access token
 * is refreshed once. Writes cookies, so it must run in a Route Handler or
 * Server Function.
 */
export async function fetchAsUser(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = apiUrl(path)
  // Error texts come back in the interface language (#94).
  const locale = await requestLocale()
  if (!url) {
    return Response.json(
      { status: 503, detail: gatewayText(locale, 'unavailable') },
      { status: 503 },
    )
  }
  const store = await cookies()
  // The API limits anonymous calls per address (#81); pass the browser's on.
  const incoming = await headers()
  const clientIp =
    incoming.get('x-forwarded-for')?.split(',')[0].trim() ??
    incoming.get('x-real-ip')
  const send = (token: string | null | undefined) => {
    const outgoing = new Headers(init.headers)
    outgoing.set('Accept', 'application/json')
    outgoing.set('Accept-Language', locale)
    if (token) outgoing.set('Authorization', `Bearer ${token}`)
    if (clientIp) outgoing.set('X-Forwarded-For', clientIp)
    return fetch(url, { ...init, headers: outgoing, cache: 'no-store' })
  }

  let token = store.get(ACCESS_COOKIE)?.value ?? (await refresh(store))
  let response = await send(token)
  if (response.status === 401 && store.get(REFRESH_COOKIE)) {
    token = await refresh(store)
    if (token) response = await send(token)
  }
  return response
}
