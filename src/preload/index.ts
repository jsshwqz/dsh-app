import { contextBridge, ipcRenderer } from 'electron'

interface IPCHandlers {
  // Runtime
  'runtime:status': () => Promise<{ connected: boolean; error: string | null; provider: string; model: string }>
  'runtime:restart': () => Promise<void>
  'runtime:prompt': (args: { sessionId: string; content: string }) => Promise<{ response: string }>
  'runtime:promptText': (args: { sessionId: string; content: string }) => Promise<{ response: string }>
  // Settings
  'settings:get': () => Promise<Record<string, unknown>>
  'settings:update': (args: Record<string, unknown>) => Promise<Record<string, unknown>>
  'settings:path': () => Promise<string>
  // Dialogs
  'dialog:openWorkspace': () => Promise<string | null>
  'dialog:openFile': () => Promise<string | null>
  // Utilities
  'shell:openPath': (path: string) => Promise<boolean>
  'workspace:path': () => Promise<string>
  'app:version': () => Promise<string>
  'app:platform': () => Promise<string>
}

const api: {
  runtime: {
    status: () => Promise<{ connected: boolean; error: string | null; provider: string; model: string }>
    restart: () => Promise<void>
    prompt: (sessionId: string, content: string) => Promise<{ response: string }>
    promptText: (sessionId: string, content: string) => Promise<{ response: string }>
    onStatus: (fn: (s: { connected: boolean; error: string | null; provider: string; model: string }) => void) => () => void
    onEvent: (fn: (sessionId: string, event: unknown) => void) => () => void
  }
  settings: {
    get: () => Promise<Record<string, unknown>>
    update: (s: Record<string, unknown>) => Promise<Record<string, unknown>>
    path: () => Promise<string>
  }
  dialog: {
    openWorkspace: () => Promise<string | null>
    openFile: () => Promise<string | null>
  }
  shell: {
    openPath: (p: string) => Promise<boolean>
  }
  app: {
    getVersion: () => Promise<string>
    getPlatform: () => Promise<string>
    getPath: () => Promise<string>
    onNewSession: (fn: () => void) => () => void
    onToggleSidebar: (fn: () => void) => () => void
    onOpenSettings: (fn: () => void) => () => void
  }
} = {
  runtime: {
    status: () => ipcRenderer.invoke('runtime:status'),
    restart: () => ipcRenderer.invoke('runtime:restart'),
    prompt: (sessionId, content) => ipcRenderer.invoke('runtime:prompt', { sessionId, content }),
    promptText: (sessionId, content) => ipcRenderer.invoke('runtime:promptText', { sessionId, content }),
    onStatus: (fn) => {
      const handler = (_event, status) => fn(status)
      ipcRenderer.on('runtime:status', handler)
      return () => ipcRenderer.off('runtime:status', handler)
    },
    onEvent: (fn) => {
      const handler = (_event, sessionId, event) => fn(sessionId, event)
      ipcRenderer.on('runtime:event', handler)
      return () => ipcRenderer.off('runtime:event', handler)
    },
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (s) => ipcRenderer.invoke('settings:update', s),
    path: () => ipcRenderer.invoke('settings:path'),
  },
  dialog: {
    openWorkspace: () => ipcRenderer.invoke('dialog:openWorkspace'),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
  },
  shell: {
    openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getPlatform: () => ipcRenderer.invoke('app:platform'),
    getPath: () => ipcRenderer.invoke('workspace:path'),
    onNewSession: (fn) => {
      const handler = () => fn()
      ipcRenderer.on('new-session', handler)
      return () => ipcRenderer.off('new-session', handler)
    },
    onToggleSidebar: (fn) => {
      const handler = () => fn()
      ipcRenderer.on('toggle-sidebar', handler)
      return () => ipcRenderer.off('toggle-sidebar', handler)
    },
    onOpenSettings: (fn) => {
      const handler = () => fn()
      ipcRenderer.on('open-settings', handler)
      return () => ipcRenderer.off('open-settings', handler)
    },
  },
}

contextBridge.exposeInMainWorld('dsDesktop', api)
export type { IPCHandlers }
