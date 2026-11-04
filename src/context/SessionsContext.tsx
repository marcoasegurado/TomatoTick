import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createId } from '../utils/id'
import {
  SESSIONS_STORAGE_KEY,
  addSession,
  parseSessions,
  type FocusSession,
} from '../utils/sessions'

export interface NewSession {
  completedAt: number
  durationMs: number
  taskId: string | null
  taskTitle: string | null
}

interface SessionsContextValue {
  sessions: FocusSession[]
  recordFocusSession: (session: NewSession) => void
  replaceSessions: (sessions: FocusSession[]) => void
}

const SessionsContext = createContext<SessionsContextValue | undefined>(
  undefined,
)

function loadSessions(): FocusSession[] {
  try {
    return parseSessions(localStorage.getItem(SESSIONS_STORAGE_KEY))
  } catch {
    return []
  }
}

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<FocusSession[]>(loadSessions)

  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
    } catch {
      // Storage can be unavailable; stats still work for this session.
    }
  }, [sessions])

  const recordFocusSession = useCallback((session: NewSession) => {
    setSessions((current) =>
      addSession(current, { id: createId('session'), ...session }),
    )
  }, [])

  const replaceSessions = useCallback((next: FocusSession[]) => {
    setSessions(parseSessions(JSON.stringify(next)))
  }, [])

  const value = useMemo(
    () => ({ sessions, recordFocusSession, replaceSessions }),
    [sessions, recordFocusSession, replaceSessions],
  )

  return (
    <SessionsContext.Provider value={value}>
      {children}
    </SessionsContext.Provider>
  )
}

export function useSessions(): SessionsContextValue {
  const context = useContext(SessionsContext)
  if (!context) {
    throw new Error('useSessions must be used within a SessionsProvider')
  }
  return context
}
