import {
  addDays,
  dayKey,
  sessionMinutes,
  sessionTaskLabel,
  startOfDay,
  summarize,
  type FocusSession,
  type Totals,
} from './sessions'

export const STATS_RANGE_STORAGE_KEY = 'tomatotick:stats-range'

/** Ranges longer than this switch the focus chart from days to weeks. */
export const DAILY_BUCKET_MAX_DAYS = 31

const MS_PER_DAY = 86_400_000

export type RangePreset = '7d' | '30d' | 'month' | 'all' | 'custom'

export interface RangeSelection {
  preset: RangePreset
  /** Day start of the custom range. Only set when `preset` is `custom`. */
  start?: number
  /** Day start of the custom range. Only set when `preset` is `custom`. */
  end?: number
}

export interface DateRange {
  /** Inclusive start, at the start of the day. */
  start: number
  /** Inclusive end, at the end of the day. */
  end: number
}

export type BucketGranularity = 'day' | 'week'

export interface RangeBucket {
  start: number
  label: string
  sessions: number
  minutes: number
}

export interface RangeActivity {
  granularity: BucketGranularity
  buckets: RangeBucket[]
}

export interface RangeComparison {
  current: Totals
  previous: Totals
  /** Percent change in focus minutes, or null when the previous range was empty. */
  minutesChange: number | null
  /** Percent change in session count, or null when the previous range was empty. */
  sessionsChange: number | null
}

export interface BestDay {
  date: number
  dateKey: string
  minutes: number
}

export interface RangeHighlights {
  activeDays: number
  averageMinutesPerActiveDay: number
  bestDay: BestDay | null
}

export const RANGE_PRESETS: ReadonlyArray<{
  id: RangePreset
  label: string
}> = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

export const DEFAULT_RANGE_SELECTION: RangeSelection = { preset: '7d' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isRangePreset(value: unknown): value is RangePreset {
  return RANGE_PRESETS.some((option) => option.id === value)
}

export function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function endOfDay(timestamp: number): number {
  return addDays(startOfDay(timestamp), 1) - 1
}

/** Number of days covered by an inclusive range. */
export function daysInRange(range: DateRange): number {
  const days = Math.round(
    (startOfDay(range.end) - startOfDay(range.start)) / MS_PER_DAY,
  )
  return Math.max(1, days + 1)
}

export function parseRangeSelection(raw: string | null): RangeSelection {
  if (!raw) return { ...DEFAULT_RANGE_SELECTION }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ...DEFAULT_RANGE_SELECTION }
  }

  if (!isRecord(parsed) || !isRangePreset(parsed.preset)) {
    return { ...DEFAULT_RANGE_SELECTION }
  }
  if (parsed.preset !== 'custom') return { preset: parsed.preset }

  const { start, end } = parsed
  if (
    typeof start !== 'number' ||
    !Number.isFinite(start) ||
    typeof end !== 'number' ||
    !Number.isFinite(end)
  ) {
    return { ...DEFAULT_RANGE_SELECTION }
  }

  const startDay = startOfDay(start)
  const endDay = startOfDay(end)
  if (startDay > endDay) return { ...DEFAULT_RANGE_SELECTION }

  return { preset: 'custom', start: startDay, end: endDay }
}

export function getStoredRangeSelection(): RangeSelection {
  try {
    return parseRangeSelection(localStorage.getItem(STATS_RANGE_STORAGE_KEY))
  } catch {
    return { ...DEFAULT_RANGE_SELECTION }
  }
}

export function persistRangeSelection(selection: RangeSelection): void {
  try {
    localStorage.setItem(STATS_RANGE_STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Storage can be unavailable; the range still works for this visit.
  }
}

function lastSevenDays(now: number): DateRange {
  return { start: addDays(startOfDay(now), -6), end: endOfDay(now) }
}

/** Turn a stored selection into concrete, validated start and end timestamps. */
export function resolveRange(
  selection: RangeSelection,
  sessions: readonly FocusSession[],
  now: number,
): DateRange {
  const today = startOfDay(now)
  const end = endOfDay(now)

  switch (selection.preset) {
    case '7d':
      return lastSevenDays(now)
    case '30d':
      return { start: addDays(today, -29), end }
    case 'month':
      return { start: startOfMonth(today), end }
    case 'all': {
      const earliest = sessions.reduce(
        (min, session) => Math.min(min, startOfDay(session.completedAt)),
        today,
      )
      return { start: Math.min(earliest, today), end }
    }
    case 'custom': {
      if (selection.start === undefined || selection.end === undefined) {
        return lastSevenDays(now)
      }
      const start = startOfDay(selection.start)
      const customEnd = Math.min(startOfDay(selection.end), today)
      if (start > customEnd) return lastSevenDays(now)
      return { start, end: endOfDay(customEnd) }
    }
  }
}

/** Short label for the range, such as "Last 7 days" or "May 14 – May 20". */
export function rangeLabel(
  selection: RangeSelection,
  range: DateRange,
): string {
  switch (selection.preset) {
    case '7d':
      return 'Last 7 days'
    case '30d':
      return 'Last 30 days'
    case 'month':
      return 'This month'
    case 'all':
      return 'All time'
    case 'custom':
      return `${formatDayLabel(range.start)} – ${formatDayLabel(range.end)}`
  }
}

export function formatDayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function rangeDateLabel(range: DateRange): string {
  return `${formatFullDate(range.start)} – ${formatFullDate(range.end)}`
}

export function filterSessionsByRange(
  sessions: readonly FocusSession[],
  range: DateRange,
): FocusSession[] {
  return sessions.filter(
    (session) =>
      session.completedAt >= range.start && session.completedAt <= range.end,
  )
}

/** The equal-length window immediately before `range`. */
export function getPreviousRange(range: DateRange): DateRange {
  const days = daysInRange(range)
  return {
    start: addDays(startOfDay(range.start), -days),
    end: range.start - 1,
  }
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function getRangeComparison(
  sessions: readonly FocusSession[],
  range: DateRange,
): RangeComparison {
  const current = summarize(filterSessionsByRange(sessions, range))
  const previous = summarize(
    filterSessionsByRange(sessions, getPreviousRange(range)),
  )

  return {
    current,
    previous,
    minutesChange: percentChange(current.minutes, previous.minutes),
    sessionsChange: percentChange(current.sessions, previous.sessions),
  }
}

export function getRangeHighlights(
  sessions: readonly FocusSession[],
  range: DateRange,
): RangeHighlights {
  const daily = new Map<string, BestDay>()

  for (const session of filterSessionsByRange(sessions, range)) {
    const date = startOfDay(session.completedAt)
    const key = dayKey(date)
    const existing = daily.get(key)
    if (existing) {
      existing.minutes += sessionMinutes(session)
    } else {
      daily.set(key, {
        date,
        dateKey: key,
        minutes: sessionMinutes(session),
      })
    }
  }

  let bestDay: BestDay | null = null
  let totalMinutes = 0
  for (const day of daily.values()) {
    totalMinutes += day.minutes
    if (!bestDay || day.minutes > bestDay.minutes) bestDay = day
  }

  const activeDays = daily.size

  return {
    activeDays,
    averageMinutesPerActiveDay:
      activeDays === 0 ? 0 : Math.round(totalMinutes / activeDays),
    bestDay,
  }
}

/**
 * Focus totals for the range. Ranges over 31 days are grouped into 7-day
 * blocks starting at the range start so long histories stay readable.
 */
export function getRangeActivity(
  sessions: readonly FocusSession[],
  range: DateRange,
): RangeActivity {
  const granularity: BucketGranularity =
    daysInRange(range) > DAILY_BUCKET_MAX_DAYS ? 'week' : 'day'
  const step = granularity === 'week' ? 7 : 1

  const daily = new Map<string, Totals>()
  for (const session of filterSessionsByRange(sessions, range)) {
    const key = dayKey(session.completedAt)
    const bucket = daily.get(key) ?? { sessions: 0, minutes: 0 }
    bucket.sessions += 1
    bucket.minutes += sessionMinutes(session)
    daily.set(key, bucket)
  }

  const buckets: RangeBucket[] = []
  for (
    let cursor = startOfDay(range.start);
    cursor <= range.end;
    cursor = addDays(cursor, step)
  ) {
    const start = startOfDay(cursor)
    const bucketEnd = Math.min(addDays(start, step) - 1, range.end)
    let sessionsInBucket = 0
    let minutesInBucket = 0

    for (
      let day = start;
      day <= bucketEnd;
      day = addDays(day, 1)
    ) {
      const bucket = daily.get(dayKey(day))
      if (!bucket) continue
      sessionsInBucket += bucket.sessions
      minutesInBucket += bucket.minutes
    }

    buckets.push({
      start,
      label: formatDayLabel(start),
      sessions: sessionsInBucket,
      minutes: minutesInBucket,
    })
  }

  return { granularity, buckets }
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function timeLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** One CSV row per session, oldest first, ready to download as a report. */
export function sessionsToCsv(sessions: readonly FocusSession[]): string {
  const rows = ['Date,Time,Task,Minutes']
  const ordered = [...sessions].sort(
    (a, b) => a.completedAt - b.completedAt,
  )

  for (const session of ordered) {
    rows.push(
      [
        dayKey(session.completedAt),
        timeLabel(session.completedAt),
        escapeCsv(sessionTaskLabel(session)),
        String(sessionMinutes(session)),
      ].join(','),
    )
  }

  return rows.join('\r\n')
}

export function csvFileName(range: DateRange): string {
  return `tomatotick-focus-${dayKey(range.start)}-to-${dayKey(range.end)}.csv`
}

export function toDateInputValue(timestamp: number): string {
  return dayKey(timestamp)
}

export function fromDateInputValue(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Build a custom selection from date input values, or null when invalid. */
export function customSelection(
  start: string,
  end: string,
): RangeSelection | null {
  const startDay = fromDateInputValue(start)
  const endDay = fromDateInputValue(end)
  if (startDay === null || endDay === null || startDay > endDay) return null
  return { preset: 'custom', start: startDay, end: endDay }
}

/** Validation message for the custom date inputs, or null when valid. */
export function validateCustomRange(
  start: string,
  end: string,
  now: number,
): string | null {
  const startDay = fromDateInputValue(start)
  const endDay = fromDateInputValue(end)

  if (startDay === null || endDay === null) {
    return 'Choose both a start and an end date.'
  }
  if (startDay > endDay) {
    return 'The start date must be on or before the end date.'
  }
  if (endDay > startOfDay(now)) {
    return 'The end date cannot be in the future.'
  }
  return null
}
