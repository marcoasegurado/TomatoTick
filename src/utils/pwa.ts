export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt: () => Promise<void>
}

/** True when the app is already running as an installed window/app. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false

  const displayMode =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  return Boolean(displayMode || iosStandalone)
}

/** Register the offline service worker in production builds only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is optional; the app still loads without it.
    })
  })
}
