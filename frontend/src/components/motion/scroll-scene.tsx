'use client'

import { useEffect, useRef } from 'react'

const CELLS = 24 // 6 x 4 calendar grid
const CHECKED = [1, 4, 6, 9, 11, 14, 17, 20, 22] // filled in this order while scrolling
const FIRST_DAY = 1
const LAST_DAY = 31

/**
 * Scroll-driven background scene (#78): a calendar whose cells fill with
 * check marks, a clock whose hands turn, and a tear-off page whose day number
 * advances. One scroll listener writes the progress (0..1) to the `--p` CSS
 * variable; every movement is a CSS calc() of it, so React never re-renders
 * while scrolling. With prefers-reduced-motion the scene stays still. The
 * scene starts below the 65px sticky header so the tear-off page is never
 * hidden behind it.
 */
export function ScrollScene() {
  const root = useRef<HTMLDivElement>(null)
  const day = useRef<SVGTextElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      el.style.setProperty('--p', p.toFixed(4))
      if (day.current) {
        day.current.textContent = String(
          FIRST_DAY + Math.round(p * (LAST_DAY - FIRST_DAY)),
        )
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={root}
      data-testid="scroll-scene"
      aria-hidden
      className="scroll-scene pointer-events-none fixed inset-x-0 top-[65px] bottom-0 -z-10 overflow-hidden"
    >
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMaxYMid meet"
        className="scene-drift absolute inset-0 h-full w-full"
      >
        {/* Calendar */}
        <g
          transform="translate(255 150) scale(0.94)"
          className="opacity-[0.22] md:opacity-35"
        >
          <rect width="360" height="300" rx="18" fill="var(--brand-white)" />
          <rect width="360" height="64" rx="18" fill="var(--brand-navy)" />
          <rect y="40" width="360" height="24" fill="var(--brand-navy)" />
          {[70, 110, 250, 290].map((x) => (
            <rect
              key={x}
              x={x - 6}
              y="-22"
              width="12"
              height="44"
              rx="6"
              fill="var(--brand-ink)"
            />
          ))}
          {Array.from({ length: CELLS }, (_, i) => {
            const x = 30 + (i % 6) * 52
            const y = 90 + Math.floor(i / 6) * 50
            const order = CHECKED.indexOf(i)
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <rect width="36" height="34" rx="6" fill="#c3cddd" />
                {order >= 0 && (
                  <g
                    className="scene-check"
                    style={
                      {
                        '--i': order,
                        '--n': CHECKED.length,
                      } as React.CSSProperties
                    }
                  >
                    <circle
                      cx="18"
                      cy="17"
                      r="13"
                      fill="var(--brand-teal-dark)"
                    />
                    <path
                      d="M11 17.5l5 5 9-10"
                      fill="none"
                      stroke="var(--brand-white)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
              </g>
            )
          })}
        </g>

        {/* Clock */}
        <g
          transform="translate(655 445) scale(0.9)"
          className="opacity-25 md:opacity-45"
        >
          <circle r="96" fill="var(--brand-white)" />
          <circle
            r="96"
            fill="none"
            stroke="var(--brand-blue)"
            strokeWidth="12"
          />
          {Array.from({ length: 12 }, (_, i) => (
            <circle
              key={i}
              cx={Math.sin((i * Math.PI) / 6) * 72}
              cy={-Math.cos((i * Math.PI) / 6) * 72}
              r={i % 3 === 0 ? 6 : 3.5}
              fill="var(--brand-navy)"
            />
          ))}
          <line
            className="scene-hour"
            x1="0"
            y1="0"
            x2="0"
            y2="-44"
            stroke="var(--brand-navy)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <line
            className="scene-minute"
            x1="0"
            y1="0"
            x2="0"
            y2="-68"
            stroke="var(--brand-navy)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle r="9" fill="var(--brand-teal)" />
        </g>

        {/* Tear-off page */}
        <g
          transform="translate(615 40) scale(0.8)"
          className="opacity-[0.22] md:opacity-45"
        >
          <rect width="190" height="210" rx="14" fill="var(--brand-white)" />
          <rect width="190" height="46" rx="14" fill="var(--brand-blue)" />
          <rect y="30" width="190" height="16" fill="var(--brand-blue)" />
          <text
            ref={day}
            x="95"
            y="160"
            textAnchor="middle"
            fontSize="100"
            fontWeight="700"
            fill="var(--brand-navy)"
          >
            {FIRST_DAY}
          </text>
        </g>
      </svg>
    </div>
  )
}
