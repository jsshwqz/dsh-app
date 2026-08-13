import { spawn, ChildProcess } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { DeepSeekHarness } from '@deepseek-ai/dsh-sdk-client'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface RuntimeConfig {
  cwd: string
  provider: string
  model: string
  maxTokens?: number
  apiKey?: string
  sessionRoot?: string
}

export interface RuntimeStatus {
  connected: boolean
  error: string | null
  provider: string
  model: string
}

export interface PromptOptions {
  sessionId: string
  content: string
  onEvent?: (event: SessionEvent) => void
}

export interface SessionInfo {
  id: string
  title: string
  lastActivity: Date
  model: string
}

/**
 * Manages the dsh-jsonrpc-agent runtime subprocess. Owns one DeepSeekHarness
 * instance and exposes prompt/session lifecycle through IPC-friendly methods.
 */
export class RuntimeManager {
  private harness: DeepSeekHarness | null = null
  private status: RuntimeStatus = { connected: false, error: null, provider: '', model: '' }
  private listeners: ((status: RuntimeStatus) => void)[] = []
  private eventListeners: ((sessionId: string, event: SessionEvent) => void)[] = []
  private readonly config: RuntimeConfig

  constructor(config: RuntimeConfig) {
    this.config = config
  }

  onStatus(fn: (s: RuntimeStatus) => void): () => void {
    this.listeners.push(fn)
    return () => { this.listeners = this.listeners.filter((l) => l !== fn) }
  }

  onEvent(fn: (sessionId: string, event: SessionEvent) => void): () => void {
    this.eventListeners.push(fn)
    return () => { this.eventListeners = this.eventListeners.filter((l) => l !== fn) }
  }

  getRuntimePath(): string {
    // Resolve the jsonrpc-demo bin relative to this package's parent
    const paths = [
      resolve(__dirname, '../../../packages/examples/jsonrpc-demo/lib/bin.js'),
      resolve(__dirname, '../../../packages/examples/jsonrpc-demo/src/bin.ts'),
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) return p
    }
    throw new Error('Cannot locate dsh-jsonrpc-agent runtime binary. Build the packages first.')
  }

  getCordisConfigPath(): string {
    const paths = [
      resolve(__dirname, '../../runtime/cordis.yml'),
      resolve(__dirname, '../../../examples/jsonrpc-agent/cordis.yml'),
    ]
    for (const p of paths) {
      if (fs.existsSync(p)) return p
    }
    throw new Error('Cannot locate cordis.yml config.')
  }

  getStatus(): RuntimeStatus { return this.status }

  private notify(): void {
    this.listeners.forEach((l) => l(this.status))
  }

  private notifyEvent(sessionId: string, event: SessionEvent): void {
    this.eventListeners.forEach((l) => l(sessionId, event))
  }

  async start(): Promise<RuntimeStatus> {
    try {
      const runtimePath = this.getRuntimePath()
      const cordisConfig = this.getCordisConfigPath()

      const env: Record<string, string> = {
        ...(process.env as Record<string, string | undefined>),
        DSH_CORDIS_CONFIG: cordisConfig,
        DSH_CWD: this.config.cwd,
        DSH_MAX_TOKENS_AS_SUCCESS: 'true',
      }
      if (this.config.apiKey) env.DEEPSEEK_API_KEY = this.config.apiKey
      if (this.config.sessionRoot) env.DSH_SESSION_ROOT = this.config.sessionRoot
      if (this.config.maxTokens) env.DSH_MAX_TOKENS = String(this.config.maxTokens)

      this.harness = new DeepSeekHarness({
        launch: {
          command: process.execPath,
          args: ['--import', 'tsx/esm', runtimePath],
          env,
        },
        cwd: this.config.cwd,
        provider: this.config.provider,
        model: this.config.model,
        maxTokens: this.config.maxTokens,
      })

      await this.harness.start()

      this.status = {
        connected: true,
        error: null,
        provider: this.config.provider,
        model: this.config.model,
      }
      this.notify()
      return this.status
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.status = { connected: false, error: msg, provider: this.config.provider, model: this.config.model }
      this.notify()
      throw error
    }
  }

  async prompt(sessionId: string, content: string): Promise<string> {
    if (!this.harness) throw new Error('Runtime not started')
    const session = this.harness.session(sessionId)
    const result = await session.run(content, {
      onNotification: (notification) => {
        if (notification.method === 'session.event' && notification.params.event) {
          this.notifyEvent(sessionId, notification.params.event as SessionEvent)
        }
      },
    })
    return result.finalResponse
  }

  async promptStream(sessionId: string, content: string): Promise<string> {
    if (!this.harness) throw new Error('Runtime not started')
    const session = this.harness.session(sessionId)
    const result = await session.run(content, {
      onNotification: (notification) => {
        if (notification.method === 'session.event' && notification.params.event) {
          this.notifyEvent(sessionId, notification.params.event as SessionEvent)
        }
        if (notification.method === 'session.status') {
          this.notify()
        }
      },
    })
    return result.finalResponse
  }

  async shutdown(): Promise<void> {
    if (!this.harness) return
    try {
      await this.harness.close()
    } catch (_error) {
      // Best effort
    }
    this.harness = null
    this.status = { connected: false, error: null, provider: this.config.provider, model: this.config.model }
    this.notify()
  }
}
