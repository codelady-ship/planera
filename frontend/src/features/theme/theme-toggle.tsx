'use client'

import { useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getTheme, setTheme, subscribeTheme, THEMES, type Theme } from './theme'

const LABEL: Record<Theme, string> = {
  system: 'Sistem',
  light: 'Gündüz',
  dark: 'Gecə',
}

const ICON = { system: Monitor, light: Sun, dark: Moon } as const

function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, () => 'system')
}

/** One button that cycles system, day, night (#93); for headers. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme()
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
  const Icon = ICON[theme]
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={`Rejim: ${LABEL[theme]}. ${LABEL[next]} rejiminə keç`}
      title={`Rejim: ${LABEL[theme]}`}
      onClick={() => setTheme(next)}
    >
      <Icon aria-hidden />
    </Button>
  )
}

/** The three choices side by side, for menus and settings. */
export function ThemeChoice({ className }: { className?: string }) {
  const theme = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Rejim"
      className={cn('flex gap-1 rounded-lg bg-muted p-1', className)}
    >
      {THEMES.map((value) => {
        const Icon = ICON[value]
        return (
          <Button
            key={value}
            role="radio"
            aria-checked={theme === value}
            variant="ghost"
            size="sm"
            className={cn(
              'flex-1',
              theme === value && 'bg-background shadow-sm hover:bg-background',
            )}
            onClick={() => setTheme(value)}
          >
            <Icon aria-hidden />
            {LABEL[value]}
          </Button>
        )
      })}
    </div>
  )
}
