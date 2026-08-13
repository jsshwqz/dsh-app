import { useRef, useEffect, useCallback, useState } from 'react'

interface Props {
  onSend: (content: string) => void
  disabled: boolean
  placeholder: string
  onFileAttach?: (files: File[]) => void
}

interface AttachFile {
  name: string
  size: number
}

export function Composer({ onSend, disabled, placeholder, onFileAttach }: Props) {
  const [text, setText] = useState('')
  const [attached, setAttached] = useState<AttachFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(() => {
    if (text.trim() && !disabled) {
      onSend(text.trim())
      setText('')
      setAttached([])
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
  }, [text, disabled, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit() }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }, [handleSubmit])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    setAttached(fileList.map(f => ({ name: f.name, size: f.size })))
    onFileAttach?.(fileList)
  }, [onFileAttach])

  const handleAttachClick = useCallback(() => { fileInputRef.current?.click() }, [])
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback(() => { setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files) }, [handleFileSelect])

  useEffect(() => { textareaRef.current?.focus() }, [])

  return (
    <div className={["composer", isDragging ? 'drag-over' : ''].join(' ')}>
      {attached.length > 0 && (
        <div className="file-preview-list">
          {attached.map((f, i) => (
            <div className="file-preview" key={i}>
              <span className="file-preview-icon">\u270E</span>
              <span className="file-preview-name">{f.name}</span>
              <span className="file-preview-size">{(f.size / 1024).toFixed(1)} KB</span>
            </div>
          ))}
        </div>
      )}
      <div className="composer-input">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          rows={1}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
        <div className="composer-actions">
          <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => handleFileSelect(e.target.files)} />
          <button className="attach-btn" onClick={handleAttachClick} title="Attach file">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <button className="send-btn" onClick={handleSubmit} disabled={disabled || !text.trim()} title="Send (Cmd/Ctrl+Enter)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}