import type { ReactNode } from 'react'

const SIZE = 320
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface ProgressRingProps {
  /** Elapsed fraction of the session, from 0 to 1. */
  progress: number
  label: string
  children: ReactNode
}

function ProgressRing({ progress, label, children }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, progress))

  return (
    <div className="timer-display">
      <svg
        className="progress-ring"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={label}
      >
        <circle
          className="progress-ring__track"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
        />
        <circle
          className="progress-ring__value"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      </svg>
      <div className="timer-display__content">{children}</div>
    </div>
  )
}

export default ProgressRing
