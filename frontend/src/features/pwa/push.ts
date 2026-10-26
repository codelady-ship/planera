import { api } from '@/lib/api/client'
import type { PushDelivery, PushSubscriptionView } from '@/lib/api/types'

// Web Push on the client (#55): the browser subscribes with the server's
// VAPID key and the subscription is stored per device through the API.
// Permission is requested only from enablePush(), never on page load.

export type PushStatus = 'unsupported' | 'denied' | 'off' | 'on'

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iPhone and iPad only deliver push to a web app added to the home screen. */
export function needsHomeScreen() {
  const ua = navigator.userAgent
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  return ios && !window.matchMedia('(display-mode: standalone)').matches
}

/** The applicationServerKey as the Push API wants it. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** A short device name for the device list: platform and browser. */
export function deviceLabel(ua = navigator.userAgent) {
  const platform = /iPhone|iPad|iPod/.test(ua)
    ? 'iPhone'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh/.test(ua)
          ? 'Mac'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Cihaz'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'brauzer'
  return `${platform} ${browser}`
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration('/')
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const existing = await navigator.serviceWorker.getRegistration('/')
  const subscription = await existing?.pushManager.getSubscription()
  return subscription ? 'on' : 'off'
}

/** Asks for permission, subscribes this browser and stores it on the server. */
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const { publicKey } = await api<{ publicKey: string }>('/push/public-key')
  const reg = await registration()
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))
  const json = subscription.toJSON()
  await api<PushSubscriptionView>('/me/push-subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      device: deviceLabel(),
    }),
  })
  return 'on'
}

/** Removes this browser's subscription on the server and in the browser. */
export async function disablePush(): Promise<PushStatus> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const subscription = await reg?.pushManager.getSubscription()
  if (!subscription) return 'off'
  await api<void>(
    `/me/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`,
    { method: 'DELETE' },
  )
  await subscription.unsubscribe()
  return 'off'
}

/** Sends a test notification to every device of the user; returns how many took it. */
export async function sendTestPush(): Promise<number> {
  const { delivered } = await api<PushDelivery>('/me/push-subscriptions/test', {
    method: 'POST',
  })
  return delivered
}
