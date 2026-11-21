import { cookies } from 'next/headers'
import { endSession } from '@/lib/auth/session'

/**
 * Revokes every refresh token the browser holds (a real account's and the
 * demo account's) in the API and clears both kinds of session cookies.
 */
export async function POST() {
  await endSession(await cookies())
  return new Response(null, { status: 204 })
}
