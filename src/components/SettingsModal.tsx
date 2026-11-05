import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { X } from 'lucide-react'
import { useSessions } from '../context/SessionsContext'
import { useSettings } from '../context/SettingsContext'
import { useTasks } from '../context/TasksContext'
import { useDialog } from '../hooks/useDialog'
import {
  MAX_BACKUP_BYTES,
  createBackup,
  parseBackup,
  serializeBackup,
  type Backup,
} from '../utils/backup'
import {
  playAlertSound,
  getNotificationSupport,
  requestNotificationPermission,
  showTestNotification,
  type NotificationSupport,
} from '../utils/alerts'
import {
  SETTINGS_LIMITS,
  SOUND_OPTIONS,
  validateSettings,
  type AlertSound,
  type Settings,
  type SettingsErrors,
  type SettingsField,
} from '../utils/settings'
import {
  THEME_OPTIONS,
  applyTheme,
  getStoredTheme,
  persistTheme,
  type Theme,
} from '../utils/theme'

interface SettingsModalProps {
  onClose: () => void
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
    reader.readAsText(file)
  })
}

function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings()
  const { tasks, activeTaskId, replaceTaskState } = useTasks()
  const { sessions, replaceSessions } = useSessions()
  const [draft, setDraft] = useState<Settings>(settings)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [theme, setTheme] = useState<Theme>(
    () => getStoredTheme() ?? 'system',
  )
  const [permission, setPermission] = useState<NotificationSupport>(() =>
    getNotificationSupport(),
  )
  const [testingNotification, setTestingNotification] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<{
    kind: 'status' | 'error'
    text: string
  } | null>(null)
  const [pendingImport, setPendingImport] = useState<{
    backup: Backup
    warnings: string[]
  } | null>(null)
  const [dataMessage, setDataMessage] = useState<{
    kind: 'status' | 'error'
    text: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialog = useDialog({ open: true, onClose })

  const setField = <Key extends keyof Settings>(
    key: Key,
    value: Settings[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const validateField = (field: SettingsField) => {
    const nextErrors = validateSettings(draft)
    setErrors((current) => {
      const next: SettingsErrors = { ...current }
      if (nextErrors[field]) {
        next[field] = nextErrors[field]
      } else {
        delete next[field]
      }
      return next
    })
  }

  const handleTheme = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
    persistTheme(next)
  }

  const handleNotifications = (enabled: boolean) => {
    setField('notifications', enabled)
    setNotificationStatus(null)
    if (enabled && permission !== 'granted') {
      void requestNotificationPermission().then((result) => {
        setPermission(result)
        if (result !== 'granted') {
          setDraft((current) => ({ ...current, notifications: false }))
        }
      })
    }
  }

  const handleTestNotification = async () => {
    setTestingNotification(true)
    setNotificationStatus(null)
    try {
      const result = await requestNotificationPermission()
      setPermission(result)
      if (result === 'unsupported') {
        setNotificationStatus({
          kind: 'error',
          text: 'This browser does not support notifications.',
        })
        return
      }
      if (result === 'denied') {
        setNotificationStatus({
          kind: 'error',
          text: 'Notifications are blocked in your browser settings.',
        })
        return
      }

      const sent = await showTestNotification()
      setNotificationStatus(
        sent
          ? { kind: 'status', text: 'Test notification sent.' }
          : {
              kind: 'error',
              text: 'Could not send the test notification.',
            },
      )
    } catch {
      setNotificationStatus({
        kind: 'error',
        text: 'Could not send the test notification.',
      })
    } finally {
      setTestingNotification(false)
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

  const handleExport = () => {
    try {
      const backup = createBackup(
        settings,
        { tasks, activeTaskId },
        sessions,
      )
      const blob = new Blob([serializeBackup(backup)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tomatotick-backup-${backup.exportedAt.slice(0, 10)}.json`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setDataMessage({ kind: 'status', text: 'Backup downloaded.' })
    } catch {
      setDataMessage({
        kind: 'error',
        text: 'Could not create the backup file.',
      })
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.size > MAX_BACKUP_BYTES) {
      setPendingImport(null)
      setDataMessage({
        kind: 'error',
        text: 'This backup file is too large (5 MB maximum).',
      })
      return
    }

    try {
      const raw = await readFileText(file)
      const result = parseBackup(raw)
      if (!result.ok) {
        setPendingImport(null)
        setDataMessage({ kind: 'error', text: result.error })
        return
      }
      setDataMessage(null)
      setPendingImport({ backup: result.backup, warnings: result.warnings })
    } catch {
      setPendingImport(null)
      setDataMessage({ kind: 'error', text: 'Could not read that file.' })
    }
  }

  const handleConfirmImport = () => {
    if (!pendingImport) return
    const { backup } = pendingImport
    const taskCount = backup.data.tasks.tasks.length
    const sessionCount = backup.data.sessions.length

    updateSettings(backup.data.settings)
    replaceTaskState(backup.data.tasks)
    replaceSessions(backup.data.sessions)
    setDraft(backup.data.settings)
    setPendingImport(null)
    setDataMessage({
      kind: 'status',
      text: `Imported ${taskCount} ${
        taskCount === 1 ? 'task' : 'tasks'
      } and ${sessionCount} ${
        sessionCount === 1 ? 'session' : 'sessions'
      }.`,
    })
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
        ref={dialog.ref}
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
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="settings-form" onSubmit={handleSubmit} noValidate>
          <div className="settings-form__body">
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
                  onBlur={() => validateField('focus')}
                />
                <NumberSetting
                  id="settings-short-break"
                  label="Short break (minutes)"
                  value={draft.shortBreak}
                  min={SETTINGS_LIMITS.shortBreak.min}
                  max={SETTINGS_LIMITS.shortBreak.max}
                  error={errors.shortBreak}
                  onChange={(value) => setField('shortBreak', value)}
                  onBlur={() => validateField('shortBreak')}
                />
                <NumberSetting
                  id="settings-long-break"
                  label="Long break (minutes)"
                  value={draft.longBreak}
                  min={SETTINGS_LIMITS.longBreak.min}
                  max={SETTINGS_LIMITS.longBreak.max}
                  error={errors.longBreak}
                  onChange={(value) => setField('longBreak', value)}
                  onBlur={() => validateField('longBreak')}
                />
                <NumberSetting
                  id="settings-interval"
                  label="Long break after (sessions)"
                  value={draft.longBreakInterval}
                  min={SETTINGS_LIMITS.longBreakInterval.min}
                  max={SETTINGS_LIMITS.longBreakInterval.max}
                  error={errors.longBreakInterval}
                  onChange={(value) => setField('longBreakInterval', value)}
                  onBlur={() => validateField('longBreakInterval')}
                />
              </div>
            </fieldset>

            <fieldset className="settings-group">
              <legend className="settings-group__legend">
                Keyboard shortcuts
              </legend>
              <div className="shortcuts">
                <div className="shortcuts__row">
                  <kbd>Space</kbd>
                  <span>Start or pause the timer</span>
                </div>
                <div className="shortcuts__row">
                  <kbd>R</kbd>
                  <span>Reset the current session</span>
                </div>
                <div className="shortcuts__row">
                  <kbd>S</kbd>
                  <span>Skip to the next session</span>
                </div>
              </div>
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

              <label className="settings-toggle">
                <span className="settings-toggle__text">
                  <span className="settings-toggle__title">
                    Auto-start the next session
                  </span>
                  <span className="settings-toggle__hint">
                    Begin breaks and focus sessions automatically.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="settings-toggle__input"
                  checked={draft.autoStart}
                  onChange={(event) =>
                    setField('autoStart', event.target.checked)
                  }
                />
                <span className="settings-toggle__switch" aria-hidden="true" />
              </label>

              <label className="settings-toggle">
                <span className="settings-toggle__text">
                  <span className="settings-toggle__title">
                    Browser notifications
                  </span>
                  <span className="settings-toggle__hint">
                    {notificationNote}
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="settings-toggle__input"
                  checked={draft.notifications}
                  disabled={permission === 'unsupported'}
                  onChange={(event) =>
                    handleNotifications(event.target.checked)
                  }
                />
                <span className="settings-toggle__switch" aria-hidden="true" />
              </label>

              <div className="settings-data-actions">
                <button
                  type="button"
                  className="button button--ghost button--small"
                  disabled={
                    testingNotification || permission === 'unsupported'
                  }
                  onClick={() => void handleTestNotification()}
                >
                  {testingNotification
                    ? 'Sending test notification...'
                    : 'Send test notification'}
                </button>
              </div>
              {notificationStatus && (
                <p
                  className={
                    notificationStatus.kind === 'error'
                      ? 'settings-error'
                      : 'settings-hint'
                  }
                  role={notificationStatus.kind === 'error' ? 'alert' : 'status'}
                >
                  {notificationStatus.text}
                </p>
              )}
            </fieldset>

            <fieldset className="settings-group">
              <legend className="settings-group__legend">Appearance</legend>
              <div
                className="theme-grid"
                role="radiogroup"
                aria-label="Theme"
              >
                {THEME_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={
                      theme === option.id
                        ? 'theme-option theme-option--active'
                        : 'theme-option'
                    }
                  >
                    <input
                      type="radio"
                      className="theme-option__input"
                      name="settings-theme"
                      value={option.id}
                      checked={theme === option.id}
                      onChange={() => handleTheme(option.id)}
                    />
                    <span
                      className={`theme-option__swatch theme-option__swatch--${option.id}`}
                      aria-hidden="true"
                    />
                    <span className="theme-option__label">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="settings-hint">
                Saved on this device. System follows your device appearance.
              </p>
            </fieldset>

            <fieldset className="settings-group">
              <legend className="settings-group__legend">Data</legend>
              <p className="settings-hint">
                Back up your settings, tasks, and session history, or restore a
                previous backup.
              </p>

              <div className="settings-data-actions">
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={handleExport}
                >
                  Export data
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import data
                </button>
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept=".json,application/json"
                  aria-label="Choose backup file"
                  tabIndex={-1}
                  onChange={handleFileChange}
                />
              </div>

              {pendingImport && (
                <div className="settings-import">
                  <p>
                    Replace current data with the backup from{' '}
                    {new Date(
                      pendingImport.backup.exportedAt,
                    ).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    ? {pendingImport.backup.data.tasks.tasks.length}{' '}
                    {pendingImport.backup.data.tasks.tasks.length === 1
                      ? 'task'
                      : 'tasks'}{' '}
                    · {pendingImport.backup.data.sessions.length}{' '}
                    {pendingImport.backup.data.sessions.length === 1
                      ? 'session'
                      : 'sessions'}
                    .
                  </p>
                  {pendingImport.warnings.length > 0 && (
                    <p className="settings-warning">
                      {pendingImport.warnings.join(' ')}
                    </p>
                  )}
                  <div className="settings-data-actions">
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => setPendingImport(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button button--primary button--small"
                      onClick={handleConfirmImport}
                    >
                      Replace data
                    </button>
                  </div>
                </div>
              )}

              {dataMessage && (
                <p
                  className={
                    dataMessage.kind === 'error'
                      ? 'settings-error'
                      : 'settings-hint'
                  }
                  role={dataMessage.kind === 'error' ? 'alert' : 'status'}
                >
                  {dataMessage.text}
                </p>
              )}
            </fieldset>
          </div>

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
  onBlur: () => void
}

function NumberSetting({
  id,
  label,
  value,
  min,
  max,
  error,
  onChange,
  onBlur,
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
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => onChange(Number(event.target.value))}
        onBlur={onBlur}
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
