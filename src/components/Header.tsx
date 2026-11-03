interface HeaderProps {
  onOpenSettings: () => void
}

function Header({ onOpenSettings }: HeaderProps) {
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

      <button
        type="button"
        className="header__action"
        onClick={onOpenSettings}
      >
        <span aria-hidden="true">⚙</span> Settings
      </button>
    </header>
  )
}

export default Header
