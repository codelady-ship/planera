import { cookies } from 'next/headers'
import { fetchAsUser, hasSession } from '@/lib/auth/session'

/** The signed-in user, or `{ user: null }`; refreshes the access token when needed. */
export async function GET() {
  if (!hasSession(await cookies())) {
    return Response.json({ user: null })
  }
  const response = await fetchAsUser('/api/me')
  if (!response.ok) return Response.json({ user: null })
  return Response.json({ user: await response.json() })
}
