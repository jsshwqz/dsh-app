import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { copyToClipboard } from '../lib/utils.js'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatAreaProps {
  messages: Message[]
  isLoading: boolean
  onFeedback: (msgId: string, kind: string) => void
  onRerun: (msgId: string) => void
}

export function ChatArea({ messages, isLoading, onFeedback, onRerun }: ChatAreaProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const handleCopy = useCallback((text: string, id: string) => {
    copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleImageClick = useCallback((src: string) => { setExpandedImage(src) }, [])
  const handleImageClose = useCallback(() => { setExpandedImage(null) }, [])

  return (
    <div className="chat-area">
      {messages.length === 0 ? (
        <div className="chat-welcome">
          <div className="chat-welcome-title">Welcome to DSH Desktop</div>
          <div className="chat-welcome-sub">Start a new conversation or select a session from the sidebar.</div>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? 'message message-user' : 'message message-assistant'}>
            <div className="message-header">
              <span className="message-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
              <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="message-body">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            <div className="message-actions">
              <button onClick={() => handleCopy(msg.content, msg.id)} title="Copy">
                {copiedId === msg.id ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                )}
              </button>
              {msg.role === 'assistant' && (
                <button onClick={() => onFeedback(msg.id, 'like')} title="Like">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /></svg>
                </button>
              )}
              {msg.role === 'assistant' && (
                <button onClick={() => onFeedback(msg.id, 'dislike')} title="Dislike">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" /></svg>
                </button>
              )}
              {msg.role === 'assistant' && (
                <button onClick={() => onRerun(msg.id)} title="Rerun">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>
                </button>
              )}
            </div>
          </div>
        ))
      )}
      {isLoading && (
        <div className="message message-assistant loading">
          <div className="message-body">
            <div className="typing-indicator">
              <span><i /></span>
              <span><i /></span>
              <span><i /></span>
            </div>
          </div>
        </div>
      )}
      {expandedImage && (
        <div className="image-modal" onClick={handleImageClose}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={handleImageClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <img src={expandedImage} alt="" />
          </div>
        </div>
      )}
    </div>
  )
}