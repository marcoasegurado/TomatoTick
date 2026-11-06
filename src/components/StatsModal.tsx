import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarDays,
  Download,
  Flame,
  Timer,
  Trophy,
  X,
} from 'lucide-react'
import { useDialog } from '../hooks/useDialog'
import { useSessions } from '../context/SessionsContext'
import {
  RANGE_PRESETS,
  csvFileName,
  customSelection,
  daysInRange,
  filterSessionsByRange,
  formatDayLabel,
  getRangeActivity,
  getRangeComparison,
  getRangeHighlights,
  getStoredRangeSelection,
  persistRangeSelection,
  rangeDateLabel,
  rangeLabel,
  resolveRange,
  sessionsToCsv,
  toDateInputValue,
  validateCustomRange,
  type RangeBucket,
  type RangePreset,
  type RangeSelection,
} from '../utils/analytics'
import {
  addDays,
  formatMinutes,
  getStreaks,
  getSummary,
  getTaskBreakdown,
  startOfDay,
} from '../utils/sessions'
import ActivityHeatmap from './ActivityHeatmap'

interface StatsModalProps {
  onClose: () => void
}

interface StatCardProps {
  label: string
  value: string
  detail?: string
  icon?: ReactNode
}

function StatCard({ label, value, detail, icon }: StatCardProps) {
  return (
    <div className="stat-card">
      {icon && (
        <span className="stat-card__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      {detail && <span className="stat-card__detail">{detail}</span>}
    </div>
  )
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}

function changeLabel(change: number | null): string {
  if (change === null) return 'No earlier data'
  if (change === 0) return 'No change'
  return `${change > 0 ? '+' : ''}${change}%`
}

function previousPeriodDetail(
  previousMinutes: number,
  days: number,
): string {
  if (previousMinutes === 0) return 'No focus in the previous period'
  return `${formatMinutes(previousMinutes)} in the previous ${days} ${plural(
    days,
    'day',
    'days',
  )}`
}

function StatsModal({ onClose }: StatsModalProps) {
  const { sessions } = useSessions()
  const now = useMemo(() => Date.now(), [])

  const [selection, setSelection] = useState<RangeSelection>(
    getStoredRangeSelection,
  )
  const [customDates, setCustomDates] = useState(() => {
    const stored = getStoredRangeSelection()
    return {
      start: toDateInputValue(
        stored.start ?? addDays(startOfDay(Date.now()), -6),
      ),
      end: toDateInputValue(stored.end ?? startOfDay(Date.now())),
    }
  })
  const [showCustom, setShowCustom] = useState(
    () => getStoredRangeSelection().preset === 'custom',
  )
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  useEffect(() => {
    persistRangeSelection(selection)
  }, [selection])

  const range = useMemo(
    () => resolveRange(selection, sessions, now),
    [selection, sessions, now],
  )
  const scopedSessions = useMemo(
    () => filterSessionsByRange(sessions, range),
    [sessions, range],
  )
  const summary = useMemo(() => getSummary(sessions, now), [sessions, now])
  const comparison = useMemo(
    () => getRangeComparison(sessions, range),
    [sessions, range],
  )
  const highlights = useMemo(
    () => getRangeHighlights(sessions, range),
    [sessions, range],
  )
  const activity = useMemo(
    () => getRangeActivity(sessions, range),
    [sessions, range],
  )
  const streaks = useMemo(() => getStreaks(sessions, now), [sessions, now])
  const breakdown = useMemo(
    () => getTaskBreakdown(scopedSessions),
    [scopedSessions],
  )

  const label = rangeLabel(selection, range)
  const customError = showCustom
    ? validateCustomRange(customDates.start, customDates.end, now)
    : null
  const hasSessions = sessions.length > 0
  const hasRangeSessions = scopedSessions.length > 0
  const maxTaskMinutes = Math.max(1, ...breakdown.map((item) => item.minutes))
  const rangeDays = daysInRange(range)

  const chartSummary = useMemo(() => {
    const total = activity.buckets.reduce(
      (sum, bucket) => sum + bucket.minutes,
      0,
    )
    const totalSessions = activity.buckets.reduce(
      (sum, bucket) => sum + bucket.sessions,
      0,
    )
    const best = activity.buckets.reduce<RangeBucket | null>(
      (top, bucket) => (bucket.minutes > (top?.minutes ?? 0) ? bucket : top),
      null,
    )

    if (totalSessions === 0) {
      return `${label}: no focus sessions in this range.`
    }

    let bestText = ''
    if (best && best.minutes > 0) {
      bestText =
        activity.granularity === 'day'
          ? ` Best day: ${formatDayLabel(best.start)} with ${formatMinutes(best.minutes)}.`
          : ` Best week starting ${formatDayLabel(best.start)} with ${formatMinutes(best.minutes)}.`
    }

    return `${label}: ${formatMinutes(total)} across ${totalSessions} ${plural(
      totalSessions,
      'session',
      'sessions',
    )}.${bestText}`
  }, [activity, label])

  const dialog = useDialog({ open: true, onClose })

  const selectPreset = (preset: RangePreset) => {
    if (preset !== 'custom') {
      setShowCustom(false)
      setSelection({ preset })
      return
    }

    setShowCustom(true)
    const next = customSelection(customDates.start, customDates.end)
    if (next) setSelection(next)
  }

  const updateCustomDate = (field: 'start' | 'end', value: string) => {
    const next = { ...customDates, [field]: value }
    setCustomDates(next)
    if (validateCustomRange(next.start, next.end, now)) return

    const nextSelection = customSelection(next.start, next.end)
    if (nextSelection) setSelection(nextSelection)
  }

  const handleExport = () => {
    try {
      const blob = new Blob([sessionsToCsv(scopedSessions)], {
        type: 'text/csv;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = csvFileName(range)
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setExportMessage(
        `Exported ${scopedSessions.length} ${plural(
          scopedSessions.length,
          'session',
          'sessions',
        )}.`,
      )
    } catch {
      setExportMessage('Could not create the CSV report.')
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialog.ref}
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
      >
        <div className="modal__header">
          <h2 id="stats-title" className="modal__title">
            Stats
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close stats"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="stats">
          <div className="stats-toolbar">
            <div className="range-picker" role="group" aria-label="Stats range">
              {RANGE_PRESETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={
                    selection.preset === option.id
                      ? 'range-picker__button range-picker__button--active'
                      : 'range-picker__button'
                  }
                  aria-pressed={selection.preset === option.id}
                  onClick={() => selectPreset(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="button button--ghost button--small"
              onClick={handleExport}
              disabled={!hasRangeSessions}
            >
              <Download size={16} aria-hidden="true" />
              Export CSV
            </button>
          </div>

          {showCustom && (
            <div className="range-custom">
              <label className="range-custom__field">
                <span>Start</span>
                <input
                  type="date"
                  className="range-custom__input"
                  value={customDates.start}
                  max={customDates.end}
                  onChange={(event) =>
                    updateCustomDate('start', event.target.value)
                  }
                />
              </label>
              <label className="range-custom__field">
                <span>End</span>
                <input
                  type="date"
                  className="range-custom__input"
                  value={customDates.end}
                  min={customDates.start}
                  max={toDateInputValue(now)}
                  onChange={(event) =>
                    updateCustomDate('end', event.target.value)
                  }
                />
              </label>
              {customError && (
                <p className="range-custom__error" role="alert">
                  {customError}
                </p>
              )}
            </div>
          )}

          {exportMessage && (
            <p className="stats-status" role="status">
              {exportMessage}
            </p>
          )}

          <div className="stats-summary">
            <StatCard
              label="Sessions in range"
              value={String(comparison.current.sessions)}
              detail={label}
            />
            <StatCard
              label="Focus in range"
              value={formatMinutes(comparison.current.minutes)}
              detail={label}
            />
            <StatCard
              label="Sessions all-time"
              value={String(summary.allTime.sessions)}
              detail="Ignores the range"
            />
            <StatCard
              label="Focus all-time"
              value={formatMinutes(summary.allTime.minutes)}
              detail="Ignores the range"
            />
          </div>

          {!hasSessions ? (
            <div className="stats-empty">
              <span className="stats-empty__icon" aria-hidden="true">
                <Timer size={40} />
              </span>
              <h3>No focus sessions yet</h3>
              <p>
                Finish a focus session and your charts, streaks, and task
                breakdown will appear here.
              </p>
            </div>
          ) : !hasRangeSessions ? (
            <div className="stats-empty">
              <span className="stats-empty__icon" aria-hidden="true">
                <CalendarDays size={40} />
              </span>
              <h3>No focus sessions in this range</h3>
              <p>
                Nothing was logged between {rangeDateLabel(range)}. Try a
                wider range to see your focus history.
              </p>
            </div>
          ) : (
            <>
              <section className="stats-panel">
                <h3 className="stats-panel__title">Trends</h3>
                <div className="stats-trends">
                  <div className="trend">
                    <span className="trend__label">
                      Focus vs. previous period
                    </span>
                    <strong className="trend__value">
                      {changeLabel(comparison.minutesChange)}
                    </strong>
                    <span className="trend__detail">
                      {previousPeriodDetail(
                        comparison.previous.minutes,
                        rangeDays,
                      )}
                    </span>
                  </div>
                  <div className="trend">
                    <span className="trend__label">
                      Sessions vs. previous period
                    </span>
                    <strong className="trend__value">
                      {changeLabel(comparison.sessionsChange)}
                    </strong>
                    <span className="trend__detail">
                      {comparison.previous.sessions === 0
                        ? 'No sessions in the previous period'
                        : `${comparison.previous.sessions} in the previous ${rangeDays} ${plural(
                            rangeDays,
                            'day',
                            'days',
                          )}`}
                    </span>
                  </div>
                  <div className="trend">
                    <span className="trend__label">
                      Average per active day
                    </span>
                    <strong className="trend__value">
                      {formatMinutes(highlights.averageMinutesPerActiveDay)}
                    </strong>
                    <span className="trend__detail">
                      {highlights.activeDays}{' '}
                      {plural(highlights.activeDays, 'active day', 'active days')}
                    </span>
                  </div>
                  <div className="trend">
                    <span className="trend__label">Best day</span>
                    <strong className="trend__value">
                      {highlights.bestDay
                        ? formatMinutes(highlights.bestDay.minutes)
                        : '–'}
                    </strong>
                    <span className="trend__detail">
                      {highlights.bestDay
                        ? formatDayLabel(highlights.bestDay.date)
                        : 'No focus in this range'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="stats-panel">
                <h3 className="stats-panel__title">
                  {activity.granularity === 'day'
                    ? 'Daily focus'
                    : 'Weekly focus'}
                </h3>
                <p className="stats-panel__note">
                  {activity.granularity === 'day'
                    ? 'Each bar is one day'
                    : 'Each bar is a 7-day block'}{' '}
                  · {label}
                </p>
                <p className="sr-only">{chartSummary}</p>
                <div className="stats-chart" aria-hidden="true">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={activity.buckets}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--chart-grid)"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                        tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--chart-cursor)' }}
                        formatter={(value) => [`${value} min`, 'Focus']}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: 13,
                        }}
                        labelStyle={{ color: 'var(--text)' }}
                        itemStyle={{ color: 'var(--text)' }}
                      />
                      <Bar
                        dataKey="minutes"
                        name="Focus minutes"
                        fill="var(--mode-color)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={42}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="stats-streaks">
                <StatCard
                  label="Current streak"
                  value={`${streaks.current} ${plural(streaks.current, 'day', 'days')}`}
                  detail="All-time"
                  icon={<Flame size={22} aria-hidden="true" />}
                />
                <StatCard
                  label="Longest streak"
                  value={`${streaks.longest} ${plural(streaks.longest, 'day', 'days')}`}
                  detail="All-time"
                  icon={<Trophy size={22} aria-hidden="true" />}
                />
              </div>

              <section className="stats-panel">
                <h3 className="stats-panel__title">Activity calendar</h3>
                <p className="stats-panel__note">
                  All weeks on record · ignores the selected range
                </p>
                <ActivityHeatmap sessions={sessions} now={now} />
              </section>

              <section className="stats-panel">
                <h3 className="stats-panel__title">Focus by task</h3>
                <p className="stats-panel__note">
                  {label} · {formatMinutes(comparison.current.minutes)} total
                </p>
                <ul className="breakdown">
                  {breakdown.map((item) => (
                    <li
                      key={item.taskId ?? 'unassigned'}
                      className="breakdown__item"
                    >
                      <div className="breakdown__header">
                        <span className="breakdown__title">{item.title}</span>
                        <span className="breakdown__value">
                          {formatMinutes(item.minutes)} · {item.sessions}{' '}
                          {plural(item.sessions, 'session', 'sessions')}
                        </span>
                      </div>
                      <div className="breakdown__bar">
                        <span
                          className="breakdown__fill"
                          style={{
                            width: `${(item.minutes / maxTaskMinutes) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatsModal
