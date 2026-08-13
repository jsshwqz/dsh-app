import { useState, useEffect } from 'react'
import type { AppSettings } from '../lib/types.js'

interface Props {
  onClose: () => void
}

export function SettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '',
    provider: 'deepseek-official',
    model: 'deepseek-v4-flash',
    maxTokens: 8192,
    workspace: '',
    sessionRoot: '',
    theme: 'dark',
    fontSize: 14,
    sidebarWidth: 280,
    systemPrompt: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.dsDesktop.settings.get().then((s) => {
      setSettings((prev) => ({ ...prev, ...s }))
    }).catch(() => {})
  }, [])

  const update = (key: keyof AppSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try { await window.dsDesktop.settings.update(settings) } finally { setSaving(false) }
  }

  const handleOpenWorkspace = async () => {
    const p = await window.dsDesktop.dialog.openWorkspace()
    if (p) update('workspace', p)
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>
      <div className="settings-body">
        <div className="settings-group">
          <div className="settings-group-label">Runtime</div>
          <div className="settings-field">
            <label>API Key (DEEPSEEK_API_KEY)</label>
            <input className="settings-input" type="password" value={settings.apiKey}
              onChange={e => update('apiKey', e.target.value)} placeholder="sk-..." />
          </div>
          <div className="settings-field">
            <label>Provider</label>
            <select className="settings-select" value={settings.provider}
              onChange={e => update('provider', e.target.value)}>
              <option value="deepseek-official">deepseek-official</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Model</label>
            <select className="settings-select" value={settings.model}
              onChange={e => update('model', e.target.value)}>
              <option value="deepseek-v4-flash">deepseek-v4-flash</option>
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
              <option value="deepseek-v4-lite">deepseek-v4-lite</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Max Tokens</label>
            <input className="settings-input" type="number" value={settings.maxTokens ?? 8192}
              onChange={e => update('maxTokens', Number(e.target.value))} />
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-label">Workspace</div>
          <div className="settings-field">
            <label>Workspace Directory</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="settings-input" value={settings.workspace}
                onChange={e => update('workspace', e.target.value)} placeholder="/path/to/workspace" />
              <button className="settings-select" style={{ whiteSpace: 'nowrap' }} onClick={handleOpenWorkspace}>Browse</button>
            </div>
          </div>
          <div className="settings-field">
            <label>Session Storage</label>
            <input className="settings-input" value={settings.sessionRoot}
              onChange={e => update('sessionRoot', e.target.value)} placeholder="./.sessions" />
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-label">Appearance</div>
          <div className="settings-field">
            <label>Theme</label>
            <select className="settings-select" value={settings.theme}
              onChange={e => update('theme', e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Font Size</label>
            <input className="settings-input" type="number" value={settings.fontSize}
              onChange={e => update('fontSize', Number(e.target.value))} min={10} max={20} />
          </div>
          <div className="settings-field">
            <label>Sidebar Width</label>
            <input className="settings-input" type="number" value={settings.sidebarWidth}
              onChange={e => update('sidebarWidth', Number(e.target.value))} min={200} max={400} />
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group-label">System Prompt</div>
          <textarea className="settings-textarea" value={settings.systemPrompt}
            onChange={e => update('systemPrompt', e.target.value)}
            placeholder="You are a helpful coding agent..." />
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: 'white', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}