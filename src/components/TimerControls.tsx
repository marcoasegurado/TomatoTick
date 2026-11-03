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
        aria-keyshortcuts="R"
        title="Reset the current session (R)"
      >
        <span aria-hidden="true">↺</span> Reset
      </button>

      <button
        type="button"
        className="button button--primary"
        onClick={onToggle}
        aria-label={isRunning ? 'Pause timer' : 'Start timer'}
        aria-keyshortcuts="Space"
        title={isRunning ? 'Pause timer (Space)' : 'Start timer (Space)'}
      >
        <span aria-hidden="true">{isRunning ? '❚❚' : '▶'}</span>{' '}
        {isRunning ? 'Pause' : 'Start'}
      </button>

      <button
        type="button"
        className="button button--ghost"
        onClick={onSkip}
        aria-keyshortcuts="S"
        title="Skip to the next session (S)"
      >
        Skip <span aria-hidden="true">⏭</span>
      </button>
    </div>
  )
}

export default TimerControls
