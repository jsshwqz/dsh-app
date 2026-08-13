import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { RuntimeManager } from './runtime.js'
import type { Settings } from './settings.js'
import { createSettingsStore } from './settings.js'
import { resolve } from 'node:path'

export interface PromptArgs {
  sessionId: string
  content: string
  stream?: boolean
}

export interface NewSessionArgs {
  title?: string
  model?: string
}

export interface UpdateSettingsArgs extends Partial<Settings> {}

export interface GetWorkspaceArgs {
  title: string
}

export function registerIPC(win: BrowserWindow, runtime: RuntimeManager, settings: Settings): void {
  const store = createSettingsStore()

  ipcMain.handle('runtime:status', () => runtime.getStatus())
  ipcMain.handle('runtime:restart', async () => {
    await runtime.shutdown()
    return runtime.start()
  })

  ipcMain.handle('runtime:prompt', async (_, args: PromptArgs) => {
    const response = await runtime.promptStream(args.sessionId, args.content)
    return { response }
  })

  ipcMain.handle('runtime:promptText', async (_, args: PromptArgs) => {
    const response = await runtime.prompt(args.sessionId, args.content)
    return { response }
  })

  ipcMain.handle('settings:get', () => settings)
  ipcMain.handle('settings:update', (_, args: UpdateSettingsArgs) => {
    Object.assign(settings, args)
    store.save(settings)
    return settings
  })
  ipcMain.handle('settings:path', () => store.path())

  ipcMain.handle('dialog:openWorkspace', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select Workspace',
      properties: ['openDirectory'],
    })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Select File',
      properties: ['openFile'],
    })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('shell:openPath', (_, p: string) => {
    void shell.openPath(resolve(p))
    return true
  })

  ipcMain.handle('workspace:path', () => settings.workspace)
  ipcMain.handle('app:version', () => process.env.npm_package_version ?? '0.1.0')
  ipcMain.handle('app:platform', () => process.platform)

  // Runtime event listener
  runtime.onEvent((sessionId, event) => {
    win.webContents.send('runtime:event', sessionId, event)
  })

  runtime.onStatus((status) => {
    win.webContents.send('runtime:status', status)
  })
}
