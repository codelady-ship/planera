import { cookies } from 'next/headers'
import { apiUrl } from '@/lib/api/server'
import { REFRESH_COOKIE, clearTokens } from '@/lib/auth/session'

/** Revokes the refresh token in the API and clears both cookies. */
export async function POST() {
  const store = await cookies()
  const refreshToken = store.get(REFRESH_COOKIE)?.value
  const url = apiUrl('/api/auth/logout')
  if (refreshToken && url) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined)
  }
  clearTokens(store)
  return new Response(null, { status: 204 })
}
