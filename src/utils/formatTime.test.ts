import { describe, expect, it } from 'vitest'
import { DEFAULT_DURATIONS, formatTime } from './formatTime'

describe('formatTime', () => {
  it('formats whole minutes with a zero-padded seconds field', () => {
    expect(formatTime(25 * 60)).toBe('25:00')
    expect(formatTime(5 * 60)).toBe('05:00')
  })

  it('formats mixed minutes and seconds', () => {
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(9)).toBe('00:09')
  })

  it('clamps negative and invalid input to zero', () => {
    expect(formatTime(-10)).toBe('00:00')
    expect(formatTime(Number.NaN)).toBe('00:00')
  })
})

describe('DEFAULT_DURATIONS', () => {
  it('uses the classic Pomodoro lengths', () => {
    expect(DEFAULT_DURATIONS).toEqual({
      focus: 1500,
      shortBreak: 300,
      longBreak: 900,
    })
  })
})
