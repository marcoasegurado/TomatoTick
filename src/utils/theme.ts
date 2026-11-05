export const THEME_STORAGE_KEY = 'tomatotick:theme'

export type Theme =
  | 'system'
  | 'light'
  | 'dark'
  | 'sunset'
  | 'forest'
  | 'midnight'

export type ResolvedTheme = Exclude<Theme, 'system'>

export const THEME_OPTIONS: ReadonlyArray<{
  id: Theme
  label: string
}> = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' },
  { id: 'midnight', label: 'Midnight' },
]

const THEMES = new Set<Theme>(THEME_OPTIONS.map((option) => option.id))

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && THEMES.has(value as Theme)
}

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

/** The theme actually painted: System resolves to the OS preference. */
export function resolveTheme(
  preference: Theme = getStoredTheme() ?? 'system',
): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
}

export function applyTheme(theme: Theme): ResolvedTheme {
  const resolved = resolveTheme(theme)
  document.documentElement.dataset.theme = resolved
  return resolved
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable; the theme still applies for this session.
  }
}

/** Apply the saved theme before the first paint; System follows the OS. */
export function initTheme(): void {
  applyTheme(getStoredTheme() ?? 'system')
}

/**
 * Repaint when the OS appearance changes, but only while System is selected.
 * Returns a cleanup function.
 */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = () => {
    if ((getStoredTheme() ?? 'system') === 'system') {
      applyTheme('system')
    }
  }

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }

  query.addListener(handleChange)
  return () => query.removeListener(handleChange)
}
