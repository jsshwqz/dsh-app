import { useEffect, useState, useCallback } from 'react'
import { generateId, formatTitle } from './lib/utils.js'
import type { Session } from './lib/types.js'

const STORAGE_KEY = 'dsh-sessions-v1'
const ACTIVE_KEY = 'dsh-active-session-id'

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function loadActiveId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
}

function saveSessions(sessions: Session[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

function saveActiveId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions)
  const [activeId, setActiveId] = useState<string | null>(loadActiveId)

  // Persist sessions to localStorage whenever they change
  useEffect(() => { saveSessions(sessions) }, [sessions])

  // Persist active session ID
  useEffect(() => { saveActiveId(activeId) }, [activeId])

  const activeSession = sessions.find(s => s.id === activeId) ?? null

  const createSession = useCallback((model?: string): Session => {
    const now = Date.now()
    const s: Session = {
      id: 'sess_' + generateId(),
      title: 'New Session',
      model: model ?? 'deepseek-v4-flash',
      createdAt: now,
      lastActivity: now,
      messages: [],
    }
    setSessions(prev => [s, ...prev])
    setActiveId(s.id)
    return s
  }, [])

  const switchSession = useCallback((id: string): void => {
    setActiveId(id)
  }, [])

  const renameSession = useCallback((id: string, title: string): void => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
  }, [])

  const deleteSession = useCallback((id: string): void => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (activeId === id) {
        setActiveId(next[0]?.id ?? null)
      }
      return next
    })
  }, [activeId])

  const addMessage = useCallback((sessionId: string, role: 'user' | 'assistant', content: string): Message => {
    const msg: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
    }
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s
      return { ...s, messages: [...s.messages, msg], lastActivity: Date.now(), title: s.messages.length === 0 ? formatTitle(content) : s.title }
    }))
    return msg
  }, [])

  return {
    sessions,
    activeSession,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    addMessage,
  }
}