import type { AlertSound } from './settings'
import type { Mode } from './timer'

let audioContext: AudioContext | null = null

type AudioContextConstructor = typeof AudioContext

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Constructor: AudioContextConstructor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext
  if (!Constructor) return null

  if (!audioContext) {
    audioContext = new Constructor()
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  return audioContext
}

interface ToneOptions {
  frequency: number
  start: number
  duration: number
  type: OscillatorType
  gain: number
  volume: number
}

function playTone(context: AudioContext, tone: ToneOptions) {
  const oscillator = context.createOscillator()
  const amplifier = context.createGain()
  const startAt = context.currentTime + tone.start
  const peak = Math.max(0.0001, tone.gain * tone.volume)

  oscillator.type = tone.type
  oscillator.frequency.value = tone.frequency

  amplifier.gain.setValueAtTime(0.0001, startAt)
  amplifier.gain.exponentialRampToValueAtTime(peak, startAt + 0.015)
  amplifier.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration)

  oscillator.connect(amplifier)
  amplifier.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + tone.duration + 0.05)
}

/**
 * Play one of the built-in alert sounds using the Web Audio API.
 * Fails silently when audio is unavailable.
 */
export function playAlertSound(sound: AlertSound, volume: number): void {
  const safeVolume = Number.isFinite(volume)
    ? Math.min(1, Math.max(0, volume))
    : 0
  if (safeVolume === 0) return

  const context = getAudioContext()
  if (!context) return

  if (sound === 'bell') {
    playTone(context, {
      frequency: 880,
      start: 0,
      duration: 1.1,
      type: 'sine',
      gain: 0.5,
      volume: safeVolume,
    })
    playTone(context, {
      frequency: 1320,
      start: 0,
      duration: 0.9,
      type: 'sine',
      gain: 0.22,
      volume: safeVolume,
    })
    playTone(context, {
      frequency: 1760,
      start: 0.02,
      duration: 0.6,
      type: 'sine',
      gain: 0.1,
      volume: safeVolume,
    })
    return
  }

  if (sound === 'chime') {
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((frequency, index) => {
      playTone(context, {
        frequency,
        start: index * 0.16,
        duration: 0.65,
        type: 'triangle',
        gain: 0.35,
        volume: safeVolume,
      })
    })
    return
  }

  if (sound === 'marimba') {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((frequency, index) => {
      playTone(context, {
        frequency,
        start: index * 0.16,
        duration: 0.42,
        type: 'triangle',
        gain: 0.32,
        volume: safeVolume,
      })
      playTone(context, {
        frequency: frequency * 2,
        start: index * 0.16,
        duration: 0.22,
        type: 'sine',
        gain: 0.09,
        volume: safeVolume,
      })
    })
    return
  }

  if (sound === 'digital') {
    const notes = [1046.5, 1318.51, 1046.5]
    notes.forEach((frequency, index) => {
      playTone(context, {
        frequency,
        start: index * 0.13,
        duration: 0.09,
        type: 'square',
        gain: 0.16,
        volume: safeVolume,
      })
    })
    return
  }

  // beep
  playTone(context, {
    frequency: 880,
    start: 0,
    duration: 0.14,
    type: 'square',
    gain: 0.22,
    volume: safeVolume,
  })
  playTone(context, {
    frequency: 880,
    start: 0.24,
    duration: 0.14,
    type: 'square',
    gain: 0.22,
    volume: safeVolume,
  })
}

const COMPLETION_MESSAGES: Record<Mode, { title: string; body: string }> = {
  focus: {
    title: 'Focus session complete!',
    body: 'Nice work — time for a break.',
  },
  shortBreak: {
    title: 'Break finished!',
    body: 'Ready for the next focus session?',
  },
  longBreak: {
    title: 'Long break finished!',
    body: 'A fresh cycle is waiting for you.',
  },
}

export type NotificationSupport = NotificationPermission | 'unsupported'

export function getNotificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/** Ask for notification permission, gracefully handling unsupported browsers. */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null
  } catch {
    return null
  }
}

async function showNotification(
  title: string,
  body: string,
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }
  if (Notification.permission !== 'granted') return false

  const options: NotificationOptions = {
    body,
    icon: `${import.meta.env.BASE_URL}favicon.svg`,
    tag: 'tomatotick-session',
  }

  const registration = await getServiceWorkerRegistration()
  if (registration) {
    try {
      await registration.showNotification(title, options)
      return true
    } catch {
      // Fall through to the constructor on browsers that reject this.
    }
  }

  try {
    new Notification(title, options)
    return true
  } catch {
    // Some browsers refuse notifications outside a service worker; ignore.
    return false
  }
}

/** Show a session-end notification if the user has granted permission. */
export async function showSessionNotification(
  completedMode: Mode,
): Promise<void> {
  const message = COMPLETION_MESSAGES[completedMode]
  await showNotification(message.title, message.body)
}

/** Send a sample notification so people can verify their browser setup. */
export async function showTestNotification(): Promise<boolean> {
  return showNotification(
    'TomatoTick notifications are working',
    'You will see an alert like this when a session ends.',
  )
}
