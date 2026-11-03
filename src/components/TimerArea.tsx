import { DEFAULT_DURATIONS, formatTime } from '../utils/formatTime'

function TimerArea() {
  return (
    <section className="timer-area" aria-label="Pomodoro timer">
      <div className="timer-card">
        <p className="timer-card__mode">Focus</p>
        <p className="timer-card__time">{formatTime(DEFAULT_DURATIONS.focus)}</p>
        <p className="timer-card__hint">Timer controls arrive in Phase 2.</p>
      </div>
    </section>
  )
}

export default TimerArea
