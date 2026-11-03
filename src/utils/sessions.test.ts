import { describe, expect, it } from 'vitest'
import {
  HEATMAP_WEEKS,
  addSession,
  dayKey,
  formatMinutes,
  getDailyActivity,
  getHeatmap,
  getStreaks,
  getSummary,
  getTaskBreakdown,
  parseSessions,
  sessionMinutes,
  summarize,
  type FocusSession,
} from './sessions'

const NOW = new Date(2026, 4, 20, 12, 0, 0).getTime()

function at(daysAgo: number, hour = 12): number {
  const date = new Date(NOW)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.getTime()
}

let nextId = 0

function session(
  daysAgo: number,
  minutes: number,
  taskId: string | null = null,
  taskTitle: string | null = null,
): FocusSession {
  nextId += 1
  return {
    id: `s${nextId}`,
    completedAt: at(daysAgo),
    durationMs: minutes * 60_000,
    taskId,
    taskTitle,
  }
}

describe('session helpers', () => {
  it('rounds durations to minutes', () => {
    expect(sessionMinutes(session(0, 25))).toBe(25)
  })

  it('formats minutes as minutes or hours', () => {
    expect(formatMinutes(0)).toBe('0 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(95)).toBe('1h 35m')
  })

  it('prepends new sessions', () => {
    const first = session(1, 25)
    const second = session(0, 25)
    expect(addSession([first], second)).toEqual([second, first])
  })
})

describe('summarize and getSummary', () => {
  const sessions = [
    session(0, 25),
    session(0, 20),
    session(1, 30),
    session(3, 15),
  ]

  it('summarizes counts and minutes', () => {
    expect(summarize(sessions)).toEqual({ sessions: 4, minutes: 90 })
  })

  it('separates today from all-time totals', () => {
    expect(getSummary(sessions, NOW)).toEqual({
      today: { sessions: 2, minutes: 45 },
      allTime: { sessions: 4, minutes: 90 },
    })
  })

  it('handles empty data', () => {
    expect(getSummary([], NOW)).toEqual({
      today: { sessions: 0, minutes: 0 },
      allTime: { sessions: 0, minutes: 0 },
    })
  })
})

describe('getDailyActivity', () => {
  it('returns seven ordered days including zero days', () => {
    const sessions = [session(0, 25), session(0, 20), session(1, 30), session(3, 15)]
    const daily = getDailyActivity(sessions, 7, NOW)

    expect(daily).toHaveLength(7)
    expect(daily[6].dateKey).toBe(dayKey(NOW))
    expect(daily[6].minutes).toBe(45)
    expect(daily[5].minutes).toBe(30)
    expect(daily[4].minutes).toBe(0)
    expect(daily[3].minutes).toBe(15)
  })

  it('ignores sessions outside the window', () => {
    const daily = getDailyActivity([session(10, 50)], 7, NOW)
    expect(daily.every((day) => day.minutes === 0)).toBe(true)
  })
})

describe('getStreaks', () => {
  function sessionsOn(daysAgo: number[]): FocusSession[] {
    return daysAgo.map((days) => session(days, 25))
  }

  it('computes the current and longest streaks', () => {
    const sessions = [
      ...sessionsOn([0, 1, 2]),
      ...sessionsOn([6, 7, 8, 9, 10]),
    ]
    expect(getStreaks(sessions, NOW)).toEqual({ current: 3, longest: 5 })
  })

  it('keeps a streak alive when the last session was yesterday', () => {
    expect(getStreaks(sessionsOn([1, 2]), NOW).current).toBe(2)
  })

  it('breaks the current streak after a missed day', () => {
    expect(getStreaks(sessionsOn([2, 3, 4]), NOW)).toEqual({
      current: 0,
      longest: 3,
    })
  })

  it('handles empty data', () => {
    expect(getStreaks([], NOW)).toEqual({ current: 0, longest: 0 })
  })
})

describe('getTaskBreakdown', () => {
  it('groups focus time by task, including unassigned sessions', () => {
    const breakdown = getTaskBreakdown([
      session(0, 25, 'a', 'Write report'),
      session(1, 20, 'a', 'Write report'),
      session(2, 30, 'b', 'Review PR'),
      session(3, 10),
    ])

    expect(breakdown).toEqual([
      { taskId: 'a', title: 'Write report', sessions: 2, minutes: 45 },
      { taskId: 'b', title: 'Review PR', sessions: 1, minutes: 30 },
      { taskId: null, title: 'Unassigned', sessions: 1, minutes: 10 },
    ])
  })

  it('falls back to a deleted-task label when the title is missing', () => {
    const breakdown = getTaskBreakdown([session(0, 25, 'gone', null)])
    expect(breakdown[0].title).toBe('Deleted task')
  })

  it('handles empty data', () => {
    expect(getTaskBreakdown([])).toEqual([])
  })
})

describe('getHeatmap', () => {
  it('builds full weeks and marks today activity', () => {
    const weeks = getHeatmap([session(0, 30), session(30, 10)], NOW)
    expect(weeks).toHaveLength(HEATMAP_WEEKS)
    expect(weeks.every((week) => week.days.length === 7)).toBe(true)

    const days = weeks.flatMap((week) => week.days)
    const today = days.find((day) => day.dateKey === dayKey(NOW))
    expect(today?.minutes).toBe(30)
    expect(today?.level).toBe(2)
    expect(today?.future).toBe(false)
  })

  it('flags days after today as future', () => {
    const days = getHeatmap([], NOW).flatMap((week) => week.days)
    expect(days.some((day) => day.future)).toBe(true)
  })

  it('assigns levels based on minutes', () => {
    const weeks = getHeatmap(
      [session(0, 5), session(1, 25), session(2, 60), session(3, 120)],
      NOW,
    )
    const days = weeks.flatMap((week) => week.days)
    expect(days.find((day) => day.dateKey === dayKey(at(0)))?.level).toBe(1)
    expect(days.find((day) => day.dateKey === dayKey(at(1)))?.level).toBe(2)
    expect(days.find((day) => day.dateKey === dayKey(at(2)))?.level).toBe(3)
    expect(days.find((day) => day.dateKey === dayKey(at(3)))?.level).toBe(4)
  })
})

describe('parseSessions', () => {
  it('returns an empty list for missing or malformed data', () => {
    expect(parseSessions(null)).toEqual([])
    expect(parseSessions('nope')).toEqual([])
    expect(parseSessions('{}')).toEqual([])
  })

  it('keeps valid sessions and discards malformed entries', () => {
    const valid = session(0, 25, 'a', 'Write report')
    const parsed = parseSessions(
      JSON.stringify([valid, { id: 'bad', completedAt: 0 }]),
    )
    expect(parsed).toEqual([valid])
  })
})
