import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'
import { SessionsProvider } from './context/SessionsContext'
import { TasksProvider } from './context/TasksContext'
import { createBackup, serializeBackup } from './utils/backup'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './utils/settings'
import { SESSIONS_STORAGE_KEY } from './utils/sessions'
import { TASKS_STORAGE_KEY } from './utils/tasks'
import { TIMER_STORAGE_KEY } from './utils/timer'

function renderApp() {
  return render(
    <SettingsProvider>
      <TasksProvider>
        <SessionsProvider>
          <App />
        </SessionsProvider>
      </TasksProvider>
    </SettingsProvider>,
  )
}

/** Pretend the viewport is narrow enough for the drawer layout. */
function mockMobileViewport() {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.mode = 'focus'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the timer with the default focus duration', () => {
    renderApp()
    expect(screen.getByText('TomatoTick')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start timer' })).toBeInTheDocument()
  })

  it('opens settings and blocks invalid durations', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const focusInput = screen.getByLabelText('Focus (minutes)')
    fireEvent.change(focusInput, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    expect(
      screen.getByText(/focus must be a whole number between 1 and 120/i),
    ).toBeInTheDocument()
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    )
    expect(saved.focus).toBe(25)
  })

  it('saves valid settings and applies them to the idle timer', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    const focusInput = screen.getByLabelText('Focus (minutes)')
    fireEvent.change(focusInput, { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('30:00')).toBeInTheDocument()
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    )
    expect(saved.focus).toBe(30)
    expect(localStorage.getItem(TIMER_STORAGE_KEY)).not.toBeNull()
  })

  it('adds a task and makes it the current focus', () => {
    renderApp()

    fireEvent.change(screen.getByLabelText('New task'), {
      target: { value: 'Write tests' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getAllByText('Write tests').length).toBeGreaterThan(0)
    expect(screen.getByText(/focusing on/i)).toBeInTheDocument()

    const saved = JSON.parse(
      localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}',
    )
    expect(saved.activeTaskId).toBeTruthy()
    expect(saved.tasks[0].title).toBe('Write tests')
  })

  it('starts and pauses with the Space shortcut, ignoring inputs', () => {
    renderApp()

    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    expect(
      screen.getByRole('button', { name: 'Pause timer' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }))
    expect(
      screen.getByRole('button', { name: 'Start timer' }),
    ).toBeInTheDocument()

    fireEvent.keyDown(screen.getByLabelText('New task'), {
      code: 'Space',
      key: ' ',
    })
    expect(
      screen.getByRole('button', { name: 'Start timer' }),
    ).toBeInTheDocument()
  })

  it('opens stats with an empty state when there are no sessions', async () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /stats/i }))
    expect(await screen.findByText('No focus sessions yet')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Sessions today')).toBeInTheDocument()
  })

  it('moves focus into settings and restores it on Escape', () => {
    renderApp()

    const trigger = screen.getByRole('button', { name: 'Open settings' })
    trigger.focus()
    fireEvent.click(trigger)

    expect(
      screen.getByRole('button', { name: 'Close settings' }),
    ).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps Tab focus inside the settings dialog', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    const close = screen.getByRole('button', { name: 'Close settings' })
    const save = screen.getByRole('button', { name: /save settings/i })

    save.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(close).toHaveFocus()

    close.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(save).toHaveFocus()
  })

  it('uses the task sidebar as a modal drawer on mobile', () => {
    const restoreViewport = mockMobileViewport()
    try {
      renderApp()

      const trigger = screen.getByRole('button', { name: 'Open tasks' })
      const sidebar = document.getElementById('tasks-sidebar')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(sidebar).toHaveAttribute('inert')

      trigger.focus()
      fireEvent.click(trigger)

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(sidebar).not.toHaveAttribute('inert')
      expect(
        screen.getByRole('button', { name: 'Close tasks' }),
      ).toHaveFocus()

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(sidebar).toHaveAttribute('inert')
      expect(trigger).toHaveFocus()
    } finally {
      restoreViewport()
    }
  })

  it('imports a backup after confirmation', async () => {
    const now = Date.now()
    const backup = createBackup(
      { ...DEFAULT_SETTINGS, focus: 30 },
      {
        tasks: [
          {
            id: 'imported-1',
            title: 'Imported task',
            completed: false,
            createdAt: now,
            focusSessions: 1,
            focusMinutes: 25,
          },
        ],
        activeTaskId: 'imported-1',
      },
      [
        {
          id: 'session-1',
          completedAt: now,
          durationMs: 25 * 60_000,
          taskId: 'imported-1',
          taskTitle: 'Imported task',
        },
      ],
      now,
    )
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    const file = new File([serializeBackup(backup)], 'backup.json', {
      type: 'application/json',
    })
    fireEvent.change(screen.getByLabelText('Choose backup file'), {
      target: { files: [file] },
    })

    expect(
      await screen.findByText(/replace current data/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Replace data' }))

    expect(
      await screen.findByText(/imported 1 task and 1 session/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Imported task').length).toBeGreaterThan(0)
    expect(await screen.findByText('30:00')).toBeInTheDocument()

    const savedTasks = JSON.parse(
      localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}',
    )
    expect(savedTasks.activeTaskId).toBe('imported-1')
    expect(savedTasks.tasks[0].title).toBe('Imported task')

    const savedSessions = JSON.parse(
      localStorage.getItem(SESSIONS_STORAGE_KEY) ?? '[]',
    )
    expect(savedSessions).toHaveLength(1)
  })

  it('records a completed focus session and credits the active task', () => {
    const now = new Date(2026, 4, 20, 12, 0, 0).getTime()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify({
        tasks: [
          {
            id: 't1',
            title: 'Write tests',
            completed: false,
            createdAt: now,
            focusSessions: 0,
            focusMinutes: 0,
          },
        ],
        activeTaskId: 't1',
      }),
    )
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify({
        mode: 'focus',
        status: 'running',
        endTime: now + 1000,
        remainingMs: 1000,
        totalMs: 60_000,
        focusCountInCycle: 0,
      }),
    )

    renderApp()

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    const tasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) ?? '{}')
    expect(tasks.tasks[0].focusSessions).toBe(1)
    expect(tasks.tasks[0].focusMinutes).toBe(1)

    const sessions = JSON.parse(
      localStorage.getItem(SESSIONS_STORAGE_KEY) ?? '[]',
    )
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      taskId: 't1',
      taskTitle: 'Write tests',
      durationMs: 60_000,
    })
  })
})
