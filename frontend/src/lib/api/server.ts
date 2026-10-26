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

/** Fetches a public JSON endpoint; null on 404. */
export async function getPublic<T>(path: string): Promise<T | null> {
  const url = apiUrl(path)
  if (!url) throw new ApiUnavailableError()
  let response: Response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiUnavailableError()
  }
  if (response.status === 404) return null
  if (!response.ok) throw new ApiUnavailableError()
  return (await response.json()) as T
}
