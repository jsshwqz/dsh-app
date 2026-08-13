import { useEffect, useState, useCallback, useRef } from 'react'

export function useRuntime() {
  const [status, setStatus] = useState<any>({ connected: false, error: null, provider: '', model: '' })
  const [response, setResponse] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const sessionsState = useRef<any>(null)

  useEffect(() => {
    const unsub = window.dsDesktop.runtime.onStatus((s: any) => setStatus(s))
    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = window.dsDesktop.runtime.onEvent((_sid: string, _e: any) => {})
    return () => unsub()
  }, [])

  const prompt = useCallback(async (sessionId: string, content: string): Promise<any> => {
    setIsLoading(true)
    setResponse('')
    try {
      const result = await window.dsDesktop.runtime.prompt(sessionId, content)
      setResponse(result.response ?? '')
      return result
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      setResponse('[Error] ' + msg)
      return { response: '[Error] ' + msg, ok: false }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const restart = useCallback(async () => {
    await window.dsDesktop.runtime.restart()
  }, [])

  return { status, response, isLoading, prompt, restart }
}