export const SESSIONS_STORAGE_KEY = 'tomatotick:sessions'
export const HEATMAP_WEEKS = 26

export interface FocusSession {
  id: string
  /** Epoch milliseconds when the session finished. */
  completedAt: number
  /** Length of the completed session in milliseconds. */
  durationMs: number
  taskId: string | null
  /** Snapshot of the task title so stats survive task deletion. */
  taskTitle: string | null
}

export interface Totals {
  sessions: number
  minutes: number
}

export interface Summary {
  today: Totals
  allTime: Totals
}

export interface DailyActivity {
  date: number
  dateKey: string
  label: string
  sessions: number
  minutes: number
}

export interface Streaks {
  current: number
  longest: number
}

export interface TaskBreakdown {
  taskId: string | null
  title: string
  sessions: number
  minutes: number
}

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4

export interface HeatmapDay {
  date: number
  dateKey: string
  minutes: number
  level: HeatmapLevel
  future: boolean
}

export interface HeatmapWeek {
  days: HeatmapDay[]
}

export function sessionMinutes(session: FocusSession): number {
  return Math.max(0, Math.round(session.durationMs / 60_000))
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function addDays(timestamp: number, days: number): number {
  const date = new Date(timestamp)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function summarize(sessions: readonly FocusSession[]): Totals {
  return sessions.reduce<Totals>(
    (totals, session) => ({
      sessions: totals.sessions + 1,
      minutes: totals.minutes + sessionMinutes(session),
    }),
    { sessions: 0, minutes: 0 },
  )
}

export function getSummary(
  sessions: readonly FocusSession[],
  now: number,
): Summary {
  const todayKey = dayKey(now)
  const todaySessions = sessions.filter(
    (session) => dayKey(session.completedAt) === todayKey,
  )

  return {
    today: summarize(todaySessions),
    allTime: summarize(sessions),
  }
}

interface DayBucket {
  sessions: number
  minutes: number
}

function groupByDay(
  sessions: readonly FocusSession[],
): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>()
  for (const session of sessions) {
    const key = dayKey(session.completedAt)
    const bucket = buckets.get(key) ?? { sessions: 0, minutes: 0 }
    bucket.sessions += 1
    bucket.minutes += sessionMinutes(session)
    buckets.set(key, bucket)
  }
  return buckets
}

/** Focus activity for the last `days` days, oldest first, including today. */
export function getDailyActivity(
  sessions: readonly FocusSession[],
  days: number,
  now: number,
): DailyActivity[] {
  const safeDays = Math.max(1, Math.floor(days))
  const buckets = groupByDay(sessions)
  const today = startOfDay(now)
  const result: DailyActivity[] = []

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const key = dayKey(date)
    const bucket = buckets.get(key)
    result.push({
      date,
      dateKey: key,
      label: new Date(date).toLocaleDateString(undefined, {
        weekday: 'short',
      }),
      sessions: bucket?.sessions ?? 0,
      minutes: bucket?.minutes ?? 0,
    })
  }

  return result
}

/**
 * Current streak counts consecutive days ending today, or ending yesterday
 * while today has not had a session yet. Longest is the best run ever.
 */
export function getStreaks(
  sessions: readonly FocusSession[],
  now: number,
): Streaks {
  if (sessions.length === 0) return { current: 0, longest: 0 }

  const days = [...new Set(sessions.map((session) => startOfDay(session.completedAt)))]
    .sort((a, b) => a - b)

  let longest = 1
  let run = 1
  for (let index = 1; index < days.length; index += 1) {
    if (days[index] === addDays(days[index - 1], 1)) {
      run += 1
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
  }

  const daySet = new Set(days)
  let cursor = startOfDay(now)
  if (!daySet.has(cursor)) {
    const yesterday = addDays(cursor, -1)
    if (!daySet.has(yesterday)) {
      return { current: 0, longest }
    }
    cursor = yesterday
  }

  let current = 0
  while (daySet.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  return { current, longest }
}

export function getTaskBreakdown(
  sessions: readonly FocusSession[],
): TaskBreakdown[] {
  const buckets = new Map<string, TaskBreakdown>()

  for (const session of sessions) {
    const key = session.taskId ?? 'unassigned'
    const existing = buckets.get(key)
    const title =
      session.taskTitle ??
      (session.taskId === null ? 'Unassigned' : 'Deleted task')

    if (existing) {
      existing.sessions += 1
      existing.minutes += sessionMinutes(session)
    } else {
      buckets.set(key, {
        taskId: session.taskId,
        title,
        sessions: 1,
        minutes: sessionMinutes(session),
      })
    }
  }

  return [...buckets.values()].sort(
    (a, b) => b.minutes - a.minutes || a.title.localeCompare(b.title),
  )
}

export function heatmapLevel(minutes: number): HeatmapLevel {
  if (minutes <= 0) return 0
  if (minutes < 25) return 1
  if (minutes < 50) return 2
  if (minutes < 100) return 3
  return 4
}

/** Build a GitHub-style grid of weeks ending with the current week. */
export function getHeatmap(
  sessions: readonly FocusSession[],
  now: number,
  weeks: number = HEATMAP_WEEKS,
): HeatmapWeek[] {
  const safeWeeks = Math.max(1, Math.floor(weeks))
  const buckets = groupByDay(sessions)
  const today = startOfDay(now)
  const currentWeekStart = addDays(today, -new Date(today).getDay())
  const firstWeekStart = addDays(currentWeekStart, -(safeWeeks - 1) * 7)
  const result: HeatmapWeek[] = []

  for (let weekIndex = 0; weekIndex < safeWeeks; weekIndex += 1) {
    const weekStart = addDays(firstWeekStart, weekIndex * 7)
    const days: HeatmapDay[] = []

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(weekStart, dayIndex)
      const key = dayKey(date)
      const minutes = buckets.get(key)?.minutes ?? 0
      days.push({
        date,
        dateKey: key,
        minutes,
        level: heatmapLevel(minutes),
        future: date > today,
      })
    }

    result.push({ days })
  }

  return result
}

export function formatMinutes(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes))
  if (rounded < 60) return `${rounded} min`
  const hours = Math.floor(rounded / 60)
  const rest = rounded % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export function addSession(
  sessions: readonly FocusSession[],
  session: FocusSession,
): FocusSession[] {
  return [session, ...sessions]
}

function isFocusSession(value: unknown): value is FocusSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<FocusSession>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.completedAt === 'number' &&
    Number.isFinite(candidate.completedAt) &&
    typeof candidate.durationMs === 'number' &&
    Number.isFinite(candidate.durationMs) &&
    candidate.durationMs > 0 &&
    (candidate.taskId === null || typeof candidate.taskId === 'string') &&
    (candidate.taskTitle === null ||
      typeof candidate.taskTitle === 'string')
  )
}

export function parseSessions(raw: string | null): FocusSession[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFocusSession)
  } catch {
    return []
  }
}
