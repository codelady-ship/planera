import 'server-only'

/**
 * Server-side access to the Planera API. `API_URL` (e.g. the Render URL)
 * is only read on the server: the browser talks to this Next.js app, which
 * forwards to the API (see app/api/backend).
 */
export function apiUrl(path: string): string | null {
  const base = process.env.API_URL
  if (!base) return null
  return `${base.replace(/\/$/, '')}${path}`
}

export class ApiUnavailableError extends Error {
  constructor() {
    super('API_URL is not configured or the API is unreachable')
  }
}

const PUBLIC_TIMEOUT_MS = 10_000

/** Fetches a public JSON endpoint; null on 404. */
export async function getPublic<T>(path: string): Promise<T | null> {
  const url = apiUrl(path)
  if (!url) throw new ApiUnavailableError()
  let response: Response
  try {
    // A sleeping free-tier API must not stall a build: after the timeout the
    // page renders its 'unavailable' state and retries within seconds.
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(PUBLIC_TIMEOUT_MS),
    })
  } catch {
    throw new ApiUnavailableError()
  }
  if (response.status === 404) return null
  if (!response.ok) throw new ApiUnavailableError()
  return (await response.json()) as T
}
