'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { speak } from './speech'

/**
 * Reads the alarm aloud when a notification was tapped (#62): the service
 * worker opens the account page with ?say=<sentence>; the sentence is spoken
 * once and dropped from the URL.
 */
export function AlarmReader() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const say = params.get('say')

  useEffect(() => {
    if (!say) return
    speak(say)
    const rest = new URLSearchParams(params)
    rest.delete('say')
    router.replace(rest.size > 0 ? `${pathname}?${rest}` : pathname)
  }, [say, params, pathname, router])

  return null
}
