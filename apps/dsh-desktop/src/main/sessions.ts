import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Settings } from './settings.js'
import type { Session, Message } from '../renderer/src/lib/types.js'

const DEFAULT_SESSION_ROOT = 'sessions'

/**
 * Persistence layer for sessions. Stores each session as a JSONL file
 * under sessionRoot.<sessionId>.jsonl. Compatible with deepseek-harness-web
 * so desktop and web share the same session files.
 */
export class SessionStore {
  private root: string
  private sessions: Session[] = []
  private activeId: string | null = null

  constructor(settings: Settings) {
    const root = settings.sessionRoot ?? join(settings.workspace ?? '', DEFAULT_SESSION_ROOT)
    const dir = root
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.root = dir
    this.loadIndex()
  }

  private loadIndex(): void {
    try {
      const idx = join(this.root, 'index.json')
      if (existsSync(idx)) {
        const raw = readFileSync(idx, 'utf-8')
        const data = JSON.parse(raw) as { sessions: Session[]; activeId?: string }
        this.sessions = data.sessions ?? []
        this.activeId = data.activeId ?? (this.sessions[0]?.id ?? null)
      }
    } catch { this.sessions = [] }
  }

  private saveIndex(): void {
    const idx = join(this.root, 'index.json')
    writeFileSync(idx, JSON.stringify({ sessions: this.sessions, activeId: this.activeId }, null, 2), 'utf-8')
  }

  // --- Disk operations ---

  private sessionPath(sessionId: string): string {
    return join(this.root, sessionId + '.jsonl')
  }

  private writeJsonl(sessionId: string, messages: Message[]): void {
    const lines = messages.map(msg => {
      return JSON.stringify({ id: msg.id, role: msg.role, content: msg.content, timestamp: msg.timestamp })
    })
    writeFileSync(this.sessionPath(sessionId), lines.join('\n') + '\n', 'utf-8')
  }

  private readJsonl(sessionId: string): Message[] {
    const p = this.sessionPath(sessionId)
    if (!existsSync(p)) return []
    const lines = readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean)
    return lines.map(line => JSON.parse(line)).filter(m => m && m.id && m.role)
  }

  // --- Public API ---

  getAll(): Session[] {
    return this.sessions
  }

  getActive(): string | null { return this.activeId }

  getByMessageCount(): Session[] {
    return [...this.sessions].sort((a, b) => b.lastActivity - a.lastActivity)
  }

  search(query: string): Session[] {
    const q = query.toLowerCase()
    return this.sessions.filter(s => s.title.toLowerCase().includes(q))
  }

  create(model?: string): Session {
    const now = Date.now()
    const id = 'sess_' + now + '_' + Math.random().toString(36).slice(2, 8)
    const s: Session = {
      id, title: 'New Session', model: model ?? 'deepseek-v4-flash',
      createdAt: now, lastActivity: now, messages: [],
    }
    this.sessions = [s, ...this.sessions]
    this.activeId = s.id
    this.saveIndex()
    this.writeJsonl(s.id, [])
    return s
  }

  switch(id: string): void {
    this.activeId = id
    this.saveIndex()
  }

  rename(id: string, title: string): void {
    this.sessions = this.sessions.map(s => s.id === id ? { ...s, title } : s)
    this.saveIndex()
  }

  delete(id: string): void {
    const idx = this.sessions.findIndex(s => s.id === id)
    if (idx < 0) return
    this.sessions.splice(idx, 1)
    if (this.activeId === id) {
      this.activeId = this.sessions[0]?.id ?? null
    }
    this.saveIndex()
    const p = this.sessionPath(id)
    if (existsSync(p)) unlinkSync(p)
  }

  addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Message {
    const s = this.sessions.find(s => s.id === sessionId)
    if (!s) { console.error('Session not found:', sessionId); return { id: '', role, content, timestamp: Date.now() } }
    const msg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      role, content, timestamp: Date.now(),
    }
    s.messages.push(msg)
    s.lastActivity = Date.now()
    if (s.messages.filter(m => m.role === 'user').length === 1) {
      s.title = this.autogenTitle(content)
      this.saveIndex()
    }
    this.writeJsonl(sessionId, s.messages)
    return msg
  }

  getMessages(sessionId: string): Message[] {
    const s = this.sessions.find(s => s.id === sessionId)
    if (!s) return this.readJsonl(sessionId)
    return s.messages.length > 0 ? s.messages : this.readJsonl(sessionId)
  }

  export(sessionId: string, format: 'md' | 'txt' | 'json'): string {
    const s = this.sessions.find(s => s.id === sessionId) ?? { id: '', title: 'Untitled', messages: [], createdAt: 0, lastActivity: 0, model: '' }
    if (format === 'json') {
      return JSON.stringify(s, null, 2)
    }
    const header = s.title + '\n\n'
    const meta = 'Model: ' + s.model + '\nCreated: ' + new Date(s.createdAt).toLocaleString() + '\n\n---\n\n'
    if (format === 'md') {
      const body = s.messages.map(m => {
        const role = m.role === 'user' ? '**You**' : '**Assistant**'
        return role + '\n\n' + m.content + '\n\n---\n\n'
      }).join('')
      return '# ' + header + meta + body
    }
    // txt
    const body = s.messages.map(m => {
      const role = m.role === 'user' ? '[You] ' : '[Assistant] '
      return role + m.content + '\n\n'
    }).join('')
    return header + meta + body
  }

  private autogenTitle(content: string): string {
    const first = content.split('\n')[0]?.trim() ?? 'New Session'
    return first.length > 40 ? first.slice(0, 40) + '...' : first
  }
}