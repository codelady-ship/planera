'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api/client'

interface ApiState<T> {
  /** undefined while the current path loads. */
  data: T | undefined
  error: string | null
  reload: () => void
  /** Replaces the data locally, e.g. right after a successful change. */
  mutate: (update: (data: T) => T) => void
}

/** Reads `path` through the gateway; a null path waits. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<{
    key: string
    data?: T
    error: string | null
  }>()
  const key = `${path}#${version}`

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    api<T>(path)
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch(
        (e: Error) =>
          !cancelled && setResult({ key, data: undefined, error: e.message }),
      )
    return () => {
      cancelled = true
    }
  }, [path, key])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const mutate = useCallback(
    (update: (data: T) => T) =>
      setResult((r) =>
        r?.data === undefined ? r : { ...r, data: update(r.data) },
      ),
    [],
  )

  const current = result?.key === key ? result : undefined
  return {
    data: current?.data,
    error: current?.error ?? null,
    reload,
    mutate,
  }
}
