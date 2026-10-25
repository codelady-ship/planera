import { cookies } from 'next/headers'
import { REFRESH_COOKIE, fetchAsUser } from '@/lib/auth/session'

/** The signed-in user, or `{ user: null }`; refreshes the access token when needed. */
export async function GET() {
  if (!(await cookies()).has(REFRESH_COOKIE)) {
    return Response.json({ user: null })
  }
  const response = await fetchAsUser('/api/me')
  if (!response.ok) return Response.json({ user: null })
  return Response.json({ user: await response.json() })
}
