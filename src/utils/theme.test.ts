import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  applyTheme,
  getStoredTheme,
  initTheme,
  persistTheme,
  resolveTheme,
  watchSystemTheme,
} from './theme'

const originalMatchMedia = window.matchMedia
let systemIsDark = false
let listeners: Array<() => void> = []

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  systemIsDark = false
  listeners = []

  window.matchMedia = ((query: string) => ({
    get matches() {
      return systemIsDark
    },
    media: query,
    onchange: null,
    addEventListener: (type: string, listener: () => void) => {
      if (type === 'change') listeners.push(listener)
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === 'change') {
        listeners = listeners.filter((current) => current !== listener)
      }
    },
    addListener: (listener: () => void) => listeners.push(listener),
    removeListener: (listener: () => void) => {
      listeners = listeners.filter((current) => current !== listener)
    },
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
  document.documentElement.removeAttribute('data-theme')
})

describe('theme options', () => {
  it('includes every supported theme', () => {
    expect(THEME_OPTIONS.map((option) => option.id)).toEqual([
      'system',
      'light',
      'dark',
      'sunset',
      'forest',
      'midnight',
    ])
  })
})

describe('getStoredTheme', () => {
  it('returns null for missing or invalid values', () => {
    expect(getStoredTheme()).toBeNull()
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    expect(getStoredTheme()).toBeNull()
  })

  it('keeps existing light and dark preferences', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(getStoredTheme()).toBe('light')
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('keeps the new themes', () => {
    for (const theme of ['sunset', 'forest', 'midnight'] as const) {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
      expect(getStoredTheme()).toBe(theme)
    }
  })
})

describe('resolveTheme', () => {
  it('resolves System to the OS preference', () => {
    systemIsDark = false
    expect(resolveTheme('system')).toBe('light')
    systemIsDark = true
    expect(resolveTheme('system')).toBe('dark')
  })

  it('returns explicit themes unchanged', () => {
    expect(resolveTheme('sunset')).toBe('sunset')
    expect(resolveTheme('forest')).toBe('forest')
    expect(resolveTheme('midnight')).toBe('midnight')
  })

  it('uses the saved preference by default', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'forest')
    expect(resolveTheme()).toBe('forest')
  })
})

describe('applyTheme', () => {
  it('paints the resolved theme on the document', () => {
    systemIsDark = true
    expect(applyTheme('system')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    applyTheme('sunset')
    expect(document.documentElement.dataset.theme).toBe('sunset')
  })
})

describe('persistTheme', () => {
  it('stores the preference for the next visit', () => {
    persistTheme('midnight')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('midnight')
  })
})

describe('initTheme', () => {
  it('applies a saved theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sunset')
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('sunset')
  })

  it('follows the OS when no theme is saved', () => {
    systemIsDark = true
    initTheme()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

describe('watchSystemTheme', () => {
  it('repaints while the System preference is active', () => {
    const cleanup = watchSystemTheme()

    systemIsDark = true
    listeners.forEach((listener) => listener())

    expect(document.documentElement.dataset.theme).toBe('dark')
    cleanup()
    expect(listeners).toHaveLength(0)
  })

  it('ignores OS changes when an explicit theme is saved', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'forest')
    applyTheme('forest')
    const cleanup = watchSystemTheme()

    systemIsDark = true
    listeners.forEach((listener) => listener())

    expect(document.documentElement.dataset.theme).toBe('forest')
    cleanup()
  })
})
