import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'
import { SessionsProvider } from './context/SessionsContext'
import { TasksProvider } from './context/TasksContext'
import { SETTINGS_STORAGE_KEY } from './utils/settings'
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

  it('opens stats with an empty state when there are no sessions', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: /stats/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('No focus sessions yet')).toBeInTheDocument()
    expect(screen.getByText('Sessions today')).toBeInTheDocument()
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
