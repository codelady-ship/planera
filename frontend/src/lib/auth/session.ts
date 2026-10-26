import 'server-only'
import { cookies, headers } from 'next/headers'
import { apiUrl } from '@/lib/api/server'
import type { TokenResponse } from '@/lib/api/types'

/**
 * Session cookies on the site's own domain (#25, #27). Both tokens are
 * httpOnly, so page scripts can never read them; the refresh token is sent
 * to the API only to rotate or revoke it.
 */
export const ACCESS_COOKIE = 'rv_at'
export const REFRESH_COOKIE = 'rv_rt'

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

export function storeTokens(store: CookieStore, tokens: TokenResponse) {
  // Expire the access cookie a little early so a request never carries a
  // token that dies on the way.
  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...base(),
    maxAge: Math.max(tokens.expiresIn - 30, 30),
  })
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(),
    maxAge: REFRESH_MAX_AGE,
  })
}

export function clearTokens(store: CookieStore) {
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
  if (!url) {
    return Response.json(
      { status: 503, detail: 'Server hələ qoşulmayıb. Bir az sonra yoxlayın.' },
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
