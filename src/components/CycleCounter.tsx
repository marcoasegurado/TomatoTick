interface CycleCounterProps {
  count: number
  interval: number
}

function CycleCounter({ count, interval }: CycleCounterProps) {
  const filled = Math.min(count, interval)

  return (
    <div
      className="cycle-counter"
      aria-label={`${filled} of ${interval} focus sessions completed in this cycle`}
    >
      <div className="cycle-counter__dots" aria-hidden="true">
        {Array.from({ length: interval }, (_, index) => (
          <span
            key={index}
            className={
              index < filled
                ? 'cycle-counter__dot cycle-counter__dot--filled'
                : 'cycle-counter__dot'
            }
          />
        ))}
      </div>
      <p className="cycle-counter__label">
        {filled} of {interval} focus sessions
      </p>
    </div>
  )
}

export default CycleCounter
