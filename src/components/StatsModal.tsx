import { useMemo, type ReactNode } from 'react'
import { Flame, Timer, Trophy, X } from 'lucide-react'
import { useDialog } from '../hooks/useDialog'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSessions } from '../context/SessionsContext'
import {
  formatMinutes,
  getDailyActivity,
  getStreaks,
  getSummary,
  getTaskBreakdown,
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

function StatsModal({ onClose }: StatsModalProps) {
  const { sessions } = useSessions()
  const now = useMemo(() => Date.now(), [])

  const summary = useMemo(() => getSummary(sessions, now), [sessions, now])
  const daily = useMemo(
    () => getDailyActivity(sessions, 7, now),
    [sessions, now],
  )
  const streaks = useMemo(() => getStreaks(sessions, now), [sessions, now])
  const breakdown = useMemo(() => getTaskBreakdown(sessions), [sessions])
  const maxTaskMinutes = Math.max(1, ...breakdown.map((item) => item.minutes))
  const hasSessions = sessions.length > 0
  const dialog = useDialog({ open: true, onClose })

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
          <div className="stats-summary">
            <StatCard
              label="Sessions today"
              value={String(summary.today.sessions)}
            />
            <StatCard
              label="Focus today"
              value={formatMinutes(summary.today.minutes)}
            />
            <StatCard
              label="Sessions all-time"
              value={String(summary.allTime.sessions)}
            />
            <StatCard
              label="Focus all-time"
              value={formatMinutes(summary.allTime.minutes)}
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
          ) : (
            <>
              <section className="stats-panel">
                <h3 className="stats-panel__title">Last 7 days</h3>
                <div className="stats-chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={daily}
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
                  icon={<Flame size={22} aria-hidden="true" />}
                />
                <StatCard
                  label="Longest streak"
                  value={`${streaks.longest} ${plural(streaks.longest, 'day', 'days')}`}
                  icon={<Trophy size={22} aria-hidden="true" />}
                />
              </div>

              <section className="stats-panel">
                <h3 className="stats-panel__title">Activity</h3>
                <ActivityHeatmap sessions={sessions} now={now} />
              </section>

              <section className="stats-panel">
                <h3 className="stats-panel__title">Focus by task</h3>
                <ul className="breakdown">
                  {breakdown.map((item) => (
                    <li
                      key={item.taskId ?? 'unassigned'}
                      className="breakdown__item"
                    >
                      <div className="breakdown__header">
                        <span className="breakdown__title">{item.title}</span>
                        <span className="breakdown__value">
                          {formatMinutes(item.minutes)} ·{' '}
                          {item.sessions}{' '}
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
