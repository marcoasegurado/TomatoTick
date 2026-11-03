import { useTimer } from '../hooks/useTimer'
import { formatTime } from '../utils/formatTime'
import { LONG_BREAK_INTERVAL, MODE_LABELS } from '../utils/timer'
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
  const timer = useTimer()
  const modeLabel = MODE_LABELS[timer.mode]

  return (
    <section className="timer-area" aria-label="Pomodoro timer">
      <div className="timer-card">
        <ModeSwitcher mode={timer.mode} onChange={timer.setMode} />

        <ProgressRing
          progress={timer.progress}
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

        <TimerControls
          status={timer.status}
          onToggle={timer.toggle}
          onReset={timer.reset}
          onSkip={timer.skip}
        />

        <CycleCounter
          count={timer.focusCountInCycle}
          interval={LONG_BREAK_INTERVAL}
        />
      </div>
    </section>
  )
}

export default TimerArea
