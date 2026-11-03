import type { TimerStatus } from '../utils/timer'

interface TimerControlsProps {
  status: TimerStatus
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

function TimerControls({
  status,
  onToggle,
  onReset,
  onSkip,
}: TimerControlsProps) {
  const isRunning = status === 'running'

  return (
    <div className="timer-controls">
      <button
        type="button"
        className="button button--ghost"
        onClick={onReset}
      >
        <span aria-hidden="true">↺</span> Reset
      </button>

      <button
        type="button"
        className="button button--primary"
        onClick={onToggle}
        aria-label={isRunning ? 'Pause timer' : 'Start timer'}
      >
        <span aria-hidden="true">{isRunning ? '❚❚' : '▶'}</span>{' '}
        {isRunning ? 'Pause' : 'Start'}
      </button>

      <button
        type="button"
        className="button button--ghost"
        onClick={onSkip}
      >
        Skip <span aria-hidden="true">⏭</span>
      </button>
    </div>
  )
}

export default TimerControls
