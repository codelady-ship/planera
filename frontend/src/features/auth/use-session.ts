'use client'

import { useEffect, useSyncExternalStore } from 'react'
import type { SessionUser } from '@/lib/api/types'

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'ready'; user: SessionUser | null }

const LOADING: SessionState = { status: 'loading', user: null }

let state: SessionState = LOADING
let pending: Promise<void> | null = null
const listeners = new Set<() => void>()

function set(next: SessionState) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Loads the session once per page load; later callers share the request. */
export function loadSession(force = false): Promise<void> {
  if (pending && !force) return pending
  pending = fetch('/api/auth/session')
    .then((r) => (r.ok ? r.json() : { user: null }))
    .then((body: { user: SessionUser | null }) =>
      set({ status: 'ready', user: body.user }),
    )
    .catch(() => set({ status: 'ready', user: null }))
  return pending
}

export function setSessionUser(user: SessionUser | null) {
  pending = Promise.resolve()
  set({ status: 'ready', user })
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  setSessionUser(null)
}

/** The signed-in user shared by every component (header, booking, account). */
export function useSession(): SessionState {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  )
  useEffect(() => {
    void loadSession()
  }, [])
  return snapshot
}
