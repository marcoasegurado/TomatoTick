import { Pencil, Target, Trash2 } from 'lucide-react'
import type { Task } from '../utils/tasks'

interface TaskItemProps {
  task: Task
  isActive: boolean
  onToggle: () => void
  onDelete: () => void
  onFocus: () => void
  onEdit: () => void
}

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function TaskItem({
  task,
  isActive,
  onToggle,
  onDelete,
  onFocus,
  onEdit,
}: TaskItemProps) {
  const hasEstimate = task.estimatedSessions > 0
  const progress = hasEstimate
    ? Math.min(100, Math.round((task.focusSessions / task.estimatedSessions) * 100))
    : 0

  return (
    <li
      className={[
        'task-item',
        task.completed ? 'task-item--completed' : '',
        isActive ? 'task-item--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <label className="task-item__check">
        <input
          type="checkbox"
          className="task-item__checkbox"
          checked={task.completed}
          onChange={onToggle}
          aria-label={`Mark "${task.title}" as ${
            task.completed ? 'incomplete' : 'complete'
          }`}
        />
      </label>

      <div className="task-item__body">
        <span className="task-item__title">{task.title}</span>

        <span className="task-item__badges">
          <span
            className={`task-priority task-priority--${task.priority}`}
            title={`${PRIORITY_LABELS[task.priority]} priority`}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
          {task.tags.map((tag) => (
            <span key={tag} className="task-tag">
              {tag}
            </span>
          ))}
        </span>

        {hasEstimate && (
          <div className="task-progress">
            <div
              className="task-progress__bar"
              role="progressbar"
              aria-label={`${task.title}: ${task.focusSessions} of ${task.estimatedSessions} sessions complete`}
              aria-valuemin={0}
              aria-valuemax={task.estimatedSessions}
              aria-valuenow={Math.min(
                task.focusSessions,
                task.estimatedSessions,
              )}
            >
              <span
                className="task-progress__fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="task-progress__label">
              {task.focusSessions} / {task.estimatedSessions} sessions
            </span>
          </div>
        )}

        {task.focusSessions > 0 && (
          <span className="task-item__meta">
            {hasEstimate
              ? `${task.focusMinutes} min`
              : `${task.focusSessions} ${
                  task.focusSessions === 1 ? 'session' : 'sessions'
                } · ${task.focusMinutes} min`}
          </span>
        )}
      </div>

      <div className="task-item__actions">
        <button
          type="button"
          className="task-item__action"
          aria-label={`Edit "${task.title}"`}
          title="Edit task"
          onClick={onEdit}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={
            isActive
              ? 'task-item__action task-item__action--active'
              : 'task-item__action'
          }
          aria-pressed={isActive}
          aria-label={
            isActive
              ? `Clear focus for "${task.title}"`
              : `Focus on "${task.title}"`
          }
          title={isActive ? 'Clear current focus' : 'Set as focus'}
          disabled={task.completed}
          onClick={onFocus}
        >
          <Target size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="task-item__action task-item__action--danger"
          aria-label={`Delete "${task.title}"`}
          title="Delete task"
          onClick={onDelete}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

export default TaskItem
