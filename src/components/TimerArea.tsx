import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSessions } from '../context/SessionsContext'
import { useSettings } from '../context/SettingsContext'
import { useTasks } from '../context/TasksContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useTimer } from '../hooks/useTimer'
import {
  playAlertSound,
  showSessionNotification,
} from '../utils/alerts'
import { formatTime } from '../utils/formatTime'
import { settingsToDurations } from '../utils/settings'
import { MODE_LABELS, type Mode } from '../utils/timer'
import CurrentTask from './CurrentTask'
import CycleCounter from './CycleCounter'
import ModeSwitcher from './ModeSwitcher'
import ProgressRing from './ProgressRing'
import TimerControls from './TimerControls'

const STATUS_LABELS = {
  idle: 'Ready',
  running: 'In progress',
  paused: 'Paused',
} as const

function TimerArea() {
  const { settings } = useSettings()
  const { activeTask, activeTaskId, creditFocusSession } = useTasks()
  const { recordFocusSession } = useSessions()
  const durations = useMemo(
    () => settingsToDurations(settings),
    [settings.focus, settings.shortBreak, settings.longBreak],
  )

  const handleSessionEnd = useCallback(
    (completedMode: Mode, completedTotalMs: number) => {
      if (completedMode === 'focus') {
        recordFocusSession({
          completedAt: Date.now(),
          durationMs: completedTotalMs,
          taskId: activeTaskId,
          taskTitle: activeTask?.title ?? null,
        })
        creditFocusSession(completedTotalMs / 60_000)
      }
      playAlertSound(settings.sound, settings.volume)
      if (settings.notifications) {
        showSessionNotification(completedMode)
      }
    },
    [
      settings.sound,
      settings.volume,
      settings.notifications,
      creditFocusSession,
      recordFocusSession,
      activeTaskId,
      activeTask,
    ],
  )

  const timer = useTimer({
    durations,
    longBreakInterval: settings.longBreakInterval,
    autoStart: settings.autoStart,
    onSessionEnd: handleSessionEnd,
  })

  const modeLabel = MODE_LABELS[timer.mode]

  useKeyboardShortcuts({
    onToggle: timer.toggle,
    onReset: timer.reset,
    onSkip: timer.skip,
  })

  const liveMessage =
    timer.status === 'running'
      ? `${modeLabel} timer running`
      : timer.status === 'paused'
        ? `${modeLabel} timer paused`
        : `${modeLabel} session ready`

  // Drive the mode-based color palette from the current session.
  useEffect(() => {
    document.documentElement.dataset.mode = timer.mode
  }, [timer.mode])

  // Briefly celebrate a session that ran to completion (UI only).
  const [celebrate, setCelebrate] = useState(false)
  const previousSession = useRef({ status: timer.status, mode: timer.mode })
  useEffect(() => {
    const previous = previousSession.current
    previousSession.current = { status: timer.status, mode: timer.mode }
    const completed =
      previous.status === 'running' &&
      timer.status === 'idle' &&
      previous.mode !== timer.mode
    if (!completed) return
    setCelebrate(true)
    const id = window.setTimeout(() => setCelebrate(false), 900)
    return () => window.clearTimeout(id)
  }, [timer.status, timer.mode])

  return (
    <section className="timer-area" aria-label="Pomodoro timer">
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>
      <div className="timer-card">
        <ModeSwitcher mode={timer.mode} onChange={timer.setMode} />

        <ProgressRing
          progress={timer.progress}
          celebrate={celebrate}
          label={`${modeLabel} timer, ${formatTime(timer.remainingSeconds)} remaining`}
        >
          <p className="timer-card__mode">{modeLabel}</p>
          <p className="timer-card__time">
            {formatTime(timer.remainingSeconds)}
          </p>
          <p className="timer-card__status">
            {STATUS_LABELS[timer.status]}
          </p>
        </ProgressRing>

        <CurrentTask />

        <TimerControls
          status={timer.status}
          onToggle={timer.toggle}
          onReset={timer.reset}
          onSkip={timer.skip}
        />

        <CycleCounter
          count={timer.focusCountInCycle}
          interval={settings.longBreakInterval}
        />
      </div>
    </section>
  )
}

export default TimerArea
