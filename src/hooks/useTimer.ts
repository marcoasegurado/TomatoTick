import { useCallback, useEffect, useRef, useState } from 'react'
import { formatTime } from '../utils/formatTime'
import {
  MODE_LABELS,
  TIMER_STORAGE_KEY,
  applyDurations,
  createTimerState,
  isTimerState,
  pauseTimer,
  resetTimer,
  restoreTimer,
  skipSession,
  startTimer,
  switchMode,
  tickTimer,
  type Durations,
  type Mode,
  type TimerState,
} from '../utils/timer'

const TICK_INTERVAL_MS = 250

function loadTimerState(
  now: number,
  durations: Durations,
  interval: number,
): TimerState {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return createTimerState(durations)
    const parsed: unknown = JSON.parse(raw)
    if (!isTimerState(parsed)) return createTimerState(durations)
    return restoreTimer(parsed, now, durations, interval)
  } catch {
    return createTimerState(durations)
  }
}

export interface UseTimerOptions {
  durations: Durations
  longBreakInterval: number
  autoStart: boolean
  onSessionEnd?: (completedMode: Mode, completedTotalMs: number) => void
}

export interface UseTimerResult extends TimerState {
  /** Whole seconds remaining, rounded up so the display starts at full time. */
  remainingSeconds: number
  /** Elapsed fraction of the current session, from 0 to 1. */
  progress: number
  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
  setMode: (mode: Mode) => void
}

export function useTimer({
  durations,
  longBreakInterval,
  autoStart,
  onSessionEnd,
}: UseTimerOptions): UseTimerResult {
  const [state, setState] = useState<TimerState>(() =>
    loadTimerState(Date.now(), durations, longBreakInterval),
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
        tickTimer(current, Date.now(), durations, longBreakInterval),
      )
    }, TICK_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [state.status, durations, longBreakInterval])

  // Idle sessions pick up new duration settings immediately.
  const previousDurationsRef = useRef(durations)
  useEffect(() => {
    if (previousDurationsRef.current === durations) return
    previousDurationsRef.current = durations
    setState((current) => applyDurations(current, durations))
  }, [durations])

  // Alert callbacks live in a ref so changing them does not re-run the effect.
  const onSessionEndRef = useRef(onSessionEnd)
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd
  }, [onSessionEnd])

  // Detect a session that ran to completion (not a manual skip/mode switch).
  const manualActionRef = useRef(false)
  const previousSessionRef = useRef({
    status: state.status,
    mode: state.mode,
    totalMs: state.totalMs,
  })
  useEffect(() => {
    const previous = previousSessionRef.current
    previousSessionRef.current = {
      status: state.status,
      mode: state.mode,
      totalMs: state.totalMs,
    }

    const wasManual = manualActionRef.current
    manualActionRef.current = false

    const completed =
      !wasManual &&
      previous.status === 'running' &&
      state.status === 'idle' &&
      previous.mode !== state.mode

    if (!completed) return

    onSessionEndRef.current?.(previous.mode, previous.totalMs)
    if (autoStart) {
      setState((current) => startTimer(current, Date.now()))
    }
  }, [state.status, state.mode, state.totalMs, autoStart])

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
    manualActionRef.current = true
    setState((current) => resetTimer(current, durations))
  }, [durations])

  const skip = useCallback(() => {
    manualActionRef.current = true
    setState((current) =>
      skipSession(current, durations, longBreakInterval),
    )
  }, [durations, longBreakInterval])

  const setMode = useCallback(
    (mode: Mode) => {
      manualActionRef.current = true
      setState((current) => switchMode(current, mode, durations))
    },
    [durations],
  )

  const progress =
    state.totalMs > 0
      ? Math.min(1, Math.max(0, 1 - state.remainingMs / state.totalMs))
      : 0

  return {
    ...state,
    remainingSeconds,
    progress,
    start,
    pause,
    toggle,
    reset,
    skip,
    setMode,
  }
}
