import { fireEvent, render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { SessionsProvider } from '../context/SessionsContext'
import { SettingsProvider } from '../context/SettingsContext'
import { TasksProvider } from '../context/TasksContext'

expect.extend(toHaveNoViolations)

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

describe('accessibility checks', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.mode = 'focus'
  })

  it('has no violations on the timer view', async () => {
    const { container } = renderApp()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations in the stats dialog', async () => {
    const { container } = renderApp()

    fireEvent.click(screen.getByRole('button', { name: /stats/i }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations in the settings dialog', async () => {
    const { container } = renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations in the mobile task drawer', async () => {
    const restoreViewport = mockMobileViewport()
    try {
      const { container } = renderApp()

      fireEvent.click(screen.getByRole('button', { name: 'Open tasks' }))
      expect(screen.getByRole('button', { name: 'Close tasks' })).toBeVisible()
      expect(await axe(container)).toHaveNoViolations()
    } finally {
      restoreViewport()
    }
  })
})
