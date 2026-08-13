import { useEffect, useState, useCallback, useRef } from 'react'

type Session = {
  id: string
  title: string
  model: string
  createdAt: number
  lastActivity: number
  messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>,
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const refreshRef = useRef(false)

  // Load sessions on mount and when refresh requested
  useEffect(() => {
    window.dsDesktop.sessions.list().then(setSessions).catch(() => {})
    window.dsDesktop.sessions.active().then(setActiveId).catch(() => {})
    const unsub = window.dsDesktop.app.onToggleSidebar(() => {})
    return () => unsub()
  }, [])

  // Force refresh on demand
  useEffect(() => {
    if (refreshRef.current) {
      refreshRef.current = false
      window.dsDesktop.sessions.list().then(setSessions).catch(() => {})
      window.dsDesktop.sessions.active().then(setActiveId).catch(() => {})
    }
  }, [refreshRef.current])

  const activeSession = sessions.find(s => s.id === activeId) ?? null

  const loadSessions = useCallback(async () => {
    refreshRef.current = true
  }, [])

  const createSession = useCallback(async (model?: string): Promise<Session> => {
    const s = await window.dsDesktop.sessions.create(model)
    await window.dsDesktop.sessions.switch(s.id)
    loadSessions()
    return s
  }, [loadSessions])

  const switchSession = useCallback(async (id: string): Promise<void> => {
    await window.dsDesktop.sessions.switch(id)
    setActiveId(id)
  }, [])

  const renameSession = useCallback(async (id: string, title: string): Promise<void> => {
    await window.dsDesktop.sessions.rename(id, title)
    loadSessions()
  }, [loadSessions])

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    await window.dsDesktop.sessions.delete(id)
    await window.dsDesktop.sessions.active().then(setActiveId).catch(() => {})
    loadSessions()
  }, [loadSessions])

  const searchSessions = useCallback(async (query: string): Promise<Session[]> => {
    if (!query.trim()) return sessions
    return window.dsDesktop.sessions.search(query)
  }, [sessions])

  return {
    sessions,
    activeSession,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    searchSessions,
    loadSessions,
  }
}