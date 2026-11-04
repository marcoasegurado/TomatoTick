import {
  parseSettings,
  type Settings,
} from './settings'
import { parseSessions, type FocusSession } from './sessions'
import { parseTaskState, type TaskState } from './tasks'

export const BACKUP_APP = 'TomatoTick'
export const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  /** ISO timestamp of when the backup was created. */
  exportedAt: string
  data: {
    settings: Settings
    tasks: TaskState
    sessions: FocusSession[]
  }
}

export type BackupParseResult =
  | { ok: true; backup: Backup; warnings: string[] }
  | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}

/** Build a portable snapshot of everything worth keeping. */
export function createBackup(
  settings: Settings,
  tasks: TaskState,
  sessions: FocusSession[],
  now: number = Date.now(),
): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date(now).toISOString(),
    data: { settings, tasks, sessions },
  }
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2)
}

/**
 * Validate a backup file. Malformed tasks and sessions are dropped with a
 * warning; anything that makes the file untrustworthy is rejected outright.
 */
export function parseBackup(raw: string): BackupParseResult {
  if (raw.length > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      error: 'This backup file is too large (5 MB maximum).',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'This file is not a TomatoTick backup.' }
  }

  if (parsed.app !== BACKUP_APP) {
    return { ok: false, error: 'This file is not a TomatoTick backup.' }
  }

  if (parsed.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Backup version ${String(
        parsed.version,
      )} is not supported. This app reads version ${BACKUP_VERSION}.`,
    }
  }

  if (
    typeof parsed.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(parsed.exportedAt))
  ) {
    return { ok: false, error: 'This backup is missing a valid export date.' }
  }

  if (!isRecord(parsed.data)) {
    return { ok: false, error: 'This backup does not contain any data.' }
  }

  const { settings, tasks, sessions } = parsed.data

  if (!isRecord(settings)) {
    return { ok: false, error: 'This backup has no valid settings.' }
  }
  if (!isRecord(tasks) || !Array.isArray(tasks.tasks)) {
    return { ok: false, error: 'This backup has no valid task list.' }
  }
  if (!Array.isArray(sessions)) {
    return { ok: false, error: 'This backup has no valid session history.' }
  }

  const warnings: string[] = []

  const parsedSettings = parseSettings(JSON.stringify(settings))
  const parsedTasks = parseTaskState(JSON.stringify(tasks))
  const parsedSessions = parseSessions(JSON.stringify(sessions))

  const droppedTasks = tasks.tasks.length - parsedTasks.tasks.length
  if (droppedTasks > 0) {
    warnings.push(
      `${droppedTasks} invalid ${plural(
        droppedTasks,
        'task was',
        'tasks were',
      )} skipped.`,
    )
  }

  const droppedSessions = sessions.length - parsedSessions.length
  if (droppedSessions > 0) {
    warnings.push(
      `${droppedSessions} invalid ${plural(
        droppedSessions,
        'session was',
        'sessions were',
      )} skipped.`,
    )
  }

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: parsed.exportedAt,
      data: {
        settings: parsedSettings,
        tasks: parsedTasks,
        sessions: parsedSessions,
      },
    },
    warnings,
  }
}
