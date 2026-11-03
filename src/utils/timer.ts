import { DEFAULT_DURATIONS } from './formatTime'

export { DEFAULT_DURATIONS }

export type Mode = 'focus' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface Durations {
  readonly focus: number
  readonly shortBreak: number
  readonly longBreak: number
}

export const LONG_BREAK_INTERVAL = 4
export const TIMER_STORAGE_KEY = 'tomatotick:timer'

export const MODE_LABELS: Record<Mode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
}

export const MODES: readonly Mode[] = ['focus', 'shortBreak', 'longBreak']

export interface TimerState {
  mode: Mode
  status: TimerStatus
  /** Epoch milliseconds when the running session ends. Null unless running. */
  endTime: number | null
  /** Remaining time in milliseconds. Authoritative while paused or idle. */
  remainingMs: number
  /** Full length of the current session in milliseconds. */
  totalMs: number
  /** Focus sessions completed in the current long-break cycle. */
  focusCountInCycle: number
}

/** Convert a duration in seconds to milliseconds. */
export function durationMs(mode: Mode, durations: Durations = DEFAULT_DURATIONS): number {
  return Math.max(0, durations[mode]) * 1000
}

export function createTimerState(
  durations: Durations = DEFAULT_DURATIONS,
  mode: Mode = 'focus',
  focusCountInCycle = 0,
): TimerState {
  const totalMs = durationMs(mode, durations)
  return {
    mode,
    status: 'idle',
    endTime: null,
    remainingMs: totalMs,
    totalMs,
    focusCountInCycle,
  }
}

/** Remaining time for a session ending at `endTime`, clamped at zero. */
export function computeRemainingMs(endTime: number, now: number): number {
  if (!Number.isFinite(endTime) || !Number.isFinite(now)) return 0
  return Math.max(0, endTime - now)
}

function nextModeAfterFocus(
  focusCountInCycle: number,
  interval: number,
): Mode {
  return focusCountInCycle >= interval ? 'longBreak' : 'shortBreak'
}

function stateForMode(
  mode: Mode,
  focusCountInCycle: number,
  durations: Durations,
): TimerState {
  return createTimerState(durations, mode, focusCountInCycle)
}

/** Move to the next session, crediting the session that just finished. */
export function completeSession(
  state: TimerState,
  durations: Durations = DEFAULT_DURATIONS,
  interval: number = LONG_BREAK_INTERVAL,
): TimerState {
  if (state.mode === 'focus') {
    const focusCountInCycle = Math.min(state.focusCountInCycle + 1, interval)
    return stateForMode(
      nextModeAfterFocus(focusCountInCycle, interval),
      focusCountInCycle,
      durations,
    )
  }

  const focusCountInCycle =
    state.mode === 'longBreak' ? 0 : state.focusCountInCycle
  return stateForMode('focus', focusCountInCycle, durations)
}

/** Move to the next session without crediting a skipped focus session. */
export function skipSession(
  state: TimerState,
  durations: Durations = DEFAULT_DURATIONS,
  interval: number = LONG_BREAK_INTERVAL,
): TimerState {
  if (state.mode === 'focus') {
    const focusCountInCycle = Math.min(state.focusCountInCycle, interval)
    return stateForMode(
      nextModeAfterFocus(focusCountInCycle, interval),
      focusCountInCycle,
      durations,
    )
  }

  const focusCountInCycle =
    state.mode === 'longBreak' ? 0 : state.focusCountInCycle
  return stateForMode('focus', focusCountInCycle, durations)
}

export function startTimer(state: TimerState, now: number): TimerState {
  if (state.status === 'running') return state
  const remainingMs = Math.max(0, state.remainingMs)
  return {
    ...state,
    status: 'running',
    endTime: now + remainingMs,
    remainingMs,
  }
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (state.status !== 'running' || state.endTime === null) return state
  return {
    ...state,
    status: 'paused',
    endTime: null,
    remainingMs: computeRemainingMs(state.endTime, now),
  }
}

export function resetTimer(
  state: TimerState,
  durations: Durations = DEFAULT_DURATIONS,
): TimerState {
  return createTimerState(durations, state.mode, state.focusCountInCycle)
}

export function switchMode(
  state: TimerState,
  mode: Mode,
  durations: Durations = DEFAULT_DURATIONS,
): TimerState {
  return createTimerState(durations, mode, state.focusCountInCycle)
}

/**
 * Apply new durations immediately to an idle session. Running or paused
 * sessions keep their current length; new durations apply to the next session.
 */
export function applyDurations(
  state: TimerState,
  durations: Durations = DEFAULT_DURATIONS,
): TimerState {
  if (state.status !== 'idle') return state
  const totalMs = durationMs(state.mode, durations)
  if (state.totalMs === totalMs && state.remainingMs === totalMs) return state
  return { ...state, totalMs, remainingMs: totalMs }
}

/** Recompute the countdown from the stored end timestamp. */
export function tickTimer(
  state: TimerState,
  now: number,
  durations: Durations = DEFAULT_DURATIONS,
  interval: number = LONG_BREAK_INTERVAL,
): TimerState {
  if (state.status !== 'running' || state.endTime === null) return state

  const remainingMs = computeRemainingMs(state.endTime, now)
  if (remainingMs <= 0) {
    return completeSession(state, durations, interval)
  }
  if (remainingMs === state.remainingMs) return state
  return { ...state, remainingMs }
}

/**
 * Restore a persisted timer. A running session whose end time has passed is
 * advanced to the next (idle) session, so reloading mid-session is accurate.
 */
export function restoreTimer(
  state: TimerState,
  now: number,
  durations: Durations = DEFAULT_DURATIONS,
  interval: number = LONG_BREAK_INTERVAL,
): TimerState {
  if (state.status !== 'running' || state.endTime === null) return state
  return tickTimer(state, now, durations, interval)
}

function isMode(value: unknown): value is Mode {
  return value === 'focus' || value === 'shortBreak' || value === 'longBreak'
}

function isStatus(value: unknown): value is TimerStatus {
  return value === 'idle' || value === 'running' || value === 'paused'
}

/** Validate an unknown value parsed from localStorage. */
export function isTimerState(value: unknown): value is TimerState {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<TimerState>
  return (
    isMode(candidate.mode) &&
    isStatus(candidate.status) &&
    (candidate.endTime === null ||
      (typeof candidate.endTime === 'number' &&
        Number.isFinite(candidate.endTime))) &&
    typeof candidate.remainingMs === 'number' &&
    Number.isFinite(candidate.remainingMs) &&
    candidate.remainingMs >= 0 &&
    typeof candidate.totalMs === 'number' &&
    Number.isFinite(candidate.totalMs) &&
    candidate.totalMs > 0 &&
    typeof candidate.focusCountInCycle === 'number' &&
    Number.isInteger(candidate.focusCountInCycle) &&
    candidate.focusCountInCycle >= 0
  )
}
