import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  showSessionNotification,
  showTestNotification,
} from './alerts'

interface NotificationCall {
  title: string
  options?: NotificationOptions
}

let permission: NotificationPermission = 'granted'
let notificationCalls: NotificationCall[] = []

class MockNotification {
  static get permission(): NotificationPermission {
    return permission
  }

  static requestPermission = vi.fn(async () => permission)

  constructor(title: string, options?: NotificationOptions) {
    notificationCalls.push({ title, options })
  }
}

const originalServiceWorker = Object.getOwnPropertyDescriptor(
  navigator,
  'serviceWorker',
)

function mockServiceWorker(registration: unknown | null) {
  const getRegistration = vi.fn().mockResolvedValue(registration)
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration },
  })
  return getRegistration
}

beforeEach(() => {
  permission = 'granted'
  notificationCalls = []
  vi.stubGlobal('Notification', MockNotification)
})

afterEach(() => {
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker')
  }
  vi.unstubAllGlobals()
})

describe('showSessionNotification', () => {
  it('uses the service worker when a registration exists', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    mockServiceWorker({ showNotification })

    await showSessionNotification('focus')

    expect(showNotification).toHaveBeenCalledWith(
      'Focus session complete!',
      expect.objectContaining({
        body: 'Nice work — time for a break.',
        tag: 'tomatotick-session',
      }),
    )
    expect(notificationCalls).toHaveLength(0)
  })

  it('falls back to the Notification constructor without a service worker', async () => {
    mockServiceWorker(null)

    await showSessionNotification('shortBreak')

    expect(notificationCalls[0]).toMatchObject({
      title: 'Break finished!',
      options: { body: 'Ready for the next focus session?' },
    })
  })

  it('falls back when the service worker rejects the notification', async () => {
    const showNotification = vi.fn().mockRejectedValue(new Error('nope'))
    mockServiceWorker({ showNotification })

    await showSessionNotification('longBreak')

    expect(showNotification).toHaveBeenCalled()
    expect(notificationCalls[0]?.title).toBe('Long break finished!')
  })

  it('does nothing when permission has not been granted', async () => {
    permission = 'denied'
    const showNotification = vi.fn().mockResolvedValue(undefined)
    mockServiceWorker({ showNotification })

    await showSessionNotification('focus')

    expect(showNotification).not.toHaveBeenCalled()
    expect(notificationCalls).toHaveLength(0)
  })
})

describe('showTestNotification', () => {
  it('sends a sample notification and reports success', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    mockServiceWorker({ showNotification })

    const sent = await showTestNotification()

    expect(sent).toBe(true)
    expect(showNotification).toHaveBeenCalledWith(
      'TomatoTick notifications are working',
      expect.objectContaining({
        body: 'You will see an alert like this when a session ends.',
      }),
    )
  })

  it('reports failure when permission is denied', async () => {
    permission = 'denied'
    mockServiceWorker(null)

    const sent = await showTestNotification()

    expect(sent).toBe(false)
    expect(notificationCalls).toHaveLength(0)
  })
})
