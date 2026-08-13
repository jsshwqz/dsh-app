import { useEffect, useState, useCallback, useRef } from 'react'
import { Sidebar } from './components/Sidebar.js'
import { ChatArea } from './components/ChatArea.js'
import { Composer } from './components/Composer.js'
import { Header } from './components/Header.js'
import { StatusBar } from './components/StatusBar.js'
import { SettingsPanel } from './components/SettingsPanel.js'
import { useSessions } from './hooks/useSessions.js'
import { useRuntime } from './hooks/useRuntime.js'

interface SelectionQuote {
  x: number
  y: number
  text: string
}

interface RefChip {
  id: string
  text: string
}

function useSelectionQuote(onQuote: (text: string) => void) {
  const [quote, setQuote] = useState<SelectionQuote | null>(null)

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setQuote(null)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const parent = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode
      if (parent && parent.closest && parent.closest('.composer')) { setQuote(null); return }
      setQuote({ x: Math.min(rect.left, window.innerWidth - 140), y: rect.bottom + 8, text: sel.toString().trim().slice(0, 40) })
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [onQuote])

  return quote
}

function SelectionQuotePopup({ quote, onQuote }: { quote: SelectionQuote | null; onQuote: (t: string) => void }) {
  if (!quote) return null
  return (
    <div className="quote-popup" style={{ left: quote.x, top: quote.y }}>
      <button onClick={() => { onQuote(quote.text) }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Quote
      </button>
      <span className="quote-text">{quote.text}</span>
    </div>
  )
}

export default function App() {
  const { sessions, activeSession, createSession, switchSession, renameSession, deleteSession } = useSessions()
  const { status, response, isLoading, prompt, messages } = useRuntime()
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [refs, setRefs] = useState<RefChip[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const handleNewSession = useCallback(() => {
    const s = createSession()
    switchSession(s.id)
  }, [createSession, switchSession])

  const handlePrompt = useCallback((content: string) => {
    if (!activeSession || !content.trim()) return
    prompt(activeSession.id, content.trim())
    setRefs([])
  }, [activeSession, prompt])

  const handleQuote = useCallback((text: string) => {
    setRefs(prev => [...prev, { id: 'ref_' + Date.now(), text }])
  }, [])

  const removeRef = useCallback((id: string) => {
    setRefs(prev => prev.filter(r => r.id !== id))
  }, [])

  const handleFeedback = useCallback((_msgId: string, _kind: string) => {}, [])
  const handleRerun = useCallback((msgId: string) => { if (!activeSession) return; prompt(activeSession.id, '/rerun ' + msgId) }, [activeSession, prompt])
  const handleFileAttach = useCallback((_files: File[]) => {}, [])

  const quote = useSelectionQuote(handleQuote)

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => { const unsub = window.dsDesktop.app.onNewSession(handleNewSession); return () => unsub() }, [handleNewSession])
  useEffect(() => { const unsub = window.dsDesktop.app.onToggleSidebar(() => setSidebarVisible(v => !v)); return () => unsub() }, [])
  useEffect(() => { const unsub = window.dsDesktop.app.onOpenSettings(() => setShowSettings(true)); return () => unsub() }, [])

  return (
    <div className="app">
      <SelectionQuotePopup quote={quote} onQuote={handleQuote} />
      {sidebarVisible && (
        <Sidebar sessions={sessions} activeId={activeSession?.id ?? null} onNew={handleNewSession} onSelect={switchSession} onRename={renameSession} onDelete={deleteSession} />
      )}
      <div className="main-area">
        <Header status={status} model={activeSession?.model ?? 'deepseek-v4-flash'} onToggleSidebar={() => setSidebarVisible(v => !v)} onOpenSettings={() => setShowSettings(true)} />
        <ChatArea messages={messages} isLoading={isLoading} onFeedback={handleFeedback} onRerun={handleRerun} />
        <div ref={chatEndRef} />
        {refs.length > 0 && (
          <div className="ref-chips">
            {refs.map(ref => (
              <span key={ref.id} className="ref-chip">
                <span className="ref-text">\"{ref.text}\"</span>
                <span className="ref-close" onClick={() => removeRef(ref.id)}>x</span>
              </span>
            ))}
          </div>
        )}
        <Composer
          onSend={handlePrompt}
          disabled={isLoading || !activeSession}
          onFileAttach={handleFileAttach}
          placeholder={activeSession ? 'Type a message... (select text to quote)' : 'Start a new session first'}
        />
        <StatusBar status={status} model={activeSession?.model ?? ''} />
      </div>
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}