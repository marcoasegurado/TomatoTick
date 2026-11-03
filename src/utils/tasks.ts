export const TASKS_STORAGE_KEY = 'tomatotick:tasks'
export const MAX_TASK_TITLE_LENGTH = 120

export interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: number
  /** Completed focus sessions credited to this task. */
  focusSessions: number
  /** Focus minutes credited to this task. */
  focusMinutes: number
}

export interface TaskState {
  tasks: Task[]
  activeTaskId: string | null
}

export const EMPTY_TASK_STATE: TaskState = {
  tasks: [],
  activeTaskId: null,
}

/** Validate a title and build a new task, or return null for blank input. */
export function createTask(
  title: string,
  now: number,
  id: string,
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
): TaskState {
  const task = createTask(title, now, id)
  if (!task) return state

  return {
    tasks: [task, ...state.tasks],
    // Focus the first task automatically, or replace a dangling active id.
    activeTaskId: hasTask(state, state.activeTaskId) ? state.activeTaskId : id,
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

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Task>
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0 &&
    typeof candidate.completed === 'boolean' &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    typeof candidate.focusSessions === 'number' &&
    Number.isInteger(candidate.focusSessions) &&
    candidate.focusSessions >= 0 &&
    typeof candidate.focusMinutes === 'number' &&
    Number.isFinite(candidate.focusMinutes) &&
    candidate.focusMinutes >= 0
  )
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
    const tasks = Array.isArray(candidate.tasks)
      ? candidate.tasks.filter(isTask)
      : []
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
