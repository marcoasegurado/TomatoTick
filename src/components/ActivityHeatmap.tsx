import {
  formatMinutes,
  getHeatmap,
  type FocusSession,
} from '../utils/sessions'

interface ActivityHeatmapProps {
  sessions: readonly FocusSession[]
  now: number
}

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function ActivityHeatmap({ sessions, now }: ActivityHeatmapProps) {
  const weeks = getHeatmap(sessions, now)

  return (
    <div className="heatmap">
      <div
        className="heatmap__body"
        role="img"
        aria-label="Focus activity for the last 26 weeks"
      >
        <div className="heatmap__weekdays" aria-hidden="true">
          {WEEKDAYS.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
        <div className="heatmap__grid">
          {weeks.map((week) => (
            <div className="heatmap__week" key={week.days[0].dateKey}>
              {week.days.map((day) => (
                <span
                  key={day.dateKey}
                  className={[
                    'heatmap__cell',
                    `heatmap__cell--level-${day.level}`,
                    day.future ? 'heatmap__cell--future' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  title={`${day.dateKey}: ${formatMinutes(day.minutes)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap__legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`heatmap__cell heatmap__cell--level-${level}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

export default ActivityHeatmap
