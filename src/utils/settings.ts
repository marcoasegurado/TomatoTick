import type { Durations } from './timer'

export const SETTINGS_STORAGE_KEY = 'tomatotick:settings'

export type AlertSound = 'bell' | 'chime' | 'beep' | 'marimba' | 'digital'

export const SOUND_OPTIONS: ReadonlyArray<{
  id: AlertSound
  label: string
}> = [
  { id: 'bell', label: 'Bell' },
  { id: 'chime', label: 'Chime' },
  { id: 'beep', label: 'Beep' },
  { id: 'marimba', label: 'Marimba' },
  { id: 'digital', label: 'Digital' },
]

export interface Settings {
  /** Focus length in minutes. */
  focus: number
  /** Short break length in minutes. */
  shortBreak: number
  /** Long break length in minutes. */
  longBreak: number
  /** Focus sessions between long breaks. */
  longBreakInterval: number
  sound: AlertSound
  /** Alert volume, from 0 to 1. */
  volume: number
  autoStart: boolean
  notifications: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  sound: 'bell',
  volume: 0.7,
  autoStart: false,
  notifications: false,
}

export const SETTINGS_LIMITS = {
  focus: { min: 1, max: 120 },
  shortBreak: { min: 1, max: 60 },
  longBreak: { min: 1, max: 120 },
  longBreakInterval: { min: 1, max: 12 },
} as const

export type SettingsField =
  | 'focus'
  | 'shortBreak'
  | 'longBreak'
  | 'longBreakInterval'
  | 'sound'
  | 'volume'

export type SettingsErrors = Partial<Record<SettingsField, string>>

function isValidMinutes(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}

function isValidVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

export function isAlertSound(value: unknown): value is AlertSound {
  return (
    value === 'bell' ||
    value === 'chime' ||
    value === 'beep' ||
    value === 'marimba' ||
    value === 'digital'
  )
}

/** Return a map of human-readable errors. An empty map means the settings are valid. */
export function validateSettings(settings: Settings): SettingsErrors {
  const errors: SettingsErrors = {}

  const durationFields: Array<{
    key: 'focus' | 'shortBreak' | 'longBreak'
    label: string
  }> = [
    { key: 'focus', label: 'Focus' },
    { key: 'shortBreak', label: 'Short break' },
    { key: 'longBreak', label: 'Long break' },
  ]

  for (const { key, label } of durationFields) {
    const limits = SETTINGS_LIMITS[key]
    if (!isValidMinutes(settings[key], limits.min, limits.max)) {
      errors[key] = `${label} must be a whole number between ${limits.min} and ${limits.max} minutes.`
    }
  }

  const intervalLimits = SETTINGS_LIMITS.longBreakInterval
  if (
    !isValidMinutes(
      settings.longBreakInterval,
      intervalLimits.min,
      intervalLimits.max,
    )
  ) {
    errors.longBreakInterval = `Long break interval must be a whole number between ${intervalLimits.min} and ${intervalLimits.max}.`
  }

  if (!isAlertSound(settings.sound)) {
    errors.sound = 'Choose a valid alert sound.'
  }

  if (!isValidVolume(settings.volume)) {
    errors.volume = 'Volume must be between 0 and 100%.'
  }

  return errors
}

export function isValidSettings(settings: Settings): boolean {
  return Object.keys(validateSettings(settings)).length === 0
}

/** Merge persisted/partial settings with defaults, discarding invalid values. */
export function sanitizeSettings(input: Partial<Settings>): Settings {
  return {
    focus: isValidMinutes(
      input.focus,
      SETTINGS_LIMITS.focus.min,
      SETTINGS_LIMITS.focus.max,
    )
      ? (input.focus as number)
      : DEFAULT_SETTINGS.focus,
    shortBreak: isValidMinutes(
      input.shortBreak,
      SETTINGS_LIMITS.shortBreak.min,
      SETTINGS_LIMITS.shortBreak.max,
    )
      ? (input.shortBreak as number)
      : DEFAULT_SETTINGS.shortBreak,
    longBreak: isValidMinutes(
      input.longBreak,
      SETTINGS_LIMITS.longBreak.min,
      SETTINGS_LIMITS.longBreak.max,
    )
      ? (input.longBreak as number)
      : DEFAULT_SETTINGS.longBreak,
    longBreakInterval: isValidMinutes(
      input.longBreakInterval,
      SETTINGS_LIMITS.longBreakInterval.min,
      SETTINGS_LIMITS.longBreakInterval.max,
    )
      ? (input.longBreakInterval as number)
      : DEFAULT_SETTINGS.longBreakInterval,
    sound: isAlertSound(input.sound) ? input.sound : DEFAULT_SETTINGS.sound,
    volume: isValidVolume(input.volume)
      ? input.volume
      : DEFAULT_SETTINGS.volume,
    autoStart:
      typeof input.autoStart === 'boolean'
        ? input.autoStart
        : DEFAULT_SETTINGS.autoStart,
    notifications:
      typeof input.notifications === 'boolean'
        ? input.notifications
        : DEFAULT_SETTINGS.notifications,
  }
}

export function parseSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_SETTINGS }
    }
    return sanitizeSettings(parsed as Partial<Settings>)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Settings are stored in minutes; the timer works in seconds. */
export function settingsToDurations(settings: Settings): Durations {
  return {
    focus: settings.focus * 60,
    shortBreak: settings.shortBreak * 60,
    longBreak: settings.longBreak * 60,
  }
}
