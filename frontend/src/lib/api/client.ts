import { currentLocale } from '@/i18n/current'
import { gatewayText } from './gateway-messages'
import type { Problem } from './types'

/** A non-2xx API answer, carrying its problem details. */
export class ApiError extends Error {
  constructor(public readonly problem: Problem) {
    super(
      problem.detail ?? gatewayText(currentLocale(), 'error', problem.status),
    )
  }
}

/**
 * Browser-side API call through this app's gateway (`/api/backend/...`),
 * which attaches the session token. `path` starts after `/api`, e.g.
 * `/me/appointments`.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers: init.body
      ? { 'Content-Type': 'application/json', ...init.headers }
      : init.headers,
  })
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as Problem
    throw new ApiError({ ...problem, status: response.status })
  }
  return (response.status === 204 ? undefined : await response.json()) as T
}

/** Only same-site paths are allowed after login, never another origin. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  return next
}
