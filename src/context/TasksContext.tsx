import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  EMPTY_TASK_STATE,
  TASKS_STORAGE_KEY,
  addTask as addTaskToState,
  creditFocusSession as creditFocusSessionInState,
  deleteTask as deleteTaskFromState,
  parseTaskState,
  setActiveTask as setActiveTaskInState,
  toggleTask as toggleTaskInState,
  type Task,
  type TaskState,
} from '../utils/tasks'
import { createId } from '../utils/id'

interface TasksContextValue extends TaskState {
  activeTask: Task | null
  addTask: (title: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  setActiveTask: (id: string | null) => void
  creditFocusSession: (minutes: number) => void
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined)

function loadTasks(): TaskState {
  try {
    return parseTaskState(localStorage.getItem(TASKS_STORAGE_KEY))
  } catch {
    return { ...EMPTY_TASK_STATE, tasks: [] }
  }
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TaskState>(loadTasks)

  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage can be unavailable; tasks still work for this session.
    }
  }, [state])

  const addTask = useCallback((title: string) => {
    setState((current) =>
      addTaskToState(current, title, Date.now(), createId('task')),
    )
  }, [])

  const toggleTask = useCallback((id: string) => {
    setState((current) => toggleTaskInState(current, id))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setState((current) => deleteTaskFromState(current, id))
  }, [])

  const setActiveTask = useCallback((id: string | null) => {
    setState((current) => setActiveTaskInState(current, id))
  }, [])

  const creditFocusSession = useCallback((minutes: number) => {
    setState((current) => creditFocusSessionInState(current, minutes))
  }, [])

  const activeTask = useMemo(
    () =>
      state.tasks.find((task) => task.id === state.activeTaskId) ?? null,
    [state.tasks, state.activeTaskId],
  )

  const value = useMemo(
    () => ({
      ...state,
      activeTask,
      addTask,
      toggleTask,
      deleteTask,
      setActiveTask,
      creditFocusSession,
    }),
    [
      state,
      activeTask,
      addTask,
      toggleTask,
      deleteTask,
      setActiveTask,
      creditFocusSession,
    ],
  )

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  )
}

export function useTasks(): TasksContextValue {
  const context = useContext(TasksContext)
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider')
  }
  return context
}
