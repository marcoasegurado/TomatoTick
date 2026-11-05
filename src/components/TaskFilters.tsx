import type { TaskFilter, TaskSort } from '../utils/tasks'

interface TaskFiltersProps {
  filter: TaskFilter
  onFilterChange: (filter: TaskFilter) => void
  sort: TaskSort
  onSortChange: (sort: TaskSort) => void
  tags: string[]
  tag: string | null
  onTagChange: (tag: string | null) => void
}

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

const SORTS: { value: TaskSort; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'newest', label: 'Newest' },
]

function TaskFilters({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  tags,
  tag,
  onTagChange,
}: TaskFiltersProps) {
  return (
    <div className="task-toolbar">
      <div className="task-filters" role="group" aria-label="Filter tasks">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              filter === option.value
                ? 'task-filters__button task-filters__button--active'
                : 'task-filters__button'
            }
            aria-pressed={filter === option.value}
            onClick={() => onFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="task-toolbar__selects">
        <label className="task-select">
          <span className="task-select__label">Sort</span>
          <select
            className="task-select__input"
            value={sort}
            aria-label="Sort tasks"
            onChange={(event) => onSortChange(event.target.value as TaskSort)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {tags.length > 0 && (
          <label className="task-select">
            <span className="task-select__label">Tag</span>
            <select
              className="task-select__input"
              value={tag ?? ''}
              aria-label="Filter by tag"
              onChange={(event) => onTagChange(event.target.value || null)}
            >
              <option value="">All tags</option>
              {tags.map((tagName) => (
                <option key={tagName} value={tagName}>
                  {tagName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}

export default TaskFilters
