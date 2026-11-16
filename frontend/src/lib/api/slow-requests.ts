/**
 * Counts browser API calls that have been waiting longer than
 * {@link SLOW_REQUEST_MS}. The free API host sleeps when idle and the first
 * request can take up to a minute, so the UI shows a "waking the server"
 * notice instead of looking frozen.
 */
export const SLOW_REQUEST_MS = 3_000

let slow = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Resolves like `request`; while it is slower than the threshold it counts as slow. */
export async function trackSlow<T>(request: Promise<T>): Promise<T> {
  let counted = false
  const timer = setTimeout(() => {
    counted = true
    slow += 1
    emit()
  }, SLOW_REQUEST_MS)
  try {
    return await request
  } finally {
    clearTimeout(timer)
    if (counted) {
      slow -= 1
      emit()
    }
  }
}

export function subscribeSlow(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function slowCount(): number {
  return slow
}
