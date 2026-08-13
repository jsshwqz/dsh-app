import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface Settings {
  apiKey: string
  provider: string
  model: string
  maxTokens?: number
  workspace: string
  sessionRoot: string
  theme: 'dark' | 'light'
  fontSize: number
  sidebarWidth: number
  systemPrompt: string
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  provider: 'deepseek-official',
  model: 'deepseek-v4-flash',
  maxTokens: 8192,
  workspace: path.join(app.getPath('home'), 'dsh-workspace'),
  sessionRoot: path.join(app.getPath('userData'), 'sessions'),
  theme: 'dark',
  fontSize: 14,
  sidebarWidth: 280,
  systemPrompt: '',
}

export function getSettingsPath(): string {
  const dir = app.getPath('userData')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'settings.json')
}

export function createSettingsStore() {
  return {
    load(overrides: Partial<Settings> = {}): Settings {
      try {
        const raw = fs.readFileSync(getSettingsPath(), 'utf8')
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw), ...overrides }
      } catch {
        return { ...DEFAULT_SETTINGS, ...overrides }
      }
    },
    save(s: Settings): void {
      fs.writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2), 'utf8')
    },
    path(): string {
      return getSettingsPath()
    },
  }
}
