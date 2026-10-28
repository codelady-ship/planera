'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useSession } from '@/features/auth/use-session'
import { api } from '@/lib/api/client'
import type { ProviderSummary } from '@/lib/api/types'

/**
 * The signed-in user's favourite providers (#46), shared by every heart
 * button and the account tab. Loaded once per page load after the session
 * is known; toggles update the set at once and talk to the API behind it.
 */
type State = { slugs: ReadonlySet<string>; loaded: boolean }

let state: State = { slugs: new Set(), loaded: false }
let pending: Promise<void> | null = null
let loadedFor: number | null = null
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function load(userId: number): Promise<void> {
  if (pending && loadedFor === userId) return pending
  loadedFor = userId
  pending = api<ProviderSummary[]>('/me/favorites')
    .then((list) =>
      set({ slugs: new Set(list.map((p) => p.slug)), loaded: true }),
    )
    .catch(() => set({ slugs: new Set(), loaded: true }))
  return pending
}

/** Forgets the favourites, e.g. after sign-out or in tests. */
export function resetFavorites() {
  pending = null
  loadedFor = null
  set({ slugs: new Set(), loaded: false })
}

export async function toggleFavorite(slug: string) {
  const adding = !state.slugs.has(slug)
  const next = new Set(state.slugs)
  if (adding) next.add(slug)
  else next.delete(slug)
  set({ ...state, slugs: next })
  try {
    await api(`/me/favorites/${encodeURIComponent(slug)}`, {
      method: adding ? 'PUT' : 'DELETE',
    })
  } catch {
    // The API refused: put the heart back the way it was.
    const back = new Set(state.slugs)
    if (adding) back.delete(slug)
    else back.add(slug)
    set({ ...state, slugs: back })
  }
  return adding
}

export function useFavorites() {
  const { user } = useSession()
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
  useEffect(() => {
    if (user) void load(user.id)
    else if (loadedFor !== null) resetFavorites()
  }, [user])
  return {
    isFavorite: (slug: string) => snapshot.slugs.has(slug),
    loaded: snapshot.loaded,
    signedIn: user !== null,
  }
}
