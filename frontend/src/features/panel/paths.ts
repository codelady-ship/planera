import type { UserRole } from '@/lib/api/types'

/**
 * API paths behind the panel: an admin works on every provider through
 * `/admin`, a provider only on its own data through `/provider`.
 */
export function panelPaths(role: UserRole) {
  const base = role === 'ADMIN' ? '/admin' : '/provider'
  return {
    stats: `${base}/stats`,
    appointments: (from: string, to: string) =>
      `${base}/appointments?from=${from}&to=${to}`,
    status: (id: number) => `${base}/appointments/${id}/status`,
  }
}
