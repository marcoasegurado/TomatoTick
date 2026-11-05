import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TASK_PRIORITY,
  MAX_ESTIMATED_SESSIONS,
  MAX_TAGS_PER_TASK,
  MAX_TASK_TITLE_LENGTH,
  addTask,
  createTask,
  creditFocusSession,
  deleteTask,
  filterTasks,
  getAllTags,
  normalizeEstimatedSessions,
  normalizeTags,
  parseTaskState,
  selectTasks,
  setActiveTask,
  sortTasks,
  toggleTask,
  updateTask,
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
      priority: DEFAULT_TASK_PRIORITY,
      tags: [],
      estimatedSessions: 0,
    })
    expect(createTask('   ', NOW, 'b')).toBeNull()
  })

  it('caps the title length', () => {
    const task = createTask('x'.repeat(MAX_TASK_TITLE_LENGTH + 20), NOW, 'a')
    expect(task?.title).toHaveLength(MAX_TASK_TITLE_LENGTH)
  })

  it('accepts priority, tags, and an estimate', () => {
    const task = createTask('Plan sprint', NOW, 'a', {
      priority: 'high',
      tags: [' Work ', 'work', 'Deep', 'Focus'],
      estimatedSessions: 4,
    })

    expect(task?.priority).toBe('high')
    expect(task?.tags).toEqual(['Work', 'Deep', 'Focus'])
    expect(task?.estimatedSessions).toBe(4)
  })

  it('falls back to safe defaults for invalid options', () => {
    const task = createTask('Plan sprint', NOW, 'a', {
      priority: 'urgent' as unknown as 'high',
      tags: [],
      estimatedSessions: -3,
    })

    expect(task?.priority).toBe(DEFAULT_TASK_PRIORITY)
    expect(task?.estimatedSessions).toBe(0)
  })
})

describe('normalizeTags', () => {
  it('trims, de-duplicates case-insensitively, and caps the list', () => {
    const tags = normalizeTags([
      ' Work ',
      'work',
      '',
      'Deep Focus',
      'a',
      'b',
      'c',
      'd',
    ])

    expect(tags).toEqual(['Work', 'Deep Focus', 'a', 'b', 'c', 'd'])
    expect(tags).toHaveLength(MAX_TAGS_PER_TASK)
  })
})

describe('normalizeEstimatedSessions', () => {
  it('rounds, clamps, and rejects invalid values', () => {
    expect(normalizeEstimatedSessions(3)).toBe(3)
    expect(normalizeEstimatedSessions(3.6)).toBe(4)
    expect(normalizeEstimatedSessions(0)).toBe(0)
    expect(normalizeEstimatedSessions(-1)).toBe(0)
    expect(normalizeEstimatedSessions(Number.NaN)).toBe(0)
    expect(normalizeEstimatedSessions(MAX_ESTIMATED_SESSIONS + 10)).toBe(
      MAX_ESTIMATED_SESSIONS,
    )
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

describe('updateTask', () => {
  it('edits the title, priority, tags, and estimate', () => {
    const state = updateTask(stateWithTasks(), 'a', {
      title: '  Write final report  ',
      priority: 'high',
      tags: [' Work ', 'Reporting'],
      estimatedSessions: 4,
    })
    const task = state.tasks.find((item) => item.id === 'a')

    expect(task?.title).toBe('Write final report')
    expect(task?.priority).toBe('high')
    expect(task?.tags).toEqual(['Work', 'Reporting'])
    expect(task?.estimatedSessions).toBe(4)
  })

  it('keeps the active task selected across edits', () => {
    const state = updateTask(stateWithTasks(), 'a', { title: 'Renamed' })
    expect(state.activeTaskId).toBe('a')
  })

  it('rejects blank titles and invalid priorities', () => {
    const state = stateWithTasks()
    expect(updateTask(state, 'a', { title: '   ' })).toBe(state)
    expect(
      updateTask(state, 'a', {
        priority: 'urgent' as unknown as 'high',
      }),
    ).toBe(state)
  })

  it('rejects negative estimates and ignores unknown ids', () => {
    const state = stateWithTasks()
    expect(updateTask(state, 'a', { estimatedSessions: -1 })).toBe(state)
    expect(updateTask(state, 'missing', { title: 'Nope' })).toBe(state)
  })

  it('clears an estimate and normalizes excess tags', () => {
    const state = updateTask(
      updateTask(stateWithTasks(), 'a', { estimatedSessions: 3 }),
      'a',
      {
        estimatedSessions: 0,
        tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      },
    )
    const task = state.tasks.find((item) => item.id === 'a')
    expect(task?.estimatedSessions).toBe(0)
    expect(task?.tags).toHaveLength(MAX_TAGS_PER_TASK)
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

describe('filterTasks', () => {
  function filterState(): TaskState {
    let state = stateWithTasks()
    state = updateTask(state, 'a', {
      priority: 'high',
      tags: ['Work'],
    })
    state = updateTask(state, 'b', {
      priority: 'low',
      tags: ['Review', 'Work'],
    })
    state = toggleTask(state, 'b')
    return state
  }

  it('filters all, active, and completed tasks', () => {
    const state = filterState()
    expect(filterTasks(state.tasks, 'all')).toHaveLength(2)
    expect(filterTasks(state.tasks, 'active').map((task) => task.id)).toEqual([
      'a',
    ])
    expect(
      filterTasks(state.tasks, 'completed').map((task) => task.id),
    ).toEqual(['b'])
  })

  it('filters by tag case-insensitively', () => {
    const state = filterState()
    expect(
      filterTasks(state.tasks, 'all', 'work').map((task) => task.id),
    ).toEqual(['b', 'a'])
    expect(
      filterTasks(state.tasks, 'all', 'missing').map((task) => task.id),
    ).toEqual([])
  })
})

describe('sortTasks', () => {
  function sortState(): TaskState {
    let state = stateWithTasks()
    state = updateTask(state, 'a', { priority: 'low' })
    state = updateTask(state, 'b', { priority: 'high' })
    return state
  }

  it('sorts by priority, with completed tasks last within a priority', () => {
    const state = sortState()
    const sorted = sortTasks(state.tasks, 'priority')
    expect(sorted.map((task) => task.id)).toEqual(['b', 'a'])

    const completedHigh = toggleTask(state, 'b')
    expect(
      sortTasks(completedHigh.tasks, 'priority').map((task) => task.id),
    ).toEqual(['a', 'b'])
  })

  it('sorts newest first', () => {
    const state = addTask(stateWithTasks(), 'Newest', NOW + 10_000, 'c')
    expect(sortTasks(state.tasks, 'newest').map((task) => task.id)).toEqual([
      'c',
      'b',
      'a',
    ])
  })
})

describe('selectTasks', () => {
  it('combines filtering, tag filtering, and sorting', () => {
    let state = stateWithTasks()
    state = updateTask(state, 'a', { priority: 'high', tags: ['Work'] })
    state = updateTask(state, 'b', { priority: 'low', tags: ['Work'] })
    state = addTask(state, 'Personal', NOW, 'c', { tags: ['Home'] })

    expect(
      selectTasks(state.tasks, 'active', 'work', 'priority').map(
        (task) => task.id,
      ),
    ).toEqual(['a', 'b'])
  })
})

describe('getAllTags', () => {
  it('collects unique tags in alphabetical order', () => {
    let state = stateWithTasks()
    state = updateTask(state, 'a', { tags: ['Work', 'Deep Focus'] })
    state = updateTask(state, 'b', { tags: ['work', 'Review'] })

    expect(getAllTags(state.tasks)).toEqual(['Deep Focus', 'Review', 'work'])
  })
})

describe('parseTaskState', () => {
  it('returns an empty state for missing or malformed data', () => {
    expect(parseTaskState(null)).toEqual({ tasks: [], activeTaskId: null })
    expect(parseTaskState('nope')).toEqual({ tasks: [], activeTaskId: null })
    expect(parseTaskState('{}')).toEqual({ tasks: [], activeTaskId: null })
  })

  it('migrates tasks saved before priorities, tags, and estimates', () => {
    const raw = JSON.stringify({
      tasks: [
        {
          id: 'a',
          title: 'Legacy task',
          completed: false,
          createdAt: NOW,
          focusSessions: 2,
          focusMinutes: 50,
        },
      ],
      activeTaskId: 'a',
    })
    const parsed = parseTaskState(raw)

    expect(parsed.tasks[0]).toMatchObject({
      id: 'a',
      priority: DEFAULT_TASK_PRIORITY,
      tags: [],
      estimatedSessions: 0,
    })
    expect(parsed.activeTaskId).toBe('a')
  })

  it('restores new fields and sanitizes invalid ones', () => {
    const raw = JSON.stringify({
      tasks: [
        {
          id: 'a',
          title: 'Organized',
          completed: false,
          createdAt: NOW,
          focusSessions: 1,
          focusMinutes: 25,
          priority: 'high',
          tags: [' Work ', 'work', 'Deep'],
          estimatedSessions: 3,
        },
        {
          id: 'b',
          title: 'Fallbacks',
          completed: true,
          createdAt: NOW,
          focusSessions: 0,
          focusMinutes: 0,
          priority: 'urgent',
          tags: 'not-an-array',
          estimatedSessions: 'lots',
        },
      ],
      activeTaskId: 'a',
    })
    const parsed = parseTaskState(raw)

    expect(parsed.tasks[0]).toMatchObject({
      priority: 'high',
      tags: ['Work', 'Deep'],
      estimatedSessions: 3,
    })
    expect(parsed.tasks[1]).toMatchObject({
      priority: DEFAULT_TASK_PRIORITY,
      tags: [],
      estimatedSessions: 0,
    })
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

  it('drops duplicate task ids', () => {
    const raw = JSON.stringify({
      tasks: [
        {
          id: 'a',
          title: 'First',
          completed: false,
          createdAt: NOW,
          focusSessions: 0,
          focusMinutes: 0,
        },
        {
          id: 'a',
          title: 'Duplicate',
          completed: false,
          createdAt: NOW,
          focusSessions: 0,
          focusMinutes: 0,
        },
      ],
      activeTaskId: 'a',
    })
    const parsed = parseTaskState(raw)
    expect(parsed.tasks).toHaveLength(1)
    expect(parsed.tasks[0].title).toBe('First')
  })
})
