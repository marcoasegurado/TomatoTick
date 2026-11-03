import { describe, expect, it } from 'vitest'
import { DEFAULT_DURATIONS } from './formatTime'
import {
  LONG_BREAK_INTERVAL,
  completeSession,
  computeRemainingMs,
  createTimerState,
  durationMs,
  isTimerState,
  pauseTimer,
  resetTimer,
  restoreTimer,
  skipSession,
  startTimer,
  switchMode,
  tickTimer,
  type TimerState,
} from './timer'

const NOW = 1_000_000

describe('computeRemainingMs', () => {
  it('returns the time left until the end timestamp', () => {
    expect(computeRemainingMs(NOW + 5000, NOW)).toBe(5000)
  })

  it('clamps at zero once the end timestamp has passed', () => {
    expect(computeRemainingMs(NOW - 1, NOW)).toBe(0)
  })
})

describe('timer state helpers', () => {
  it('creates an idle focus timer with the full duration', () => {
    const state = createTimerState()
    expect(state).toEqual({
      mode: 'focus',
      status: 'idle',
      endTime: null,
      remainingMs: durationMs('focus'),
      focusCountInCycle: 0,
    })
  })

  it('starts with an end timestamp and pauses back to remaining time', () => {
    const started = startTimer(createTimerState(), NOW)
    expect(started.status).toBe('running')
    expect(started.endTime).toBe(NOW + durationMs('focus'))

    const paused = pauseTimer(started, NOW + 10_000)
    expect(paused.status).toBe('paused')
    expect(paused.endTime).toBeNull()
    expect(paused.remainingMs).toBe(durationMs('focus') - 10_000)
  })

  it('resets the current mode without touching the cycle count', () => {
    const state: TimerState = {
      ...createTimerState(),
      status: 'paused',
      remainingMs: 1234,
      focusCountInCycle: 2,
    }
    const reset = resetTimer(state)
    expect(reset.remainingMs).toBe(durationMs('focus'))
    expect(reset.status).toBe('idle')
    expect(reset.focusCountInCycle).toBe(2)
  })

  it('switches mode and resets the countdown', () => {
    const switched = switchMode(createTimerState(), 'longBreak')
    expect(switched.mode).toBe('longBreak')
    expect(switched.remainingMs).toBe(durationMs('longBreak'))
    expect(switched.focusCountInCycle).toBe(0)
  })
})

describe('session transitions', () => {
  it('credits a completed focus session and starts a short break', () => {
    const next = completeSession(createTimerState())
    expect(next.mode).toBe('shortBreak')
    expect(next.focusCountInCycle).toBe(1)
    expect(next.status).toBe('idle')
  })

  it('takes a long break after every fourth focus session', () => {
    let state = createTimerState()
    for (let i = 0; i < LONG_BREAK_INTERVAL - 1; i += 1) {
      state = completeSession(state)
      state = completeSession(state) // finish the short break
    }
    state = completeSession(state) // fourth focus session
    expect(state.mode).toBe('longBreak')
    expect(state.focusCountInCycle).toBe(LONG_BREAK_INTERVAL)

    const afterLongBreak = completeSession(state)
    expect(afterLongBreak.mode).toBe('focus')
    expect(afterLongBreak.focusCountInCycle).toBe(0)
  })

  it('does not credit a skipped focus session', () => {
    const next = skipSession(createTimerState())
    expect(next.mode).toBe('shortBreak')
    expect(next.focusCountInCycle).toBe(0)
  })

  it('advances from a break back to focus', () => {
    const state = { ...createTimerState(), mode: 'shortBreak' as const, focusCountInCycle: 2 }
    const next = skipSession(state)
    expect(next.mode).toBe('focus')
    expect(next.focusCountInCycle).toBe(2)
  })
})

describe('ticking and restoring', () => {
  it('updates the remaining time from the end timestamp', () => {
    const started = startTimer(createTimerState(), NOW)
    const ticked = tickTimer(started, NOW + 65_000)
    expect(ticked.status).toBe('running')
    expect(ticked.remainingMs).toBe(durationMs('focus') - 65_000)
  })

  it('completes the session when the tick passes the end time', () => {
    const started = startTimer(createTimerState(), NOW)
    const ticked = tickTimer(started, started.endTime! + 1)
    expect(ticked.mode).toBe('shortBreak')
    expect(ticked.status).toBe('idle')
    expect(ticked.focusCountInCycle).toBe(1)
  })

  it('resumes correctly after a reload mid-session', () => {
    const started = startTimer(createTimerState(), NOW)
    const restored = restoreTimer(started, NOW + 30_000)
    expect(restored).toEqual({
      ...started,
      remainingMs: durationMs('focus') - 30_000,
    })
  })

  it('advances an expired session on reload', () => {
    const started = startTimer(createTimerState(), NOW)
    const restored = restoreTimer(started, started.endTime! + 5_000)
    expect(restored.mode).toBe('shortBreak')
    expect(restored.status).toBe('idle')
    expect(restored.focusCountInCycle).toBe(1)
  })
})

describe('isTimerState', () => {
  it('accepts a valid persisted state and rejects malformed data', () => {
    expect(isTimerState(createTimerState())).toBe(true)
    expect(isTimerState({ ...createTimerState(), mode: 'nope' })).toBe(false)
    expect(isTimerState(null)).toBe(false)
    expect(isTimerState({ mode: 'focus' })).toBe(false)
  })
})

describe('DEFAULT_DURATIONS', () => {
  it('is used by default and matches the classic lengths', () => {
    expect(durationMs('shortBreak', DEFAULT_DURATIONS)).toBe(5 * 60 * 1000)
    expect(durationMs('longBreak', DEFAULT_DURATIONS)).toBe(15 * 60 * 1000)
  })
})
