interface HeaderProps {
  onOpenSettings: () => void
  onOpenTasks: () => void
}

function Header({ onOpenSettings, onOpenTasks }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo" aria-hidden="true">
          🍅
        </span>
        <div>
          <h1 className="header__title">TomatoTick</h1>
          <p className="header__tagline">
            Stay focused, one tomato at a time.
          </p>
        </div>
      </div>

      <div className="header__actions">
        <button
          type="button"
          className="header__action header__tasks"
          onClick={onOpenTasks}
        >
          <span aria-hidden="true">☰</span> Tasks
        </button>
        <button
          type="button"
          className="header__action"
          onClick={onOpenSettings}
        >
          <span aria-hidden="true">⚙</span> Settings
        </button>
      </div>
    </header>
  )
}

export default Header
