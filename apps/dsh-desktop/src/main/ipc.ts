import { ipcMain, shell, dialog, BrowserWindow, app } from 'electron'
import { writeFileSync } from 'node:fs'
import type { RuntimeManager } from './runtime.js'
import type { Settings } from './settings.js'
import { SessionStore } from './sessions.js'

export function registerIPC(win: BrowserWindow, runtime: RuntimeManager, settings: Settings): void {
  const sessions = new SessionStore(settings)

  runtime.onStatus((status) => {
    win.webContents.send('runtime:status', status)
  })
  runtime.onEvent((sessionId, event) => {
    win.webContents.send('runtime:event', { sessionId, event })
  })

  // --- Runtime ---

  ipcMain.handle('runtime:status', () => runtime.getStatus())

  ipcMain.handle('runtime:prompt', async (_evt, sessionId: string, content: string) => {
    try {
      const result = await runtime.prompt({ sessionId, content })
      sessions.addMessage(sessionId, 'user', content)
      sessions.addMessage(sessionId, 'assistant', result.response)
      return result
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      sessions.addMessage(sessionId, 'assistant', '[Error] ' + msg)
      return { response: '[Error] ' + msg, ok: false, error: msg }
    }
  })

  ipcMain.handle('runtime:restart', async () => { await runtime.restart() })

  // --- Settings ---

  ipcMain.handle('settings:get', () => settings)

  ipcMain.handle('settings:update', (_evt, patch: Partial<Settings>) => {
    Object.assign(settings, patch)
    const { createSettingsStore } = require('./settings.js')
    createSettingsStore().save(settings as any)
    void runtime.restart()
    return settings
  })

  // --- Dialog ---

  ipcMain.handle('dialog:openWorkspace', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('dialog:openFile', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'All Files', extensions: ['*'] }] })
    return r.canceled ? null : r.filePaths
  })

  ipcMain.handle('dialog:saveFile', async (_evt, options: { defaultPath: string; filters: { name: string; extensions: string[] }[] }) => {
    const r = await dialog.showSaveDialog(win, options)
    return r.canceled ? null : r.filePath
  })

  // --- Shell ---

  ipcMain.handle('shell:openPath', (_evt, p: string) => { void shell.openPath(p) })
  ipcMain.handle('shell:openExternal', (_evt, url: string) => { void shell.openExternal(url) })
  ipcMain.handle('shell:writeFile', (_evt, { path: p, content }: { path: string; content: string }) => {
    writeFileSync(p, content, 'utf-8')
  })

  // --- Sessions ---

  ipcMain.handle('session:list', () => sessions.getAll())
  ipcMain.handle('session:active', () => sessions.getActive())
  ipcMain.handle('session:search', (_evt, query: string) => sessions.search(query))
  ipcMain.handle('session:messages', (_evt, sessionId: string) => sessions.getMessages(sessionId))
  ipcMain.handle('session:create', (_evt, model?: string) => sessions.create(model))
  ipcMain.handle('session:switch', (_evt, id: string) => { sessions.switch(id); return null })
  ipcMain.handle('session:rename', (_evt, { id, title }: { id: string; title: string }) => { sessions.rename(id, title); return null })
  ipcMain.handle('session:delete', (_evt, id: string) => { sessions.delete(id); return null })
  ipcMain.handle('session:export', (_evt, { id, format }: { id: string; format: 'md' | 'txt' | 'json' }) => sessions.export(id, format))
  ipcMain.handle('session:refresh', () => sessions.getAll())

  // --- App ---

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:platform', () => process.platform)
  ipcMain.handle('app:openSettings', () => win.webContents.send('open-settings'))
  ipcMain.handle('app:checkUpdate', async () => {
    const current = app.getVersion()
    const res = await fetch('https://api.github.com/repos/jsshwqz/dsh-app/releases/latest', {
      headers: { 'User-Agent': 'DSH-Desktop' },
    })
    if (!res.ok) return { available: false, current, latest: current }
    const data = (await res.json()) as { tag_name: string; html_url: string }
    const latest = data.tag_name.replace(/^v/, '')
    return { available: latest !== current, current, latest, url: data.html_url }
  })

  // --- Tray quick prompt ---

  ipcMain.on('tray:quickPrompt', (_evt, content: string) => {
    const sid = sessions.getActive()
    if (sid && content.trim()) {
      win.show()
      void runtime.prompt({ sessionId: sid, content: content.trim() }).catch(() => {})
    }
  })
}