import { contextBridge, ipcRenderer } from 'electron'

type AppEvent = () => void
type StatusListener = (s: unknown) => void
type EventListener = (sid: string, e: unknown) => void

interface IPCHandlers {} // type-safety is best-effort here

contextBridge.exposeInMainWorld('dsDesktop', {
  runtime: {
    getStatus: () => ipcRenderer.invoke('runtime:status'),
    prompt: (sessionId: string, content: string) => ipcRenderer.invoke('runtime:prompt', sessionId, content),
    restart: () => ipcRenderer.invoke('runtime:restart'),
    onStatus: (fn: StatusListener) => {
      const h = (_e: any, s: unknown) => fn(s)
      ipcRenderer.on('runtime:status', h)
      return () => ipcRenderer.off('runtime:status', h)
    },
    onEvent: (fn: EventListener) => {
      const h = (_e: any, data: { sessionId: string; event: unknown }) => fn(data.sessionId, data.event)
      ipcRenderer.on('runtime:event', h)
      return () => ipcRenderer.off('runtime:event', h)
    },
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (p: Record<string, unknown>) => ipcRenderer.invoke('settings:update', p),
  },

  sessions: {
    list: () => ipcRenderer.invoke('session:list'),
    active: () => ipcRenderer.invoke('session:active'),
    search: (q: string) => ipcRenderer.invoke('session:search', q),
    messages: (id: string) => ipcRenderer.invoke('session:messages', id),
    create: (model?: string) => ipcRenderer.invoke('session:create', model),
    switch: (id: string) => ipcRenderer.invoke('session:switch', id),
    rename: (id: string, title: string) => ipcRenderer.invoke('session:rename', { id, title }),
    delete: (id: string) => ipcRenderer.invoke('session:delete', id),
    export: (id: string, format: 'md' | 'txt' | 'json') => ipcRenderer.invoke('session:export', { id, format }),
    refresh: () => ipcRenderer.invoke('session:refresh'),
  },

  dialog: {
    openWorkspace: () => ipcRenderer.invoke('dialog:openWorkspace'),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: (opts: { defaultPath: string; filters: Array<{ name: string; extensions: string[] }> }) =>
      ipcRenderer.invoke('dialog:saveFile', opts),
  },

  shell: {
    openPath: (p: string) => ipcRenderer.invoke('shell:openPath', p),
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    writeFile: ({ path, content }: { path: string; content: string }) => ipcRenderer.invoke('shell:writeFile', { path, content }),
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getPlatform: () => ipcRenderer.invoke('app:platform'),
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
    onNewSession: (fn: AppEvent) => {
      const h = () => fn()
      ipcRenderer.on('new-session', h)
      return () => ipcRenderer.off('new-session', h)
    },
    onToggleSidebar: (fn: AppEvent) => {
      const h = () => fn()
      ipcRenderer.on('toggle-sidebar', h)
      return () => ipcRenderer.off('toggle-sidebar', h)
    },
    onOpenSettings: (fn: AppEvent) => {
      const h = () => fn()
      ipcRenderer.on('open-settings', h)
      return () => ipcRenderer.off('open-settings', h)
    },
    trayQuickPrompt: (content: string) => ipcRenderer.send('tray:quickPrompt', content),
  },
})