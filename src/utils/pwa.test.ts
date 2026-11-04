import { afterEach, describe, expect, it } from 'vitest'
import { isStandalone } from './pwa'

const originalMatchMedia = window.matchMedia

function mockMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = originalMatchMedia
  const nav = navigator as Navigator & { standalone?: boolean }
  delete nav.standalone
})

describe('isStandalone', () => {
  it('detects the browser standalone display mode', () => {
    mockMatchMedia(true)
    expect(isStandalone()).toBe(true)
  })

  it('detects the iOS standalone flag', () => {
    mockMatchMedia(false)
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    })
    expect(isStandalone()).toBe(true)
  })

  it('returns false in a regular browser tab', () => {
    mockMatchMedia(false)
    expect(isStandalone()).toBe(false)
  })
})
