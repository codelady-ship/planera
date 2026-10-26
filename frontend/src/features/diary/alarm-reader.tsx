'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { listenForDeepLinks } from '@/features/mobile/deep-links'
import { listenForAlarmTaps } from '@/features/mobile/native-alarms'
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

  // In the native app a tapped local alarm (#65) or a deep link (#66) arrives here.
  useEffect(() => {
    const disposers: (() => void)[] = []
    void listenForAlarmTaps((url) => router.push(url)).then((off) =>
      disposers.push(off),
    )
    void listenForDeepLinks((path) => router.push(path)).then((off) =>
      disposers.push(off),
    )
    return () => disposers.forEach((off) => off())
  }, [router])

  return null
}
