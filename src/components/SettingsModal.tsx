import { useEffect, useState, type FormEvent } from 'react'
import { useSettings } from '../context/SettingsContext'
import {
  playAlertSound,
  getNotificationSupport,
  requestNotificationPermission,
  type NotificationSupport,
} from '../utils/alerts'
import {
  SETTINGS_LIMITS,
  SOUND_OPTIONS,
  validateSettings,
  type AlertSound,
  type Settings,
  type SettingsErrors,
} from '../utils/settings'

interface SettingsModalProps {
  onClose: () => void
}

function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings()
  const [draft, setDraft] = useState<Settings>(settings)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [permission, setPermission] = useState<NotificationSupport>(() =>
    getNotificationSupport(),
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const setField = <Key extends keyof Settings>(
    key: Key,
    value: Settings[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const handleNotifications = (enabled: boolean) => {
    setField('notifications', enabled)
    if (enabled && permission !== 'granted') {
      void requestNotificationPermission().then((result) => {
        setPermission(result)
        if (result !== 'granted') {
          setDraft((current) => ({ ...current, notifications: false }))
        }
      })
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validateSettings(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    updateSettings(draft)
    onClose()
  }

  const notificationNote = (() => {
    if (permission === 'unsupported') {
      return 'This browser does not support notifications.'
    }
    if (permission === 'denied') {
      return 'Notifications are blocked in your browser settings.'
    }
    if (permission === 'granted') {
      return 'Browser notifications are enabled.'
    }
    return 'You will be asked for permission when you enable notifications.'
  })()

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal__header">
          <h2 id="settings-title" className="modal__title">
            Settings
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close settings"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="settings-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="settings-group">
            <legend className="settings-group__legend">Timer durations</legend>

            <div className="settings-grid">
              <NumberSetting
                id="settings-focus"
                label="Focus (minutes)"
                value={draft.focus}
                min={SETTINGS_LIMITS.focus.min}
                max={SETTINGS_LIMITS.focus.max}
                error={errors.focus}
                onChange={(value) => setField('focus', value)}
              />
              <NumberSetting
                id="settings-short-break"
                label="Short break (minutes)"
                value={draft.shortBreak}
                min={SETTINGS_LIMITS.shortBreak.min}
                max={SETTINGS_LIMITS.shortBreak.max}
                error={errors.shortBreak}
                onChange={(value) => setField('shortBreak', value)}
              />
              <NumberSetting
                id="settings-long-break"
                label="Long break (minutes)"
                value={draft.longBreak}
                min={SETTINGS_LIMITS.longBreak.min}
                max={SETTINGS_LIMITS.longBreak.max}
                error={errors.longBreak}
                onChange={(value) => setField('longBreak', value)}
              />
              <NumberSetting
                id="settings-interval"
                label="Long break after (sessions)"
                value={draft.longBreakInterval}
                min={SETTINGS_LIMITS.longBreakInterval.min}
                max={SETTINGS_LIMITS.longBreakInterval.max}
                error={errors.longBreakInterval}
                onChange={(value) => setField('longBreakInterval', value)}
              />
            </div>
          </fieldset>

          <fieldset className="settings-group">
            <legend className="settings-group__legend">Keyboard shortcuts</legend>
            <dl className="shortcuts">
              <div className="shortcuts__row">
                <dt>
                  <kbd>Space</kbd>
                </dt>
                <dd>Start or pause the timer</dd>
              </div>
              <div className="shortcuts__row">
                <dt>
                  <kbd>R</kbd>
                </dt>
                <dd>Reset the current session</dd>
              </div>
              <div className="shortcuts__row">
                <dt>
                  <kbd>S</kbd>
                </dt>
                <dd>Skip to the next session</dd>
              </div>
            </dl>
            <p className="settings-hint">
              Shortcuts are ignored while typing or when a dialog is open.
            </p>
          </fieldset>

          <fieldset className="settings-group">
            <legend className="settings-group__legend">Alerts</legend>

            <div className="settings-row">
              <label htmlFor="settings-sound" className="settings-label">
                Alert sound
              </label>
              <div className="settings-inline">
                <select
                  id="settings-sound"
                  className="settings-select"
                  value={draft.sound}
                  onChange={(event) =>
                    setField('sound', event.target.value as AlertSound)
                  }
                >
                  {SOUND_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => playAlertSound(draft.sound, draft.volume)}
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="settings-row">
              <label htmlFor="settings-volume" className="settings-label">
                Volume
              </label>
              <div className="settings-inline settings-inline--stretch">
                <input
                  id="settings-volume"
                  className="settings-range"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(draft.volume * 100)}
                  onChange={(event) =>
                    setField('volume', Number(event.target.value) / 100)
                  }
                />
                <output className="settings-output">
                  {Math.round(draft.volume * 100)}%
                </output>
              </div>
            </div>
            {errors.volume && (
              <p className="settings-error">{errors.volume}</p>
            )}

            <label className="settings-check">
              <input
                type="checkbox"
                checked={draft.autoStart}
                onChange={(event) =>
                  setField('autoStart', event.target.checked)
                }
              />
              <span>
                Auto-start the next session
                <span className="settings-check__hint">
                  Begin breaks and focus sessions automatically.
                </span>
              </span>
            </label>

            <label className="settings-check">
              <input
                type="checkbox"
                checked={draft.notifications}
                disabled={permission === 'unsupported'}
                onChange={(event) =>
                  handleNotifications(event.target.checked)
                }
              />
              <span>
                Browser notifications
                <span className="settings-check__hint">
                  {notificationNote}
                </span>
              </span>
            </label>
          </fieldset>

          <div className="modal__footer">
            <button
              type="button"
              className="button button--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="button button--primary">
              Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface NumberSettingProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  error?: string
  onChange: (value: number) => void
}

function NumberSetting({
  id,
  label,
  value,
  min,
  max,
  error,
  onChange,
}: NumberSettingProps) {
  return (
    <div className="settings-field">
      <label htmlFor={id} className="settings-label">
        {label}
      </label>
      <input
        id={id}
        className="settings-input"
        type="number"
        min={min}
        max={max}
        step={1}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="settings-error">
          {error}
        </p>
      )}
    </div>
  )
}

export default SettingsModal
