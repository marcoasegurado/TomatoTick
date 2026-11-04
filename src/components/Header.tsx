interface HeaderProps {
  onOpenSettings: () => void
  onOpenTasks: () => void
  onOpenStats: () => void
  tasksOpen: boolean
}

function Header({
  onOpenSettings,
  onOpenTasks,
  onOpenStats,
  tasksOpen,
}: HeaderProps) {
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
          aria-label="Open tasks"
          aria-expanded={tasksOpen}
          aria-controls="tasks-sidebar"
        >
          <span aria-hidden="true">☰</span>{' '}
          <span className="header__action-label">Tasks</span>
        </button>
        <button
          type="button"
          className="header__action"
          onClick={onOpenStats}
          aria-label="Open stats"
        >
          <span aria-hidden="true">📊</span>{' '}
          <span className="header__action-label">Stats</span>
        </button>
        <button
          type="button"
          className="header__action"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <span aria-hidden="true">⚙</span>{' '}
          <span className="header__action-label">Settings</span>
        </button>
      </div>
    </header>
  )
}

export default Header
