import { App } from '@capacitor/app'
import { isNativeApp } from './native-alarms'

// Deep links (#66): randevum://reminder/new?text=... from Siri, the
// launcher shortcut or Google Assistant lands in the diary with the note
// wizard open and the text prefilled. Only the text travels; date and time
// are always chosen by hand (#60).

/** The in-app path for a deep link, or null when the link is not ours. */
export function pathForDeepLink(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'randevum:') return null
  const route = `${url.hostname}${url.pathname}`.replace(/\/+$/, '')
  if (route === 'reminder/new' || route === 'reminder') {
    const params = new URLSearchParams({ tab: 'agenda', new: '1' })
    const text = url.searchParams.get('text')?.trim()
    if (text) params.set('text', text.slice(0, 200))
    return `/account?${params}`
  }
  if (route === 'agenda' || route === 'account') return '/account?tab=agenda'
  return null
}

/** Listens for the app being opened with a link; returns a disposer. */
export async function listenForDeepLinks(open: (path: string) => void) {
  if (!isNativeApp()) return () => {}
  const handle = await App.addListener('appUrlOpen', ({ url }) => {
    const path = pathForDeepLink(url)
    if (path) open(path)
  })
  // The link that launched the app is delivered through getLaunchUrl.
  const launch = await App.getLaunchUrl()
  const path = launch?.url ? pathForDeepLink(launch.url) : null
  if (path) open(path)
  return () => void handle.remove()
}
