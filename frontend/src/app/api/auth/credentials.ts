import 'server-only'
import { cookies } from 'next/headers'
import { gatewayText } from '@/lib/api/gateway-messages'
import { apiUrl } from '@/lib/api/server'
import type { TokenResponse } from '@/lib/api/types'
import { storeTokens } from '@/lib/auth/session'
import { requestLocale } from '@/lib/i18n/request-locale'

/**
 * Forwards a login or registration to the API. On success the tokens go
 * into httpOnly cookies and only the user is returned to the browser.
 */
export async function exchange(
  path: '/api/auth/login' | '/api/auth/register',
  request: Request,
): Promise<Response> {
  const locale = await requestLocale()
  const url = apiUrl(path)
  if (!url) {
    return Response.json(
      { status: 503, detail: gatewayText(locale, 'unavailable') },
      { status: 503 },
    )
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': locale },
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
