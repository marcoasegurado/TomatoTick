import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ActivityHeatmap from './ActivityHeatmap'
import type { FocusSession } from '../utils/sessions'

const NOW = new Date(2026, 4, 20, 12, 0, 0).getTime()

let nextId = 0

function session(daysAgo: number, minutes: number): FocusSession {
  nextId += 1
  const date = new Date(NOW)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(12, 0, 0, 0)

  return {
    id: `s${nextId}`,
    completedAt: date.getTime(),
    durationMs: minutes * 60_000,
    taskId: null,
    taskTitle: null,
  }
}

describe('ActivityHeatmap', () => {
  it('exposes active days as a text alternative', () => {
    render(
      <ActivityHeatmap sessions={[session(0, 25), session(3, 50)]} now={NOW} />,
    )

    expect(
      screen.getByRole('img', { name: /2 active days/i }),
    ).toBeInTheDocument()

    const days = screen.getAllByRole('listitem')
    expect(days).toHaveLength(2)
    // Oldest first, matching the calendar layout.
    expect(days[0]).toHaveTextContent('50 min')
    expect(days[0]).toHaveTextContent('2026')
    expect(days[1]).toHaveTextContent('25 min')
  })

  it('announces when there is no activity', () => {
    render(<ActivityHeatmap sessions={[]} now={NOW} />)

    expect(
      screen.getByRole('img', { name: /0 active days/i }),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
