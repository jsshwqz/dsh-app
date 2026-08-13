import { useState, useRef, useCallback, useEffect } from 'react'
import { formatTime } from '../lib/utils.js'

interface Session {
  id: string
  title: string
  model: string
  createdAt: number
  lastActivity: number
  messages: Array<{ id: string; role: string; content: string; timestamp: number }>
}

interface SidebarProps {
  sessions: Session[]
  activeId: string | null
  onNew: (model?: string) => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

const MODELS = [
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { id: 'deepseek-v4', label: 'DeepSeek V4' },
  { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
] as const

export function Sidebar({ sessions, activeId, onNew, onSelect, onRename, onDelete }: SidebarProps) {
  const [search, setSearch] = useState('')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [activeModel, setActiveModel] = useState('deepseek-v4-flash')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Click outside to close dropdowns
  useEffect(() => {
    const handler = () => { setShowModelMenu(false); setShowExportMenu(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleNewSession = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    onNew(activeModel)
  }, [onNew, activeModel])

  const handleRename = useCallback((id: string) => {
    const s = sessions.find(s => s.id === id)
    if (!s) return
    setEditingId(id)
    setEditTitle(s.title)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [sessions])

  const handleRenameConfirm = useCallback(async () => {
    if (editingId && editTitle.trim()) {
      await onRename(editingId, editTitle.trim())
    }
    setEditingId(null)
    setEditTitle('')
  }, [editingId, editTitle, onRename])

  const handleExport = useCallback(async (id: string, format: 'md' | 'txt' | 'json') => {
    event?.stopPropagation?.()
    const fileContent = await window.dsDesktop.sessions.export(id, format)
    const name = sessions.find(s => s.id === id)?.title ?? 'session'
    const ext = format === 'json' ? 'json' : format
    const saved = await window.dsDesktop.dialog.saveFile({
      defaultPath: name.replace(/[/\\:*?"<>|]/g, '_') + '.' + ext,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    })
    if (saved) {
      await window.dsDesktop.shell.writeFile({ path: saved, content: fileContent })
    }
    setShowExportMenu(null)
  }, [sessions])

  const filtered = sessions.filter(s => {
    if (!search.trim()) return true
    return s.title.toLowerCase().includes(search.toLowerCase())
  })

  const grouped: { label: string; items: Session[] }[] = []
  const now = Date.now()
  const yesterday = now - 86400000
  const last7 = now - 7 * 86400000
  const last30 = now - 30 * 86400000

  for (const s of filtered) {
    let label = 'Older'
    if (s.lastActivity >= yesterday) label = 'Today'
    else if (s.lastActivity >= last7) label = 'Last 7 days'
    else if (s.lastActivity >= last30) label = 'Last 30 days'
    const group = grouped.find(g => g.label === label)
    if (group) group.items.push(s)
    else grouped.push({ label, items: [s] })
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Sessions</div>
        <div className="sidebar-actions">
          <button className="sidebar-icon-btn" onClick={(e) => { e.stopPropagation(); setShowShortcuts(!showShortcuts) }} title="Shortcuts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6M9 13h6M9 17h3" />
            </svg>
          </button>
        </div>
      </div>

      {showShortcuts && (
        <div className="shortcut-panel">
          <div className="shortcut-panel-title">Shortcuts</div>
          <div className="shortcut-row"><span className="shortcut-key">Ctrl+N</span><span className="shortcut-desc">New Session</span></div>
          <div className="shortcut-row"><span className="shortcut-key">Ctrl+B</span><span className="shortcut-desc">Toggle Sidebar</span></div>
          <div className="shortcut-row"><span className="shortcut-key">Ctrl+,</span><span className="shortcut-desc">Settings</span></div>
          <div className="shortcut-row"><span className="shortcut-key">Ctrl+Enter</span><span className="shortcut-desc">Send Message</span></div>
          <div className="shortcut-row"><span className="shortcut-key">Ctrl+0</span><span className="shortcut-desc">Reset Zoom</span></div>
        </div>
      )}

      <div className="sidebar-search">
        <svg className="sidebar-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="sidebar-search-input" />
      </div>

      <div className="sidebar-controls">
        <div className="model-selector" onClick={(e) => e.stopPropagation()}>
          <span className="model-selector-label">Model</span>
          <button className="model-selector-btn" onClick={(e) => { e.stopPropagation(); setShowModelMenu(!showModelMenu) }}>
            {MODELS.find(m => m.id === activeModel)?.label ?? 'Select'}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {showModelMenu && (
            <div className="model-selector-menu">
              {MODELS.map(m => (
                <button key={m.id} className={["model-selector-item", activeModel === m.id && "active"].filter(Boolean).join(' ')} onClick={(e) => { e.stopPropagation(); setActiveModel(m.id); setShowModelMenu(false); onNew(m.id) }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="new-session-btn" onClick={handleNewSession} data-stop-propagation>+
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="sidebar-list">
        {grouped.length === 0 ? (
          <div className="sidebar-empty">No sessions yet</div>
        ) : (
          grouped.map(group => (
            <div key={group.label} className="sidebar-group">
              <div className="sidebar-group-label">{group.label}</div>
              {group.items.map(s => {
                const isActive = s.id === activeId
                const isEditing = editingId === s.id
                return (
                  <div key={s.id} className={["sidebar-item", isActive && "active"].filter(Boolean).join(' ')} onClick={(e) => { e.stopPropagation(); onSelect(s.id) }}>
                    <div className="sidebar-item-body">
                      {isEditing ? (
                        <input ref={inputRef} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={handleRenameConfirm} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm() }} className="sidebar-edit-input" />
                      ) : (
                        <div className="sidebar-item-title" onDoubleClick={(e) => { e.stopPropagation(); handleRename(s.id) }}>{s.title}</div>
                      )}
                      <div className="sidebar-item-meta">
                        <span>{formatTime(s.lastActivity)}</span>
                        <span>{s.model}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowExportMenu(showExportMenu === s.id ? null : s.id) }} className="sidebar-item-dropdown-btn">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                    {showExportMenu === s.id && (
                      <div className="sidebar-export-menu">
                        <button onClick={(e) => { e.stopPropagation(); handleExport(s.id, 'md') }}>Markdown</button>
                        <button onClick={(e) => { e.stopPropagation(); handleExport(s.id, 'txt') }}>TXT</button>
                        <button onClick={(e) => { e.stopPropagation(); handleExport(s.id, 'json') }}>JSON</button>
                        <div className="sidebar-export-divider" />
                        <button onClick={(e) => { e.stopPropagation(); onDelete(s.id) }} className="danger">Delete</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}