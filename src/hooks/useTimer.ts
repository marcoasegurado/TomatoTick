import { useCallback, useEffect, useState } from 'react'
import { formatTime } from '../utils/formatTime'
import {
  DEFAULT_DURATIONS,
  LONG_BREAK_INTERVAL,
  MODE_LABELS,
  TIMER_STORAGE_KEY,
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
  type Mode,
  type TimerState,
} from '../utils/timer'

const TICK_INTERVAL_MS = 250

function loadTimerState(now: number): TimerState {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return createTimerState()
    const parsed: unknown = JSON.parse(raw)
    if (!isTimerState(parsed)) return createTimerState()
    return restoreTimer(parsed, now)
  } catch {
    return createTimerState()
  }
}

export interface UseTimerResult extends TimerState {
  /** Whole seconds remaining, rounded up so the display starts at full time. */
  remainingSeconds: number
  /** Total length of the current session in milliseconds. */
  totalMs: number
  /** Elapsed fraction of the current session, from 0 to 1. */
  progress: number
  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
  setMode: (mode: Mode) => void
}

export function useTimer(): UseTimerResult {
  const [state, setState] = useState<TimerState>(() =>
    loadTimerState(Date.now()),
  )

  // Persist every state change so a refresh or closed tab resumes correctly.
  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can be unavailable (private mode/quota); the timer still works.
    }
  }, [state])

  // While running, recompute the remaining time from the end timestamp.
  useEffect(() => {
    if (state.status !== 'running') return

    const id = window.setInterval(() => {
      setState((current) =>
        tickTimer(
          current,
          Date.now(),
          DEFAULT_DURATIONS,
          LONG_BREAK_INTERVAL,
        ),
      )
    }, TICK_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [state.status])

  const remainingSeconds = Math.max(0, Math.ceil(state.remainingMs / 1000))

  // Keep the live countdown visible in the browser tab.
  useEffect(() => {
    const label = MODE_LABELS[state.mode]
    document.title =
      state.status === 'running'
        ? `${formatTime(remainingSeconds)} · ${label} · TomatoTick`
        : `TomatoTick · ${label}`
  }, [remainingSeconds, state.mode, state.status])

  const start = useCallback(() => {
    setState((current) => startTimer(current, Date.now()))
  }, [])

  const pause = useCallback(() => {
    setState((current) => pauseTimer(current, Date.now()))
  }, [])

  const toggle = useCallback(() => {
    setState((current) =>
      current.status === 'running'
        ? pauseTimer(current, Date.now())
        : startTimer(current, Date.now()),
    )
  }, [])

  const reset = useCallback(() => {
    setState((current) => resetTimer(current, DEFAULT_DURATIONS))
  }, [])

  const skip = useCallback(() => {
    setState((current) =>
      skipSession(current, DEFAULT_DURATIONS, LONG_BREAK_INTERVAL),
    )
  }, [])

  const setMode = useCallback((mode: Mode) => {
    setState((current) => switchMode(current, mode, DEFAULT_DURATIONS))
  }, [])

  const totalMs = durationMs(state.mode, DEFAULT_DURATIONS)
  const progress =
    totalMs > 0
      ? Math.min(1, Math.max(0, 1 - state.remainingMs / totalMs))
      : 0

  return {
    ...state,
    remainingSeconds,
    totalMs,
    progress,
    start,
    pause,
    toggle,
    reset,
    skip,
    setMode,
  }
}
