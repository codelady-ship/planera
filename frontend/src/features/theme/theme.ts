// Night / day mode (#93). The choice lives in localStorage; "system" follows
// the OS. The class on <html> drives the `.dark` tokens in globals.css.

export type Theme = 'system' | 'light' | 'dark'

export const THEME_KEY = 'rv_theme'
export const THEMES: Theme[] = ['system', 'light', 'dark']

const DARK_QUERY = '(prefers-color-scheme: dark)'
const listeners = new Set<() => void>()

export function getTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function isDark(theme: Theme = getTheme()): boolean {
  if (theme !== 'system') return theme === 'dark'
  return window.matchMedia(DARK_QUERY).matches
}

/** Puts the `.dark` class on <html> according to the theme. */
export function applyTheme(theme: Theme = getTheme()) {
  document.documentElement.classList.toggle('dark', isDark(theme))
  document.documentElement.style.colorScheme = isDark(theme) ? 'dark' : 'light'
}

export function setTheme(theme: Theme) {
  try {
    if (theme === 'system') window.localStorage.removeItem(THEME_KEY)
    else window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  applyTheme(theme)
  listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: theme changes here and OS changes while on "system". */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia(DARK_QUERY)
  const onMedia = () => {
    if (getTheme() === 'system') applyTheme('system')
    listener()
  }
  media.addEventListener('change', onMedia)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onMedia)
  }
}

/**
 * Runs inline in <head> before the first paint, so a dark page never
 * flashes light. Must stay plain ES5 and self-contained.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('${DARK_QUERY}').matches);var c=document.documentElement;c.classList.toggle('dark',d);c.style.colorScheme=d?'dark':'light'}catch(e){}})()`
