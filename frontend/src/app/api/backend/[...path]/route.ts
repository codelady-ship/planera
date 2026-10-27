import { gatewayText } from '@/lib/api/gateway-messages'
import { fetchAsUser } from '@/lib/auth/session'
import { requestLocale } from '@/lib/i18n/request-locale'

/**
 * Same-origin gateway to the API for Client Components:
 * `/api/backend/me/appointments` -> `{API_URL}/api/me/appointments`, with
 * the user's access token attached from the httpOnly cookie.
 */
async function forward(
  request: Request,
  ctx: RouteContext<'/api/backend/[...path]'>,
): Promise<Response> {
  const { path } = await ctx.params
  if (path.some((segment) => segment === '.' || segment === '..')) {
    return Response.json(
      { status: 400, detail: gatewayText(await requestLocale(), 'badPath') },
      { status: 400 },
    )
  }
  const { search } = new URL(request.url)
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const response = await fetchAsUser(
    `/api/${path.map(encodeURIComponent).join('/')}${search}`,
    {
      method: request.method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? await request.text() : undefined,
    },
  )
  const headers = new Headers()
  for (const name of ['Content-Type', 'Retry-After']) {
    const value = response.headers.get(name)
    if (value) headers.set(name, value)
  }
  return new Response(response.status === 204 ? null : response.body, {
    status: response.status,
    headers,
  })
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
}
