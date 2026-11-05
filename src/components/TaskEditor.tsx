import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  MAX_ESTIMATED_SESSIONS,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_TASK,
  MAX_TASK_TITLE_LENGTH,
  TASK_PRIORITIES,
  normalizeTags,
  type Task,
  type TaskPriority,
  type TaskUpdate,
} from '../utils/tasks'

interface TaskEditorProps {
  task: Task
  onSave: (update: TaskUpdate) => void
  onCancel: () => void
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function TaskEditor({ task, onSave, onCancel }: TaskEditorProps) {
  const [title, setTitle] = useState(task.title)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [tags, setTags] = useState(task.tags.join(', '))
  const [estimate, setEstimate] = useState(
    task.estimatedSessions > 0 ? String(task.estimatedSessions) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldId = useId()

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Task title cannot be empty.')
      return
    }

    const parsedTags = parseTags(tags)
    const uniqueTags = new Set(parsedTags.map((tag) => tag.toLowerCase()))
    if (uniqueTags.size > MAX_TAGS_PER_TASK) {
      setError(`Use up to ${MAX_TAGS_PER_TASK} tags.`)
      return
    }
    if (parsedTags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      setError(`Tags must be ${MAX_TAG_LENGTH} characters or fewer.`)
      return
    }

    const estimateText = estimate.trim()
    let estimatedSessions = 0
    if (estimateText) {
      const parsedEstimate = Number(estimateText)
      if (
        !Number.isInteger(parsedEstimate) ||
        parsedEstimate < 0 ||
        parsedEstimate > MAX_ESTIMATED_SESSIONS
      ) {
        setError(
          `Estimate must be a whole number from 0 to ${MAX_ESTIMATED_SESSIONS}.`,
        )
        return
      }
      estimatedSessions = parsedEstimate
    }

    onSave({
      title: trimmedTitle,
      priority,
      tags: normalizeTags(parsedTags),
      estimatedSessions,
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
    }
  }

  const titleId = `${fieldId}-title`
  const priorityId = `${fieldId}-priority`
  const estimateId = `${fieldId}-estimate`
  const tagsId = `${fieldId}-tags`

  return (
    <form
      className="task-editor"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      aria-label={`Edit "${task.title}"`}
    >
      <div className="task-editor__field">
        <label className="sr-only" htmlFor={titleId}>
          Task title
        </label>
        <input
          ref={inputRef}
          id={titleId}
          type="text"
          className="task-editor__input"
          value={title}
          maxLength={MAX_TASK_TITLE_LENGTH}
          placeholder="Task title"
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(null)
          }}
        />
      </div>

      <div className="task-editor__row">
        <div className="task-editor__field">
          <label className="task-editor__label" htmlFor={priorityId}>
            Priority
          </label>
          <select
            id={priorityId}
            className="task-editor__select"
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as TaskPriority)
            }
          >
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="task-editor__field">
          <label className="task-editor__label" htmlFor={estimateId}>
            Estimate
          </label>
          <input
            id={estimateId}
            type="number"
            className="task-editor__input"
            inputMode="numeric"
            min={0}
            max={MAX_ESTIMATED_SESSIONS}
            step={1}
            value={estimate}
            placeholder="None"
            onChange={(event) => {
              setEstimate(event.target.value)
              setError(null)
            }}
          />
        </div>
      </div>

      <div className="task-editor__field">
        <label className="task-editor__label" htmlFor={tagsId}>
          Tags
        </label>
        <input
          id={tagsId}
          type="text"
          className="task-editor__input"
          value={tags}
          maxLength={MAX_TAGS_PER_TASK * (MAX_TAG_LENGTH + 2)}
          placeholder="Optional, comma separated"
          onChange={(event) => {
            setTags(event.target.value)
            setError(null)
          }}
        />
      </div>

      <p className="task-editor__hint">
        Separate tags with commas. Up to {MAX_TAGS_PER_TASK} tags of{' '}
        {MAX_TAG_LENGTH} characters. Leave the estimate empty for no target.
      </p>

      {error && (
        <p className="task-editor__error" role="alert">
          {error}
        </p>
      )}

      <div className="task-editor__actions">
        <button
          type="submit"
          className="button button--primary button--small"
        >
          Save
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default TaskEditor
