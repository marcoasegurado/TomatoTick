import { useMemo, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useTasks } from '../context/TasksContext'
import { useDialog } from '../hooks/useDialog'
import { useMediaQuery } from '../hooks/useMediaQuery'
import {
  getAllTags,
  selectTasks,
  MAX_TASK_TITLE_LENGTH,
  type Task,
  type TaskFilter,
  type TaskSort,
  type TaskUpdate,
} from '../utils/tasks'
import TaskEditor from './TaskEditor'
import TaskFilters from './TaskFilters'
import TaskItem from './TaskItem'

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
    updateTask,
    toggleTask,
    deleteTask,
    setActiveTask,
  } = useTasks()
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<TaskSort>('priority')
  const [editingId, setEditingId] = useState<string | null>(null)
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const drawerOpen = isMobile && open
  const dialog = useDialog<HTMLElement>({ open: drawerOpen, onClose })

  const tags = useMemo(() => getAllTags(tasks), [tasks])
  const activeTag = useMemo(() => {
    if (tagFilter === null) return null
    return (
      tags.find((tag) => tag.toLowerCase() === tagFilter.toLowerCase()) ?? null
    )
  }, [tagFilter, tags])
  const visibleTasks = useMemo(
    () => selectTasks(tasks, filter, activeTag, sort),
    [tasks, filter, activeTag, sort],
  )
  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [tasks, activeTaskId],
  )
  const pinnedActiveTask =
    activeTask !== null && !visibleTasks.some((task) => task.id === activeTask.id)
      ? activeTask
      : null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    addTask(title)
    setTitle('')
  }

  const handleSave = (id: string, update: TaskUpdate) => {
    updateTask(id, update)
    setEditingId(null)
  }

  const resetFilters = () => {
    setFilter('all')
    setTagFilter(null)
  }

  const renderTask = (task: Task) => {
    if (editingId === task.id) {
      return (
        <li key={task.id} className="task-item task-item--editing">
          <TaskEditor
            task={task}
            onSave={(update) => handleSave(task.id, update)}
            onCancel={() => setEditingId(null)}
          />
        </li>
      )
    }

    const isActive = task.id === activeTaskId
    return (
      <TaskItem
        key={task.id}
        task={task}
        isActive={isActive}
        onToggle={() => toggleTask(task.id)}
        onDelete={() => deleteTask(task.id)}
        onFocus={() => setActiveTask(isActive ? null : task.id)}
        onEdit={() => setEditingId(task.id)}
      />
    )
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

        {tasks.length > 0 && (
          <TaskFilters
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
            tags={tags}
            tag={activeTag}
            onTagChange={setTagFilter}
          />
        )}

        {tasks.length === 0 ? (
          <p className="sidebar__empty">
            No tasks yet. Add one above to focus on it.
          </p>
        ) : (
          <>
            {pinnedActiveTask && (
              <section className="task-pinned" aria-label="Current focus">
                <h3 className="task-pinned__title">Current focus</h3>
                <ul className="task-list">{renderTask(pinnedActiveTask)}</ul>
              </section>
            )}

            {visibleTasks.length === 0 ? (
              <div className="sidebar__empty-state">
                <p className="sidebar__empty">
                  {pinnedActiveTask
                    ? 'No other tasks match this filter.'
                    : 'No tasks match this filter.'}
                </p>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={resetFilters}
                >
                  Show all tasks
                </button>
              </div>
            ) : (
              <ul className="task-list">{visibleTasks.map(renderTask)}</ul>
            )}
          </>
        )}
      </aside>
    </>
  )
}

export default Sidebar
