import { beforeEach, describe, expect, it } from 'vitest'
import {
  DAILY_BUCKET_MAX_DAYS,
  STATS_RANGE_STORAGE_KEY,
  csvFileName,
  customSelection,
  daysInRange,
  filterSessionsByRange,
  fromDateInputValue,
  getPreviousRange,
  getRangeActivity,
  getRangeComparison,
  getRangeHighlights,
  getStoredRangeSelection,
  parseRangeSelection,
  persistRangeSelection,
  rangeLabel,
  resolveRange,
  sessionsToCsv,
  toDateInputValue,
  validateCustomRange,
  type RangeSelection,
} from './analytics'
import { dayKey, startOfDay, type FocusSession } from './sessions'

const NOW = new Date(2026, 4, 20, 12, 0, 0).getTime()

function at(daysAgo: number, hour = 12, minute = 0): number {
  const date = new Date(NOW)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, 0, 0)
  return date.getTime()
}

let nextId = 0

function session(
  daysAgo: number,
  minutes: number,
  overrides: Partial<FocusSession> = {},
): FocusSession {
  nextId += 1
  return {
    id: `s${nextId}`,
    completedAt: at(daysAgo),
    durationMs: minutes * 60_000,
    taskId: null,
    taskTitle: null,
    ...overrides,
  }
}

describe('parseRangeSelection', () => {
  it('falls back to the last 7 days for missing or malformed data', () => {
    expect(parseRangeSelection(null)).toEqual({ preset: '7d' })
    expect(parseRangeSelection('nope')).toEqual({ preset: '7d' })
    expect(parseRangeSelection('{}')).toEqual({ preset: '7d' })
    expect(parseRangeSelection('{"preset":"forever"}')).toEqual({
      preset: '7d',
    })
  })

  it('keeps preset selections', () => {
    expect(parseRangeSelection('{"preset":"30d"}')).toEqual({ preset: '30d' })
    expect(parseRangeSelection('{"preset":"all"}')).toEqual({ preset: 'all' })
  })

  it('normalizes custom selections to day starts', () => {
    const raw = JSON.stringify({
      preset: 'custom',
      start: at(10, 18, 30),
      end: at(2, 4, 15),
    })
    const parsed = parseRangeSelection(raw)
    expect(parsed.preset).toBe('custom')
    expect(parsed.start).toBe(startOfDay(at(10)))
    expect(parsed.end).toBe(startOfDay(at(2)))
  })

  it('rejects inverted or incomplete custom selections', () => {
    expect(
      parseRangeSelection(
        JSON.stringify({ preset: 'custom', start: at(1), end: at(5) }),
      ),
    ).toEqual({ preset: '7d' })
    expect(parseRangeSelection('{"preset":"custom"}')).toEqual({
      preset: '7d',
    })
  })
})

describe('range storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a selection through localStorage', () => {
    const selection: RangeSelection = {
      preset: 'custom',
      start: startOfDay(at(9)),
      end: startOfDay(at(1)),
    }
    persistRangeSelection(selection)
    expect(getStoredRangeSelection()).toEqual(selection)
  })

  it('falls back when the stored value is invalid', () => {
    localStorage.setItem(STATS_RANGE_STORAGE_KEY, 'broken')
    expect(getStoredRangeSelection()).toEqual({ preset: '7d' })
  })
})

describe('resolveRange', () => {
  it('covers the last 7 days including today', () => {
    const range = resolveRange({ preset: '7d' }, [], NOW)
    expect(dayKey(range.start)).toBe('2026-05-14')
    expect(dayKey(range.end)).toBe('2026-05-20')
    expect(daysInRange(range)).toBe(7)
  })

  it('covers the last 30 days including today', () => {
    const range = resolveRange({ preset: '30d' }, [], NOW)
    expect(dayKey(range.start)).toBe('2026-04-21')
    expect(daysInRange(range)).toBe(30)
  })

  it('starts the current month on day one', () => {
    const range = resolveRange({ preset: 'month' }, [], NOW)
    expect(dayKey(range.start)).toBe('2026-05-01')
    expect(dayKey(range.end)).toBe('2026-05-20')
    expect(daysInRange(range)).toBe(20)
  })

  it('starts all-time at the earliest recorded session', () => {
    const range = resolveRange(
      { preset: 'all' },
      [session(40, 25), session(3, 25)],
      NOW,
    )
    expect(dayKey(range.start)).toBe(dayKey(at(40)))
    expect(dayKey(range.end)).toBe('2026-05-20')
  })

  it('clamps a custom end date to today', () => {
    const range = resolveRange(
      {
        preset: 'custom',
        start: startOfDay(at(5)),
        end: startOfDay(at(-10)),
      },
      [],
      NOW,
    )
    expect(dayKey(range.start)).toBe(dayKey(at(5)))
    expect(dayKey(range.end)).toBe('2026-05-20')
  })

  it('falls back to the last 7 days for invalid custom ranges', () => {
    const range = resolveRange(
      {
        preset: 'custom',
        start: startOfDay(at(1)),
        end: startOfDay(at(3)),
      },
      [],
      NOW,
    )
    expect(dayKey(range.start)).toBe('2026-05-14')
  })
})

describe('rangeLabel', () => {
  it('names the built-in presets', () => {
    expect(rangeLabel({ preset: '7d' }, resolveRange({ preset: '7d' }, [], NOW))).toBe(
      'Last 7 days',
    )
    expect(rangeLabel({ preset: 'all' }, resolveRange({ preset: 'all' }, [], NOW))).toBe(
      'All time',
    )
  })
})

describe('filterSessionsByRange', () => {
  const range = resolveRange({ preset: '7d' }, [], NOW)

  it('includes sessions on the first and last day', () => {
    const first = { ...session(6, 25), completedAt: at(6, 0, 1) }
    const last = { ...session(0, 25), completedAt: at(0, 23, 59) }
    expect(filterSessionsByRange([first, last], range)).toEqual([first, last])
  })

  it('excludes sessions on the days around the range', () => {
    const before = { ...session(7, 25), completedAt: at(7, 23, 59) }
    const after = { ...session(-1, 25), completedAt: at(-1, 0, 1) }
    expect(filterSessionsByRange([before, after], range)).toEqual([])
  })
})

describe('getPreviousRange', () => {
  it('returns the equal-length window immediately before the range', () => {
    const range = resolveRange({ preset: '7d' }, [], NOW)
    const previous = getPreviousRange(range)
    expect(dayKey(previous.start)).toBe('2026-05-07')
    expect(dayKey(previous.end)).toBe('2026-05-13')
    expect(daysInRange(previous)).toBe(7)
  })
})

describe('getRangeComparison', () => {
  it('compares the range with the previous period', () => {
    const sessions = [
      session(0, 30),
      session(2, 20),
      session(8, 25),
      session(10, 25),
      session(11, 25),
      session(12, 25),
    ]
    const comparison = getRangeComparison(
      sessions,
      resolveRange({ preset: '7d' }, sessions, NOW),
    )

    expect(comparison.current).toEqual({ sessions: 2, minutes: 50 })
    expect(comparison.previous).toEqual({ sessions: 4, minutes: 100 })
    expect(comparison.minutesChange).toBe(-50)
    expect(comparison.sessionsChange).toBe(-50)
  })

  it('reports no comparison when the previous period is empty', () => {
    const comparison = getRangeComparison(
      [session(0, 25)],
      resolveRange({ preset: '7d' }, [], NOW),
    )
    expect(comparison.minutesChange).toBeNull()
    expect(comparison.sessionsChange).toBeNull()
  })
})

describe('getRangeHighlights', () => {
  it('counts active days and finds the best day', () => {
    const sessions = [
      session(0, 25),
      session(0, 25),
      session(2, 50),
      session(9, 90),
    ]
    const highlights = getRangeHighlights(
      sessions,
      resolveRange({ preset: '7d' }, sessions, NOW),
    )

    expect(highlights.activeDays).toBe(2)
    expect(highlights.averageMinutesPerActiveDay).toBe(50)
    expect(highlights.bestDay).toEqual({
      date: startOfDay(at(0)),
      dateKey: dayKey(at(0)),
      minutes: 50,
    })
  })

  it('handles an empty range', () => {
    expect(
      getRangeHighlights([], resolveRange({ preset: '7d' }, [], NOW)),
    ).toEqual({
      activeDays: 0,
      averageMinutesPerActiveDay: 0,
      bestDay: null,
    })
  })
})

describe('getRangeActivity', () => {
  it('returns one bucket per day for short ranges', () => {
    const activity = getRangeActivity(
      [session(0, 25), session(1, 30)],
      resolveRange({ preset: '7d' }, [], NOW),
    )

    expect(activity.granularity).toBe('day')
    expect(activity.buckets).toHaveLength(7)
    expect(activity.buckets[6].minutes).toBe(25)
    expect(activity.buckets[5].minutes).toBe(30)
    expect(activity.buckets[0].minutes).toBe(0)
  })

  it('keeps 30-day ranges on daily buckets', () => {
    const range = resolveRange({ preset: '30d' }, [], NOW)
    expect(daysInRange(range)).toBeLessThanOrEqual(DAILY_BUCKET_MAX_DAYS)
    expect(getRangeActivity([], range).granularity).toBe('day')
  })

  it('switches to 7-day buckets for long ranges', () => {
    const range = resolveRange(
      {
        preset: 'custom',
        start: startOfDay(at(59)),
        end: startOfDay(at(0)),
      },
      [],
      NOW,
    )
    expect(daysInRange(range)).toBeGreaterThan(DAILY_BUCKET_MAX_DAYS)

    const activity = getRangeActivity([session(0, 25), session(59, 50)], range)
    expect(activity.granularity).toBe('week')
    expect(activity.buckets).toHaveLength(9)
    expect(activity.buckets[0].minutes).toBe(50)
    expect(activity.buckets[8].minutes).toBe(25)
    expect(
      activity.buckets.reduce((sum, bucket) => sum + bucket.minutes, 0),
    ).toBe(75)
  })

  it('ignores sessions outside the range', () => {
    const activity = getRangeActivity(
      [session(20, 25)],
      resolveRange({ preset: '7d' }, [], NOW),
    )
    expect(activity.buckets.every((bucket) => bucket.minutes === 0)).toBe(true)
  })
})

describe('sessionsToCsv', () => {
  it('writes a header and one row per session, oldest first', () => {
    const csv = sessionsToCsv([
      session(0, 25, { taskId: 'a', taskTitle: 'Write report' }),
      session(2, 20),
    ])
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe('Date,Time,Task,Minutes')
    expect(lines[1]).toBe(`${dayKey(at(2))},12:00,Unassigned,20`)
    expect(lines[2]).toBe(`${dayKey(at(0))},12:00,Write report,25`)
    expect(lines).toHaveLength(3)
  })

  it('quotes task titles with commas or quotes', () => {
    const csv = sessionsToCsv([
      session(0, 25, {
        taskId: 'a',
        taskTitle: 'Review, then "ship"',
      }),
    ])
    expect(csv.split('\r\n')[1]).toBe(
      `${dayKey(at(0))},12:00,"Review, then ""ship""",25`,
    )
  })

  it('uses the deleted-task label when the title is gone', () => {
    const csv = sessionsToCsv([session(0, 25, { taskId: 'gone' })])
    expect(csv.split('\r\n')[1]).toContain('Deleted task')
  })

  it('builds a dated file name', () => {
    const range = resolveRange({ preset: '7d' }, [], NOW)
    expect(csvFileName(range)).toBe(
      'tomatotick-focus-2026-05-14-to-2026-05-20.csv',
    )
  })
})

describe('custom date inputs', () => {
  it('converts between date inputs and timestamps', () => {
    const timestamp = startOfDay(at(4))
    expect(toDateInputValue(timestamp)).toBe(dayKey(timestamp))
    expect(fromDateInputValue(dayKey(timestamp))).toBe(timestamp)
  })

  it('rejects impossible or malformed dates', () => {
    expect(fromDateInputValue('2026-02-30')).toBeNull()
    expect(fromDateInputValue('2026-5-1')).toBeNull()
    expect(fromDateInputValue('')).toBeNull()
  })

  it('validates the custom range', () => {
    const today = toDateInputValue(startOfDay(NOW))
    const yesterday = toDateInputValue(startOfDay(at(1)))
    const lastWeek = toDateInputValue(startOfDay(at(7)))

    expect(validateCustomRange(lastWeek, yesterday, NOW)).toBeNull()
    expect(validateCustomRange(yesterday, lastWeek, NOW)).toBe(
      'The start date must be on or before the end date.',
    )
    expect(validateCustomRange(lastWeek, '', NOW)).toBe(
      'Choose both a start and an end date.',
    )
    expect(
      validateCustomRange(lastWeek, toDateInputValue(startOfDay(at(-2))), NOW),
    ).toBe('The end date cannot be in the future.')
    expect(validateCustomRange(lastWeek, today, NOW)).toBeNull()
  })

  it('builds a custom selection only from a valid pair', () => {
    expect(
      customSelection(
        toDateInputValue(startOfDay(at(7))),
        toDateInputValue(startOfDay(at(1))),
      ),
    ).toEqual({
      preset: 'custom',
      start: startOfDay(at(7)),
      end: startOfDay(at(1)),
    })
    expect(
      customSelection(
        toDateInputValue(startOfDay(at(1))),
        toDateInputValue(startOfDay(at(7))),
      ),
    ).toBeNull()
  })
})
