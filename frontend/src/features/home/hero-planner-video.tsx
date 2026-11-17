'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Play, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Hero clip assets. The clip itself is generated separately and dropped into
 * public/media; until then `ready` stays false and nothing is rendered, so
 * the hero keeps its previous look (no placeholder ever reaches the site).
 * When the clip arrives: add the files, replace both posters with its first
 * and last frames, and set `ready: true`.
 */
export const HERO_PLANNER_MEDIA = {
  ready: false,
  poster: '/media/hero-planner-poster.jpg',
  finalPoster: '/media/hero-planner-final.jpg',
  sources: [
    { src: '/media/hero-planner.webm', type: 'video/webm' },
    { src: '/media/hero-planner.mp4', type: 'video/mp4' },
  ],
} as const

type Source = { src: string; type: string }

type Props = {
  /** 16:9 by default; 9:16 for a vertical clip. */
  aspect?: '16:9' | '9:16'
  ready?: boolean
  poster?: string
  finalPoster?: string
  sources?: readonly Source[]
  className?: string
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(REDUCED_MOTION)
  if (typeof query.addEventListener !== 'function') return () => {}
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const reducedMotionSnapshot = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia(REDUCED_MOTION).matches

// null on the server: it cannot know the motion preference.
const reducedMotionServerSnapshot = () => null

/**
 * Short cinematic hero clip: a hand fills in a paper planner and ticks the
 * last row. Lazy (preload="none", sources attached only when the frame comes
 * into view), muted and inline; plays once and holds the completed planner,
 * with a replay button. Pauses offscreen and in hidden tabs. With
 * prefers-reduced-motion it shows the final frame as a still and plays only
 * when asked. A fixed aspect ratio (at most 60svh tall) keeps the layout
 * from shifting.
 */
export function HeroPlannerVideo({
  aspect = '16:9',
  ready = HERO_PLANNER_MEDIA.ready,
  poster = HERO_PLANNER_MEDIA.poster,
  finalPoster = HERO_PLANNER_MEDIA.finalPoster,
  sources = HERO_PLANNER_MEDIA.sources,
  className,
}: Props) {
  const t = useTranslations('home.video')
  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  )
  const [userStarted, setUserStarted] = useState(false)
  const [seen, setSeen] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const [ended, setEnded] = useState(false)
  const [failed, setFailed] = useState(false)

  const showVideo =
    ready && !failed && reduced !== null && (!reduced || userStarted)
  // Without IntersectionObserver the clip simply counts as visible.
  const observable = typeof IntersectionObserver !== 'undefined'
  const loaded = !observable || seen
  const inView = !observable || onScreen

  // Visibility: attach sources the first time the frame is seen, then track
  // whether it is on screen so playback can pause.
  useEffect(() => {
    const frame = frameRef.current
    if (!showVideo || !frame || !observable) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setOnScreen(entry.isIntersecting)
        if (entry.isIntersecting) setSeen(true)
      },
      { threshold: 0.25 },
    )
    observer.observe(frame)
    return () => observer.disconnect()
  }, [showVideo, observable])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const attempt = video.play()
    if (!attempt) return
    // Autoplay can be refused (data saver, strict browser settings): retry
    // once on the first interaction with the page.
    attempt.catch(() => {
      const retry = () => {
        window.removeEventListener('pointerdown', retry)
        window.removeEventListener('keydown', retry)
        videoRef.current?.play()?.catch(() => {})
      }
      window.addEventListener('pointerdown', retry, { once: true })
      window.addEventListener('keydown', retry, { once: true })
    })
  }, [])

  // Play while visible and the tab is shown; pause otherwise.
  useEffect(() => {
    const video = videoRef.current
    if (!showVideo || !loaded || !video) return
    const sync = () => {
      if (inView && !ended && document.visibilityState === 'visible') play()
      else video.pause()
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [showVideo, loaded, inView, ended, play])

  const replay = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    setEnded(false)
  }

  if (!ready) return null

  const ratio = aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
  // Cap the height at 60svh by capping the width for the given ratio.
  const width =
    aspect === '9:16'
      ? 'w-[min(100%,calc(60svh*9/16))]'
      : 'w-[min(100%,calc(60svh*16/9))]'

  return (
    <figure className={cn('mx-auto', width, className)}>
      <div
        ref={frameRef}
        data-testid="hero-planner-video"
        className={cn(
          'relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10',
          ratio,
        )}
      >
        {showVideo ? (
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            poster={reduced ? finalPoster : poster}
            preload="none"
            muted
            playsInline
            aria-label={t('label')}
            onEnded={() => setEnded(true)}
            onError={() => setFailed(true)}
          >
            {loaded &&
              sources.map((source) => (
                <source
                  key={source.src}
                  src={source.src}
                  type={source.type}
                  onError={
                    source === sources[sources.length - 1]
                      ? () => setFailed(true)
                      : undefined
                  }
                />
              ))}
          </video>
        ) : (
          <Image
            src={reduced ? finalPoster : poster}
            alt={t('label')}
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        )}

        {!failed && reduced && !userStarted && (
          <Button
            type="button"
            size="icon-lg"
            variant="secondary"
            className="absolute right-3 bottom-3 shadow-sm"
            aria-label={t('play')}
            onClick={() => setUserStarted(true)}
          >
            <Play aria-hidden />
          </Button>
        )}
        {showVideo && ended && (
          <Button
            type="button"
            size="icon-lg"
            variant="secondary"
            className="absolute right-3 bottom-3 shadow-sm"
            aria-label={t('replay')}
            onClick={replay}
          >
            <RotateCcw aria-hidden />
          </Button>
        )}
      </div>
      {!failed && (
        <figcaption className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden />
          {t('caption')}
        </figcaption>
      )}
    </figure>
  )
}
