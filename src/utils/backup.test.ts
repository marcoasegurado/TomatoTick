import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP,
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  createBackup,
  parseBackup,
  serializeBackup,
} from './backup'
import { DEFAULT_SETTINGS } from './settings'
import type { FocusSession } from './sessions'
import type { TaskState } from './tasks'

const now = Date.UTC(2026, 10, 4, 1, 30, 0)

const settings = { ...DEFAULT_SETTINGS, focus: 30, autoStart: true }

const tasks: TaskState = {
  tasks: [
    {
      id: 'task-1',
      title: 'Write tests',
      completed: false,
      createdAt: now - 60_000,
      focusSessions: 1,
      focusMinutes: 25,
      priority: 'high',
      tags: ['Work'],
      estimatedSessions: 4,
    },
  ],
  activeTaskId: 'task-1',
}

const sessions: FocusSession[] = [
  {
    id: 'session-1',
    completedAt: now - 30_000,
    durationMs: 25 * 60_000,
    taskId: 'task-1',
    taskTitle: 'Write tests',
  },
]

function roundTrip(raw: string) {
  const result = parseBackup(raw)
  if (!result.ok) throw new Error(result.error)
  return result
}

describe('backup', () => {
  it('round-trips settings, tasks, and sessions', () => {
    const backup = createBackup(settings, tasks, sessions, now)

    expect(backup.app).toBe(BACKUP_APP)
    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.exportedAt).toBe(new Date(now).toISOString())

    const result = roundTrip(serializeBackup(backup))
    expect(result.warnings).toEqual([])
    expect(result.backup.data.settings).toEqual(settings)
    expect(result.backup.data.tasks).toEqual(tasks)
    expect(result.backup.data.sessions).toEqual(sessions)
  })

  it('rejects files that are not valid JSON', () => {
    expect(parseBackup('{ nope')).toEqual({
      ok: false,
      error: 'This file is not valid JSON.',
    })
  })

  it('rejects backups from other apps', () => {
    const raw = JSON.parse(serializeBackup(createBackup(settings, tasks, sessions, now)))
    raw.app = 'SomeOtherApp'
    expect(parseBackup(JSON.stringify(raw))).toMatchObject({
      ok: false,
      error: 'This file is not a TomatoTick backup.',
    })
  })

  it('rejects unsupported versions', () => {
    const raw = JSON.parse(serializeBackup(createBackup(settings, tasks, sessions, now)))
    raw.version = 99
    const result = parseBackup(JSON.stringify(raw))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('version 99')
  })

  it('rejects missing or invalid export dates', () => {
    const raw = JSON.parse(serializeBackup(createBackup(settings, tasks, sessions, now)))
    raw.exportedAt = 'not-a-date'
    expect(parseBackup(JSON.stringify(raw))).toEqual({
      ok: false,
      error: 'This backup is missing a valid export date.',
    })
  })

  it('rejects oversized files before parsing', () => {
    expect(parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toMatchObject({
      ok: false,
      error: 'This backup file is too large (5 MB maximum).',
    })
  })

  it('drops malformed tasks and sessions with warnings', () => {
    const raw = JSON.parse(
      serializeBackup(createBackup(settings, tasks, sessions, now)),
    )
    raw.data.tasks.tasks.push({ id: 'broken' })
    raw.data.sessions.push({ id: 'broken' })

    const result = roundTrip(JSON.stringify(raw))
    expect(result.warnings).toEqual([
      '1 invalid task was skipped.',
      '1 invalid session was skipped.',
    ])
    expect(result.backup.data.tasks.tasks).toHaveLength(1)
    expect(result.backup.data.sessions).toHaveLength(1)
  })

  it('drops an active task id that does not exist', () => {
    const raw = JSON.parse(
      serializeBackup(createBackup(settings, tasks, sessions, now)),
    )
    raw.data.tasks.activeTaskId = 'missing-task'

    const result = roundTrip(JSON.stringify(raw))
    expect(result.backup.data.tasks.activeTaskId).toBeNull()
  })

  it('fills in task defaults for backups made before phase 11', () => {
    const raw = JSON.parse(
      serializeBackup(createBackup(settings, tasks, sessions, now)),
    )
    for (const task of raw.data.tasks.tasks) {
      delete task.priority
      delete task.tags
      delete task.estimatedSessions
    }

    const result = roundTrip(JSON.stringify(raw))
    expect(result.warnings).toEqual([])
    expect(result.backup.data.tasks.tasks[0]).toMatchObject({
      id: 'task-1',
      priority: 'medium',
      tags: [],
      estimatedSessions: 0,
    })
  })

  it('fills in defaults for missing settings fields', () => {
    const raw = JSON.parse(
      serializeBackup(createBackup(settings, tasks, sessions, now)),
    )
    raw.data.settings = { focus: 50 }

    const result = roundTrip(JSON.stringify(raw))
    expect(result.backup.data.settings.focus).toBe(50)
    expect(result.backup.data.settings.shortBreak).toBe(
      DEFAULT_SETTINGS.shortBreak,
    )
  })
})
