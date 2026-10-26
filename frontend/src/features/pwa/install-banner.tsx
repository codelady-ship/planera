'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { Download, Share, SquarePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// "Add to home screen" banner (#54). Android Chrome fires beforeinstallprompt,
// so there the banner has a real install button. iOS has no such event and
// push only works in an installed PWA, so iPhone users see the Safari steps.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'rv_install_dismissed_until'
const DISMISS_DAYS = 14
const CHANGE_EVENT = 'rv-install-banner-change'

type Platform = 'ios' | 'other' | 'hidden'

function isIos() {
  const ua = navigator.userAgent
  const iPadOs = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  return /iPad|iPhone|iPod/.test(ua) || iPadOs
}

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isDismissed() {
  try {
    const until = Number(window.localStorage.getItem(DISMISSED_KEY))
    return until > Date.now()
  } catch {
    return false
  }
}

function dismiss() {
  try {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    window.localStorage.setItem(DISMISSED_KEY, String(until))
  } catch {
    // Private mode without storage: the banner simply returns next visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function getPlatform(): Platform {
  if (isInstalled() || isDismissed()) return 'hidden'
  return isIos() ? 'ios' : 'other'
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia('(display-mode: standalone)')
  mql.addEventListener('change', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    mql.removeEventListener('change', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function usePlatform() {
  return useSyncExternalStore(subscribe, getPlatform, () => 'hidden')
}

export function InstallBanner() {
  const pathname = usePathname()
  const platform = usePlatform()
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstallEvent(null)
      dismiss()
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (platform === 'hidden') return null
  if (pathname.startsWith('/panel') || pathname === '/offline') return null
  if (platform === 'other' && !installEvent) return null

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    setInstallEvent(null)
    if (outcome === 'accepted') dismiss()
  }

  return (
    <aside
      aria-label="Tətbiqi quraşdır"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border bg-card p-4 text-card-foreground shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Download className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">Randevum-u ana ekrana əlavə et</p>
          {platform === 'ios' ? (
            <p className="text-sm text-muted-foreground">
              Safari-də{' '}
              <Share className="inline size-4 align-text-bottom" aria-hidden />{' '}
              <span className="font-medium text-foreground">Paylaş</span>{' '}
              düyməsinə, sonra{' '}
              <SquarePlus
                className="inline size-4 align-text-bottom"
                aria-hidden
              />{' '}
              <span className="font-medium text-foreground">
                Ana ekrana əlavə et
              </span>{' '}
              seçin. Xatırlatmalar yalnız quraşdırılmış tətbiqdə gəlir.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Randevularınız və xatırlatmalar bir toxunuşla, tətbiq kimi.
            </p>
          )}
          {platform === 'other' && (
            <Button className="mt-2" onClick={install}>
              <Download data-icon="inline-start" aria-hidden />
              Quraşdır
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-1 shrink-0"
          aria-label="Bağla"
          onClick={dismiss}
        >
          <X aria-hidden />
        </Button>
      </div>
    </aside>
  )
}
