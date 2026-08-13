/// <reference types="vite/client" />

interface Window {
  dsDesktop: {
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
  }
}
