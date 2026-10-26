'use client'

import { useEffect } from 'react'

// Registers public/sw.js once the page has loaded (#54). Dev builds skip it so
// hot reloading is never served from the cache.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((error) =>
        console.warn('Service worker qeydiyyatı alınmadı', error),
      )
  }, [])
  return null
}
