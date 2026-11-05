export const TASKS_STORAGE_KEY = 'tomatotick:tasks'
export const MAX_TASK_TITLE_LENGTH = 120
export const MAX_TAG_LENGTH = 24
export const MAX_TAGS_PER_TASK = 6
export const MAX_ESTIMATED_SESSIONS = 99

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium'

export type TaskFilter = 'all' | 'active' | 'completed'
export type TaskSort = 'priority' | 'newest'

export interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: number
  /** Completed focus sessions credited to this task. */
  focusSessions: number
  /** Focus minutes credited to this task. */
  focusMinutes: number
  priority: TaskPriority
  tags: string[]
  /** Planned focus sessions; 0 means no estimate. */
  estimatedSessions: number
}

export interface TaskState {
  tasks: Task[]
  activeTaskId: string | null
}

export interface TaskOptions {
  priority?: TaskPriority
  tags?: readonly string[]
  estimatedSessions?: number
}

export interface TaskUpdate {
  title?: string
  priority?: TaskPriority
  tags?: readonly string[]
  estimatedSessions?: number
}

export const EMPTY_TASK_STATE: TaskState = {
  tasks: [],
  activeTaskId: null,
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === 'string' &&
    (TASK_PRIORITIES as readonly string[]).includes(value)
  )
}

/** Trim, de-duplicate (case-insensitively), and cap a list of tags. */
export function normalizeTags(tags: readonly string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const raw of tags) {
    if (typeof raw !== 'string') continue
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH)
    if (!tag) continue

    const key = tag.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    result.push(tag)
    if (result.length === MAX_TAGS_PER_TASK) break
  }

  return result
}

export function normalizeEstimatedSessions(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0
  }
  return Math.min(Math.round(value), MAX_ESTIMATED_SESSIONS)
}

/** Validate a title and build a new task, or return null for blank input. */
export function createTask(
  title: string,
  now: number,
  id: string,
  options: TaskOptions = {},
): Task | null {
  const trimmed = title.trim()
  if (!trimmed) return null

  return {
    id,
    title: trimmed.slice(0, MAX_TASK_TITLE_LENGTH),
    completed: false,
    createdAt: now,
    focusSessions: 0,
    focusMinutes: 0,
    priority: isTaskPriority(options.priority)
      ? options.priority
      : DEFAULT_TASK_PRIORITY,
    tags: normalizeTags(options.tags ?? []),
    estimatedSessions: normalizeEstimatedSessions(options.estimatedSessions),
  }
}

function hasTask(state: TaskState, id: string | null): boolean {
  if (id === null) return false
  return state.tasks.some((task) => task.id === id)
}

export function addTask(
  state: TaskState,
  title: string,
  now: number,
  id: string,
  options: TaskOptions = {},
): TaskState {
  const task = createTask(title, now, id, options)
  if (!task) return state

  return {
    tasks: [task, ...state.tasks],
    // Focus the first task automatically, or replace a dangling active id.
    activeTaskId: hasTask(state, state.activeTaskId) ? state.activeTaskId : id,
  }
}

/** Edit a task's editable fields, ignoring invalid input. */
export function updateTask(
  state: TaskState,
  id: string,
  update: TaskUpdate,
): TaskState {
  const current = state.tasks.find((task) => task.id === id)
  if (!current) return state

  const next: Task = { ...current }

  if (update.title !== undefined) {
    const trimmed = update.title.trim()
    if (!trimmed) return state
    next.title = trimmed.slice(0, MAX_TASK_TITLE_LENGTH)
  }

  if (update.priority !== undefined) {
    if (!isTaskPriority(update.priority)) return state
    next.priority = update.priority
  }

  if (update.tags !== undefined) {
    next.tags = normalizeTags(update.tags)
  }

  if (update.estimatedSessions !== undefined) {
    if (
      typeof update.estimatedSessions !== 'number' ||
      !Number.isFinite(update.estimatedSessions) ||
      update.estimatedSessions < 0
    ) {
      return state
    }
    next.estimatedSessions = normalizeEstimatedSessions(
      update.estimatedSessions,
    )
  }

  const changed =
    next.title !== current.title ||
    next.priority !== current.priority ||
    next.estimatedSessions !== current.estimatedSessions ||
    next.tags.length !== current.tags.length ||
    next.tags.some((tag, index) => tag !== current.tags[index])

  if (!changed) return state

  return {
    ...state,
    tasks: state.tasks.map((task) => (task.id === id ? next : task)),
  }
}

export function toggleTask(state: TaskState, id: string): TaskState {
  if (!hasTask(state, id)) return state

  const tasks = state.tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  )
  const toggled = tasks.find((task) => task.id === id)
  const activeTaskId =
    toggled?.completed && state.activeTaskId === id
      ? null
      : state.activeTaskId

  return { tasks, activeTaskId }
}

export function deleteTask(state: TaskState, id: string): TaskState {
  if (!hasTask(state, id)) return state

  return {
    tasks: state.tasks.filter((task) => task.id !== id),
    activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
  }
}

export function setActiveTask(
  state: TaskState,
  id: string | null,
): TaskState {
  if (id === null) {
    return state.activeTaskId === null ? state : { ...state, activeTaskId: null }
  }
  if (!hasTask(state, id)) return state
  if (state.activeTaskId === id) return state
  return { ...state, activeTaskId: id }
}

/** Credit one completed focus session to the current task. */
export function creditFocusSession(
  state: TaskState,
  minutes: number,
): TaskState {
  if (state.activeTaskId === null) return state
  if (!hasTask(state, state.activeTaskId)) return state

  const safeMinutes =
    Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0

  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === state.activeTaskId
        ? {
            ...task,
            focusSessions: task.focusSessions + 1,
            focusMinutes: task.focusMinutes + safeMinutes,
          }
        : task,
    ),
  }
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

export function filterTasks(
  tasks: readonly Task[],
  filter: TaskFilter,
  tag: string | null = null,
): Task[] {
  const wantedTag = tag?.toLowerCase() ?? null

  return tasks.filter((task) => {
    if (filter === 'active' && task.completed) return false
    if (filter === 'completed' && !task.completed) return false
    if (
      wantedTag !== null &&
      !task.tags.some((taskTag) => taskTag.toLowerCase() === wantedTag)
    ) {
      return false
    }
    return true
  })
}

export function sortTasks(tasks: readonly Task[], sort: TaskSort): Task[] {
  const sorted = [...tasks]

  if (sort === 'newest') {
    return sorted.sort((a, b) => b.createdAt - a.createdAt)
  }

  return sorted.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (byPriority !== 0) return byPriority
    return b.createdAt - a.createdAt
  })
}

export function selectTasks(
  tasks: readonly Task[],
  filter: TaskFilter,
  tag: string | null,
  sort: TaskSort,
): Task[] {
  return sortTasks(filterTasks(tasks, filter, tag), sort)
}

/** Every tag in use, de-duplicated case-insensitively and alphabetized. */
export function getAllTags(tasks: readonly Task[]): string[] {
  const tags = new Map<string, string>()

  for (const task of tasks) {
    for (const tag of task.tags) {
      const key = tag.toLowerCase()
      if (!tags.has(key)) tags.set(key, tag)
    }
  }

  return [...tags.values()].sort((a, b) => a.localeCompare(b))
}

function parseTask(value: unknown): Task | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Partial<Task>

  if (
    typeof candidate.id !== 'string' ||
    candidate.id.length === 0 ||
    typeof candidate.title !== 'string' ||
    candidate.title.trim().length === 0 ||
    typeof candidate.completed !== 'boolean' ||
    typeof candidate.createdAt !== 'number' ||
    !Number.isFinite(candidate.createdAt) ||
    typeof candidate.focusSessions !== 'number' ||
    !Number.isInteger(candidate.focusSessions) ||
    candidate.focusSessions < 0 ||
    typeof candidate.focusMinutes !== 'number' ||
    !Number.isFinite(candidate.focusMinutes) ||
    candidate.focusMinutes < 0
  ) {
    return null
  }

  return {
    id: candidate.id,
    title: candidate.title.trim().slice(0, MAX_TASK_TITLE_LENGTH),
    completed: candidate.completed,
    createdAt: candidate.createdAt,
    focusSessions: candidate.focusSessions,
    focusMinutes: candidate.focusMinutes,
    priority: isTaskPriority(candidate.priority)
      ? candidate.priority
      : DEFAULT_TASK_PRIORITY,
    tags: Array.isArray(candidate.tags)
      ? normalizeTags(
          candidate.tags.filter((tag): tag is string => typeof tag === 'string'),
        )
      : [],
    estimatedSessions: normalizeEstimatedSessions(candidate.estimatedSessions),
  }
}

/** Validate and restore a persisted task list, discarding malformed entries. */
export function parseTaskState(raw: string | null): TaskState {
  if (!raw) return { ...EMPTY_TASK_STATE, tasks: [] }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { tasks: [], activeTaskId: null }
    }

    const candidate = parsed as {
      tasks?: unknown
      activeTaskId?: unknown
    }
    const seen = new Set<string>()
    const tasks = (Array.isArray(candidate.tasks) ? candidate.tasks : [])
      .map(parseTask)
      .filter((task): task is Task => {
        if (task === null || seen.has(task.id)) return false
        seen.add(task.id)
        return true
      })
    const activeTaskId =
      typeof candidate.activeTaskId === 'string' &&
      tasks.some((task) => task.id === candidate.activeTaskId)
        ? candidate.activeTaskId
        : null

    return { tasks, activeTaskId }
  } catch {
    return { tasks: [], activeTaskId: null }
  }
}
