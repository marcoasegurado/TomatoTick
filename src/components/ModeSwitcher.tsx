import { MODES, MODE_LABELS, type Mode } from '../utils/timer'

interface ModeSwitcherProps {
  mode: Mode
  onChange: (mode: Mode) => void
}

function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="mode-switcher" role="group" aria-label="Timer mode">
      {MODES.map((option) => (
        <button
          key={option}
          type="button"
          className="mode-switcher__button"
          aria-pressed={mode === option}
          onClick={() => onChange(option)}
        >
          {MODE_LABELS[option]}
        </button>
      ))}
    </div>
  )
}

export default ModeSwitcher
