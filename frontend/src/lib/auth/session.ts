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
 *
 * There are two kinds of session and each has its own cookie names, so one
 * can never be mistaken for, or hidden behind, the other:
 * - a real account: `rv_at` / `rv_rt`, SameSite=Lax;
 * - the public read-only demo account: `rv_demo_at` / `rv_demo_rt`,
 *   SameSite=None; Secure; Partitioned.
 * A browser holds at most one of them: signing in as one kind revokes and
 * removes the other, and signing out revokes and removes both.
 */
export const ACCESS_COOKIE = 'rv_at'
export const REFRESH_COOKIE = 'rv_rt'
export const DEMO_ACCESS_COOKIE = 'rv_demo_at'
export const DEMO_REFRESH_COOKIE = 'rv_demo_rt'
/** A page needs one of these to be worth rendering as signed in (proxy.ts). */
export const SESSION_COOKIES = [REFRESH_COOKIE, DEMO_REFRESH_COOKIE] as const

const REFRESH_MAX_AGE = 14 * 24 * 60 * 60

type CookieStore = Awaited<ReturnType<typeof cookies>>

type Kind = {
  demo: boolean
  access: string
  refresh: string
  options: () => {
    httpOnly: true
    secure: boolean
    sameSite: 'lax' | 'none'
    partitioned?: true
    path: '/'
  }
}

const REAL: Kind = {
  demo: false,
  access: ACCESS_COOKIE,
  refresh: REFRESH_COOKIE,
  options: () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }),
}

/**
 * The public demo admin is shown inside the portfolio's iframe, a
 * cross-site context where SameSite=Lax cookies are never sent. Only its
 * cookies are SameSite=None (Secure, Partitioned per top-level site, so they
 * also work where third-party cookies are blocked). The API refuses every
 * write from a demo token, so a cross-site request can change nothing; real
 * accounts keep SameSite=Lax and never get these cookies.
 */
const DEMO: Kind = {
  demo: true,
  access: DEMO_ACCESS_COOKIE,
  refresh: DEMO_REFRESH_COOKIE,
  options: () => ({
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
  }),
}

/** A real session is looked at first; the demo one only when there is none. */
const KINDS = [REAL, DEMO] as const

function value(store: CookieStore, name: string): string | undefined {
  // An expired cookie written earlier in this request reads as ''.
  return store.get(name)?.value || undefined
}

/** True when the browser sent a session of either kind. */
export function hasSession(store: Pick<CookieStore, 'get'>): boolean {
  return SESSION_COOKIES.some((name) => Boolean(store.get(name)?.value))
}

/** Removes one kind's cookies; a cookie is only removed by one with the same attributes. */
function expire(store: CookieStore, kind: Kind) {
  for (const name of [kind.access, kind.refresh]) {
    store.set(name, '', { ...kind.options(), maxAge: 0 })
  }
}

/** Revokes a refresh token in the API; a failure must not keep the cookies alive. */
async function revoke(refreshToken: string | undefined) {
  const url = apiUrl('/api/auth/logout')
  if (!refreshToken || !url) return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined)
}

/**
 * Stores a new session (login, registration or a rotated refresh token).
 * The kind follows the account the API answered with, so a real account can
 * never receive the relaxed demo cookies. Whatever session of the other kind
 * the browser still holds ends here: its refresh token is revoked and its
 * cookies are removed, so it cannot come back after a logout.
 */
export async function storeTokens(store: CookieStore, tokens: TokenResponse) {
  const kind = tokens.user.demo === true ? DEMO : REAL
  const other = kind === DEMO ? REAL : DEMO
  await revoke(value(store, other.refresh))
  expire(store, other)
  // Expire the access cookie a little early so a request never carries a
  // token that dies on the way.
  store.set(kind.access, tokens.accessToken, {
    ...kind.options(),
    maxAge: Math.max(tokens.expiresIn - 30, 30),
  })
  store.set(kind.refresh, tokens.refreshToken, {
    ...kind.options(),
    maxAge: REFRESH_MAX_AGE,
  })
}

/** Removes every session cookie, of both kinds, whichever the request showed. */
export function clearTokens(store: CookieStore) {
  for (const kind of KINDS) expire(store, kind)
}

/** Logout: revokes every refresh token the browser holds, then removes both kinds of cookies. */
export async function endSession(store: CookieStore) {
  const held = KINDS.map((kind) => value(store, kind.refresh))
  await Promise.all(held.map(revoke))
  clearTokens(store)
}

/** Rotates one kind's refresh token; removes that kind's cookies when it is no longer valid. */
async function refresh(store: CookieStore, kind: Kind): Promise<string | null> {
  const refreshToken = value(store, kind.refresh)
  const url = apiUrl('/api/auth/refresh')
  if (!refreshToken || !url) return null
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!response.ok) {
    if (response.status === 401) expire(store, kind)
    return null
  }
  const tokens = (await response.json()) as TokenResponse
  await storeTokens(store, tokens)
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

  // One session answers the request: the real one when the browser has it,
  // otherwise the demo one. A kind whose tokens are dead is skipped.
  let rejected: Response | null = null
  for (const kind of KINDS) {
    let token = value(store, kind.access)
    if (!token && !value(store, kind.refresh)) continue
    token ??= (await refresh(store, kind)) ?? undefined
    if (!token) continue
    const response = await send(token)
    if (response.status !== 401) return response
    rejected = response
    if (!value(store, kind.refresh)) continue
    const renewed = await refresh(store, kind)
    if (renewed) return send(renewed)
  }
  return rejected ?? send(null)
}
