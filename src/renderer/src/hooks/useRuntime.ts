import { useEffect, useState, useCallback, useRef } from 'react'
import { useSessions } from './useSessions.js'
import type { Message, RuntimeStatus } from '../lib/types.js'

export function useRuntime() {
  const { sessions, activeSession, addMessage } = useSessions()
  const [status, setStatus] = useState<RuntimeStatus>({ connected: false, error: null, provider: '', model: '' })
  const [response, setResponse] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  // Ref to avoid stale closure in event listeners
  const statusRef = useRef(status)
  statusRef.current = status

  useEffect(() => {
    const unsub = window.dsDesktop.runtime.onStatus((s) => {
      setStatus(s)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = window.dsDesktop.runtime.onEvent((_sessionId, _event) => {
      // Runtime events (session.event, session.status, subagent.*) are handled by the main process
      // and forwarded to the renderer via the preload bridge.
      // The session.status change can trigger UI updates if needed.
    })
    return () => unsub()
  }, [])

  const prompt = useCallback(async (sessionId: string, content: string): Promise<void> => {
    if (!activeSession) return
    addMessage(sessionId, 'user', content)
    setIsLoading(true)
    setResponse('')
    try {
      const result = await window.dsDesktop.runtime.prompt(sessionId, content)
      addMessage(sessionId, 'assistant', result.response)
      setResponse(result.response)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      addMessage(sessionId, 'assistant', '[Error] ' + msg)
      setResponse('[Error] ' + msg)
    } finally {
      setIsLoading(false)
    }
  }, [activeSession, addMessage])

  const restart = useCallback(async () => {
    await window.dsDesktop.runtime.restart()
  }, [])

  const messages = activeSession?.messages ?? []

  return { status, response, isLoading, messages, prompt, restart }
}