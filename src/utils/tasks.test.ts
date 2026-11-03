import { describe, expect, it } from 'vitest'
import {
  MAX_TASK_TITLE_LENGTH,
  addTask,
  createTask,
  creditFocusSession,
  deleteTask,
  parseTaskState,
  setActiveTask,
  toggleTask,
  type TaskState,
} from './tasks'

const NOW = 1_700_000_000_000

function stateWithTasks(): TaskState {
  let state = addTask({ tasks: [], activeTaskId: null }, 'Write report', NOW, 'a')
  state = addTask(state, 'Review PR', NOW, 'b')
  return state
}

describe('createTask', () => {
  it('trims whitespace and rejects blank titles', () => {
    expect(createTask('  Ship it  ', NOW, 'a')).toEqual({
      id: 'a',
      title: 'Ship it',
      completed: false,
      createdAt: NOW,
      focusSessions: 0,
      focusMinutes: 0,
    })
    expect(createTask('   ', NOW, 'b')).toBeNull()
  })

  it('caps the title length', () => {
    const task = createTask('x'.repeat(MAX_TASK_TITLE_LENGTH + 20), NOW, 'a')
    expect(task?.title).toHaveLength(MAX_TASK_TITLE_LENGTH)
  })
})

describe('addTask', () => {
  it('prepends tasks and focuses the first task automatically', () => {
    const state = stateWithTasks()
    expect(state.tasks.map((task) => task.title)).toEqual([
      'Review PR',
      'Write report',
    ])
    expect(state.activeTaskId).toBe('a')
  })

  it('keeps an existing active task', () => {
    let state = stateWithTasks()
    state = setActiveTask(state, 'a')
    state = addTask(state, 'Plan sprint', NOW, 'c')
    expect(state.activeTaskId).toBe('a')
    expect(state.tasks).toHaveLength(3)
  })

  it('ignores blank titles', () => {
    const state = stateWithTasks()
    expect(addTask(state, '  ', NOW, 'c')).toBe(state)
  })
})

describe('toggleTask', () => {
  it('completes and reopens a task', () => {
    let state = stateWithTasks()
    state = toggleTask(state, 'a')
    expect(state.tasks.find((task) => task.id === 'a')?.completed).toBe(true)
    state = toggleTask(state, 'a')
    expect(state.tasks.find((task) => task.id === 'a')?.completed).toBe(false)
  })

  it('clears the current focus when the active task is completed', () => {
    const state = toggleTask(setActiveTask(stateWithTasks(), 'b'), 'b')
    expect(state.activeTaskId).toBeNull()
  })

  it('ignores unknown ids', () => {
    const state = stateWithTasks()
    expect(toggleTask(state, 'missing')).toBe(state)
  })
})

describe('deleteTask', () => {
  it('removes a task and clears it when active', () => {
    const state = deleteTask(setActiveTask(stateWithTasks(), 'b'), 'b')
    expect(state.tasks.map((task) => task.id)).toEqual(['a'])
    expect(state.activeTaskId).toBeNull()
  })

  it('keeps the active task when deleting another task', () => {
    const state = deleteTask(stateWithTasks(), 'b')
    expect(state.activeTaskId).toBe('a')
  })
})

describe('setActiveTask', () => {
  it('selects, reselects, and clears the active task', () => {
    let state = stateWithTasks()
    state = setActiveTask(state, 'a')
    expect(state.activeTaskId).toBe('a')
    expect(setActiveTask(state, 'a')).toBe(state)
    expect(setActiveTask(state, null).activeTaskId).toBeNull()
  })

  it('ignores unknown ids', () => {
    const state = stateWithTasks()
    expect(setActiveTask(state, 'missing')).toBe(state)
  })
})

describe('creditFocusSession', () => {
  it('adds a session and minutes to the active task only', () => {
    const state = creditFocusSession(setActiveTask(stateWithTasks(), 'b'), 25)
    const active = state.tasks.find((task) => task.id === 'b')
    const other = state.tasks.find((task) => task.id === 'a')

    expect(active?.focusSessions).toBe(1)
    expect(active?.focusMinutes).toBe(25)
    expect(other?.focusSessions).toBe(0)
  })

  it('does nothing without an active task', () => {
    const state: TaskState = { ...stateWithTasks(), activeTaskId: null }
    expect(creditFocusSession(state, 25)).toBe(state)
  })

  it('ignores invalid minute values', () => {
    const state = creditFocusSession(
      setActiveTask(stateWithTasks(), 'b'),
      Number.NaN,
    )
    expect(state.tasks.find((task) => task.id === 'b')?.focusMinutes).toBe(0)
  })
})

describe('parseTaskState', () => {
  it('returns an empty state for missing or malformed data', () => {
    expect(parseTaskState(null)).toEqual({ tasks: [], activeTaskId: null })
    expect(parseTaskState('nope')).toEqual({ tasks: [], activeTaskId: null })
    expect(parseTaskState('{}')).toEqual({ tasks: [], activeTaskId: null })
  })

  it('discards invalid tasks and dangling active ids', () => {
    const raw = JSON.stringify({
      tasks: [
        {
          id: 'a',
          title: 'Keep me',
          completed: false,
          createdAt: NOW,
          focusSessions: 2,
          focusMinutes: 50,
        },
        { id: 'b', title: '' },
      ],
      activeTaskId: 'b',
    })
    const parsed = parseTaskState(raw)
    expect(parsed.tasks).toHaveLength(1)
    expect(parsed.activeTaskId).toBeNull()
  })

  it('restores a valid active task', () => {
    const raw = JSON.stringify({
      tasks: [
        {
          id: 'a',
          title: 'Keep me',
          completed: false,
          createdAt: NOW,
          focusSessions: 0,
          focusMinutes: 0,
        },
      ],
      activeTaskId: 'a',
    })
    expect(parseTaskState(raw).activeTaskId).toBe('a')
  })
})
