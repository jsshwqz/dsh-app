import { useRef, useState } from 'react'
import type { Session } from '../lib/types.js'

interface Props {
  sessions: Session[]
  activeId: string | null
  onNew: () => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

function SessionItem({ s, isActive, onSelect, onRename, onDelete }: {
  s: Session
  isActive: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(s.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useState(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  })

  const commitEdit = () => {
    const t = editVal.trim()
    if (t && t !== s.title) onRename(t)
    else setEditVal(s.title)
    setEditing(false)
  }

  return (
    <div
      className={['session-item', isActive ? 'active' : ''].join(' ')}
      onClick={onSelect}
      onDoubleClick={() => setEditing(true)}
    >
      {editing
        ? <input ref={inputRef} className="session-edit" value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditVal(s.title); setEditing(false) } }} />
        : <>
            <span className="title">{s.title}</span>
            <span className="meta">{s.model.split('-').pop()} · {new Date(s.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </>}
    </div>
  )
}

export function Sidebar({ sessions, activeId, onNew, onSelect, onRename, onDelete }: Props) {
  return (
    <aside className="sidebar">
      <button className="btn-new-session" onClick={onNew}>
        <span className="plus">+</span>
        <span>New Session</span>
      </button>

      <nav className="session-list">
        {sessions.length === 0
          ? <div style={{ padding: '16px 10px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>No sessions yet</div>
          : sessions.map(s => (
              <SessionItem key={s.id} s={s} isActive={s.id === activeId}
                onSelect={() => onSelect(s.id)}
                onRename={(t) => onRename(s.id, t)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
      </nav>

      <div className="workspace-bar">
        <div className="workspace-path">
          <span>▶</span>
          <span>dsh-workspace</span>
        </div>
      </div>
    </aside>
  )
}