import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { SettingsProvider } from './context/SettingsContext'
import { SETTINGS_STORAGE_KEY } from './utils/settings'
import { TIMER_STORAGE_KEY } from './utils/timer'

function renderApp() {
  return render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
  )
}

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.mode = 'focus'
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
})
