import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEffect, useRef, useState, useCallback, memo } from 'react'
import type { Message } from '../lib/types.js'

interface Props {
  messages: Message[]
  isLoading: boolean
  onFeedback?: (msgId: string, kind: 'like' | 'dislike') => void
  onRerun?: (msgId: string) => void
  onScrollBottom?: () => void
}

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const LikeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
)

const DislikeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
    <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

const ImageIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const ScrollBottomIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const CopySuccess = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

function CodeBlock({ node, className, children, ...props }: { node?: any; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const match = /language-(\w+)/.exec(className || '')
  const [copied, setCopied] = useState(false)
  const lang = match ? match[1] : ''

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(String(children)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{lang || 'text'}</span>
        <button className="code-copy-btn" onClick={handleCopy} title="Copy">
          {copied ? <CopySuccess /> : <CopyIcon />}
          {copied ? ' Copied' : ''}
        </button>
      </div>
      <code className={className}>{children}</code>
    </div>
  )
}

function ImagePreview({ src, alt }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false)
  if (!src.startsWith('http') && !src.startsWith('data:')) return null
  return (
    <div className="image-preview" onClick={() => setOpen(true)}>
      <img src={src} alt={alt || ''} />
      {open && (
        <div className="image-modal" onClick={() => setOpen(false)}>
          <img src={src} alt={alt || ''} />
        </div>
      )}
    </div>
  )
}

const MessageBubble = memo(function MessageBubble({
  message,
  onFeedback,
  onRerun,
}: {
  message: Message
  onFeedback?: (msgId: string, kind: 'like' | 'dislike') => void
  onRerun?: (msgId: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  const handleFeedback = useCallback((kind: 'like' | 'dislike') => {
    if (feedback === kind) {
      setFeedback(null)
      onFeedback?.(message.id, kind)
    } else {
      setFeedback(kind)
      onFeedback?.(message.id, kind)
    }
  }, [feedback, message.id, onFeedback])

  const isAssistant = message.role === 'assistant'

  return (
    <div className={["message", isAssistant ? 'assistant-msg' : 'user-msg'].join(' ')}>
      <div className={['message-avatar', message.role].join(' ')}>
        {isAssistant ? 'D' : 'Y'}
      </div>
      <div className="message-content">
        <div className="message-sender">
          {isAssistant ? 'DSH Agent' : 'You'}
          <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="message-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock, img: ({ src, alt }) => <ImagePreview src={src || ''} alt={alt} /> }}>{message.content}</ReactMarkdown>
        </div>
        {isAssistant && (
          <div className="message-actions">
            <button className="msg-action" onClick={handleCopy} title="Copy">
              {copied ? <CopySuccess /> : <CopyIcon />}
              {copied ? ' Copied' : ' Copy'}
            </button>
            <button className={["msg-action", feedback === 'like' ? 'active' : ''].join(' ')} onClick={() => handleFeedback('like')} title="Helpful">
              <LikeIcon />
              <span>Like</span>
            </button>
            <button className={["msg-action", feedback === 'dislike' ? 'active' : ''].join(' ')} onClick={() => handleFeedback('dislike')} title="Not helpful">
              <DislikeIcon />
              <span>Dislike</span>
            </button>
            <button className="msg-action" onClick={() => onRerun?.(message.id)} title="Regenerate">
              <RefreshIcon />
              <span>Regenerate</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

export function ChatArea({ messages, isLoading, onFeedback, onRerun, onScrollBottom }: Props) {
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    setAtBottom(isAtBottom)
    setShowScrollBtn(scrollHeight > clientHeight)
  }, [])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (messages.length === 0) {
    return (
      <div className="chat-area" ref={scrollRef}>
        <div className="welcome">
          <div className="welcome-logo">DH</div>
          <div className="welcome-title">DeepSeek Harness Desktop</div>
          <div className="welcome-sub">
            A multi-platform desktop client for the DeepSeek Harness agent framework.
          </div>
          <div className="welcome-actions">
            <span className="welcome-action">Cmd+N <span className="key">new</span></span>
            <span className="welcome-action">Cmd+B <span className="key">sidebar</span></span>
            <span className="welcome-action">Cmd+, <span className="key">settings</span></span>
            <span className="welcome-action">Cmd+Enter <span className="key">send</span></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-area" ref={scrollRef}>
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onFeedback={onFeedback} onRerun={onRerun} />
      ))}
      {isLoading && (
        <div className="message">
          <div className="message-avatar assistant">D</div>
          <div className="message-content">
            <div className="message-sender">DSH Agent</div>
            <div className="typing-indicator"><span /><span /><span /></div>
          </div>
        </div>
      )}
      <div ref={messagesEnd} />
      {showScrollBtn && !atBottom && (
        <button className="scroll-bottom-btn" onClick={() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })} title="Scroll to bottom">
          <ScrollBottomIcon />
        </button>
      )}
    </div>
  )
}