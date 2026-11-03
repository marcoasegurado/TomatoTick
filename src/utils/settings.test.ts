import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  isValidSettings,
  parseSettings,
  sanitizeSettings,
  settingsToDurations,
  validateSettings,
  type Settings,
} from './settings'

const validSettings: Settings = { ...DEFAULT_SETTINGS }

describe('validateSettings', () => {
  it('accepts the defaults', () => {
    expect(validateSettings(validSettings)).toEqual({})
    expect(isValidSettings(validSettings)).toBe(true)
  })

  it('rejects zero or negative durations', () => {
    expect(validateSettings({ ...validSettings, focus: 0 })).toHaveProperty(
      'focus',
    )
    expect(
      validateSettings({ ...validSettings, shortBreak: -5 }),
    ).toHaveProperty('shortBreak')
    expect(validateSettings({ ...validSettings, longBreak: 0 })).toHaveProperty(
      'longBreak',
    )
  })

  it('rejects non-integer and out-of-range durations', () => {
    expect(validateSettings({ ...validSettings, focus: 12.5 })).toHaveProperty(
      'focus',
    )
    expect(validateSettings({ ...validSettings, focus: 121 })).toHaveProperty(
      'focus',
    )
    expect(
      validateSettings({ ...validSettings, longBreakInterval: 0 }),
    ).toHaveProperty('longBreakInterval')
    expect(
      validateSettings({ ...validSettings, longBreakInterval: 13 }),
    ).toHaveProperty('longBreakInterval')
  })

  it('rejects invalid volume and sounds', () => {
    expect(validateSettings({ ...validSettings, volume: -0.1 })).toHaveProperty(
      'volume',
    )
    expect(validateSettings({ ...validSettings, volume: 1.5 })).toHaveProperty(
      'volume',
    )
    expect(
      validateSettings({
        ...validSettings,
        sound: 'kazoo' as Settings['sound'],
      }),
    ).toHaveProperty('sound')
  })
})

describe('sanitizeSettings', () => {
  it('falls back to defaults for invalid fields', () => {
    const sanitized = sanitizeSettings({
      focus: 0,
      shortBreak: -1,
      longBreak: Number.NaN,
      longBreakInterval: 0,
      sound: 'nope' as Settings['sound'],
      volume: 2,
      autoStart: 'yes' as unknown as boolean,
      notifications: 1 as unknown as boolean,
    })

    expect(sanitized).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid overrides', () => {
    const sanitized = sanitizeSettings({
      focus: 50,
      shortBreak: 10,
      longBreak: 30,
      longBreakInterval: 6,
      sound: 'chime',
      volume: 0.25,
      autoStart: true,
      notifications: false,
    })

    expect(sanitized).toEqual({
      focus: 50,
      shortBreak: 10,
      longBreak: 30,
      longBreakInterval: 6,
      sound: 'chime',
      volume: 0.25,
      autoStart: true,
      notifications: false,
    })
  })
})

describe('parseSettings', () => {
  it('returns defaults for missing or malformed data', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS)
  })

  it('merges partial persisted settings', () => {
    const parsed = parseSettings(JSON.stringify({ focus: 30, sound: 'beep' }))
    expect(parsed.focus).toBe(30)
    expect(parsed.sound).toBe('beep')
    expect(parsed.shortBreak).toBe(DEFAULT_SETTINGS.shortBreak)
  })
})

describe('settingsToDurations', () => {
  it('converts minutes to seconds', () => {
    expect(
      settingsToDurations({
        ...DEFAULT_SETTINGS,
        focus: 20,
        shortBreak: 7,
        longBreak: 12,
      }),
    ).toEqual({
      focus: 1200,
      shortBreak: 420,
      longBreak: 720,
    })
  })
})
