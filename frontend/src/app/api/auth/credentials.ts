import 'server-only'
import { cookies } from 'next/headers'
import { apiUrl } from '@/lib/api/server'
import type { TokenResponse } from '@/lib/api/types'
import { storeTokens } from '@/lib/auth/session'

/**
 * Forwards a login or registration to the API. On success the tokens go
 * into httpOnly cookies and only the user is returned to the browser.
 */
export async function exchange(
  path: '/api/auth/login' | '/api/auth/register',
  request: Request,
): Promise<Response> {
  const url = apiUrl(path)
  if (!url) {
    return Response.json(
      { status: 503, detail: 'Server hələ qoşulmayıb. Bir az sonra yoxlayın.' },
      { status: 503 },
    )
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    return Response.json(body, { status: response.status })
  }
  const tokens = body as TokenResponse
  storeTokens(await cookies(), tokens)
  return Response.json({ user: tokens.user }, { status: response.status })
}
