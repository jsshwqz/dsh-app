import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

const DEFAULTS = {
  apiKey: '',
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
  maxTokens: 4096,
  workspace: app.getPath('documents'),
  sessionRoot: join(app.getPath('userData'), 'sessions'),
  theme: 'dark' as const,
  fontSize: 14,
  sidebarWidth: 280,
  systemPrompt: 'You are a helpful coding agent.',
} as const

export interface Settings {
  apiKey: string
  provider: string
  model: string
  maxTokens: number
  workspace: string
  sessionRoot: string
  theme: 'dark' | 'light'
  fontSize: number
  sidebarWidth: number
  systemPrompt: string
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

/**
 * Scan for existing WEB settings files to auto-import on first launch.
 * Checks common locations where deepseek-harness-web may have stored settings.
 */
function findWebSettings(): Settings | null {
  const candidates: string[] = []

  // Standard electron userData for web client (DeepSeek-Harness-WEB)
  if (isWin) {
    candidates.push(join(app.getPath('appData'), 'DeepSeek-Harness-Web', 'settings.json'))
    candidates.push(join(app.getPath('appData'), 'DeepSeek Harness WEB', 'settings.json'))
  } else if (isMac) {
    candidates.push(join(app.getPath('appData'), 'DeepSeek-Harness-Web', 'settings.json'))
  } else {
    candidates.push(join(app.getPath('appData'), 'DeepSeek-Harness-Web', 'settings.json'))
  }

  // Also check common XDG locations
  const home = app.getPath('home')
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(home, '.config')
  candidates.push(join(xdgConfig, 'deepseek-harness', 'settings.json'))
  candidates.push(join(xdgConfig, 'DeepSeek-Harness', 'settings.json'))

  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      const raw = readFileSync(path, 'utf-8')
      const data = JSON.parse(raw) as Partial<Settings>
      const apiKey = data.apiKey || ''
      if (!apiKey) continue  // No API key means not useful
      return {
        ...DEFAULTS,
        ...data,
        apiKey,
        provider: data.provider ?? DEFAULTS.provider,
        model: data.model ?? DEFAULTS.model,
        maxTokens: data.maxTokens ?? DEFAULTS.maxTokens,
        workspace: data.workspace ?? DEFAULTS.workspace,
        sessionRoot: data.sessionRoot ?? DEFAULTS.sessionRoot,
        theme: data.theme ?? DEFAULTS.theme,
        fontSize: data.fontSize ?? DEFAULTS.fontSize,
        sidebarWidth: data.sidebarWidth ?? DEFAULTS.sidebarWidth,
        systemPrompt: data.systemPrompt ?? DEFAULTS.systemPrompt,
      }
    } catch { continue }
  }
  return null
}

export class SettingsStore {
  private path: string

  constructor() {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.path = join(dir, 'settings.json')
  }

  load(): Settings {
    if (existsSync(this.path)) {
      try {
        const raw = readFileSync(this.path, 'utf-8')
        return { ...DEFAULTS, ...JSON.parse(raw) }
      } catch {
        // Fall through to auto-import or defaults
      }
    }
    // First launch: try to auto-import from WEB settings
    const webSettings = findWebSettings()
    if (webSettings) {
      this.save(webSettings)
      return webSettings
    }
    return DEFAULTS
  }

  save(settings: Settings): void {
    const dir = join(this.path, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(this.path, JSON.stringify(settings, null, 2), 'utf-8')
  }
}

export function createSettingsStore(): SettingsStore {
  return new SettingsStore()
}