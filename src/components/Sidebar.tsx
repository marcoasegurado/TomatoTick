import { useState, type FormEvent } from 'react'
import { Target, Trash2, X } from 'lucide-react'
import { useTasks } from '../context/TasksContext'
import { useDialog } from '../hooks/useDialog'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { MAX_TASK_TITLE_LENGTH } from '../utils/tasks'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const MOBILE_QUERY = '(max-width: 768px)'

function Sidebar({ open, onClose }: SidebarProps) {
  const {
    tasks,
    activeTaskId,
    addTask,
    toggleTask,
    deleteTask,
    setActiveTask,
  } = useTasks()
  const [title, setTitle] = useState('')
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const drawerOpen = isMobile && open
  const dialog = useDialog<HTMLElement>({ open: drawerOpen, onClose })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    addTask(title)
    setTitle('')
  }

  return (
    <>
      <div
        className={
          open ? 'sidebar-backdrop sidebar-backdrop--open' : 'sidebar-backdrop'
        }
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={dialog.ref}
        id="tasks-sidebar"
        className={open ? 'sidebar sidebar--open' : 'sidebar'}
        aria-label="Tasks"
        aria-hidden={isMobile && !open ? true : undefined}
        inert={isMobile && !open ? true : undefined}
      >
        <div className="sidebar__header">
          <h2 className="sidebar__title">Tasks</h2>
          <button
            type="button"
            className="sidebar__close"
            aria-label="Close tasks"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="task-form__input"
            aria-label="New task"
            placeholder="Add a task…"
            maxLength={MAX_TASK_TITLE_LENGTH}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            type="submit"
            className="button button--primary button--small"
            disabled={!title.trim()}
          >
            Add
          </button>
        </form>

        {tasks.length === 0 ? (
          <p className="sidebar__empty">
            No tasks yet. Add one above to focus on it.
          </p>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => {
              const isActive = task.id === activeTaskId
              return (
                <li
                  key={task.id}
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
                      onChange={() => toggleTask(task.id)}
                      aria-label={`Mark "${task.title}" as ${
                        task.completed ? 'incomplete' : 'complete'
                      }`}
                    />
                  </label>

                  <div className="task-item__body">
                    <span className="task-item__title">{task.title}</span>
                    {task.focusSessions > 0 && (
                      <span className="task-item__meta">
                        {task.focusSessions}{' '}
                        {task.focusSessions === 1 ? 'session' : 'sessions'} ·{' '}
                        {task.focusMinutes} min
                      </span>
                    )}
                  </div>

                  <div className="task-item__actions">
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
                      onClick={() =>
                        setActiveTask(isActive ? null : task.id)
                      }
                    >
                      <Target size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="task-item__action task-item__action--danger"
                      aria-label={`Delete "${task.title}"`}
                      title="Delete task"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </>
  )
}

export default Sidebar
