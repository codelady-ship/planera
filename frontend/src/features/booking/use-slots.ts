'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import type { AvailableDatesView, SlotsView } from '@/lib/api/types'

/** Days of `month` with free slots; null while loading. */
export function useAvailableDates(
  slug: string,
  serviceId: number | null,
  month: string,
): string[] | null {
  const [result, setResult] = useState<{ key: string; dates: string[] }>()
  const key = `${slug}:${serviceId}:${month}`
  useEffect(() => {
    if (serviceId === null) return
    let cancelled = false
    api<AvailableDatesView>(
      `/providers/${slug}/available-dates?serviceId=${serviceId}&month=${month}`,
    )
      .then((view) => !cancelled && setResult({ key, dates: view.dates }))
      .catch(() => !cancelled && setResult({ key, dates: [] }))
    return () => {
      cancelled = true
    }
  }, [slug, serviceId, month, key])
  return result?.key === key ? result.dates : null
}

/** Free start times of `date`; null while loading. `version` forces a reload. */
export function useSlots(
  slug: string,
  serviceId: number | null,
  date: string | null,
  version = 0,
): string[] | null {
  const [result, setResult] = useState<{ key: string; slots: string[] }>()
  const key = `${slug}:${serviceId}:${date}:${version}`
  useEffect(() => {
    if (serviceId === null || date === null) return
    let cancelled = false
    api<SlotsView>(
      `/providers/${slug}/slots?serviceId=${serviceId}&date=${date}`,
    )
      .then((view) => !cancelled && setResult({ key, slots: view.slots }))
      .catch(() => !cancelled && setResult({ key, slots: [] }))
    return () => {
      cancelled = true
    }
  }, [slug, serviceId, date, key])
  return result?.key === key ? result.slots : null
}
