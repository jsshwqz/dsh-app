import { app, BrowserWindow, Menu, ipcMain, Tray, nativeImage, dialog } from 'electron'
import path from 'node:path'
import { registerIPC } from './ipc.js'
import { RuntimeManager } from './runtime.js'
import { createSettingsStore, type Settings } from './settings.js'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let runtime: RuntimeManager | null = null
let settings: Settings = {} as Settings

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 14 },
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadURL('file://' + path.join(__dirname, '../renderer/dist/index.html'))
  }

  if (isDev) win.webContents.openDevTools()
  win.on('closed', () => { mainWindow = null })
  mainWindow = win
  return win
}

function createTray(win: BrowserWindow): Tray {
  const iconPath = isDev
    ? path.join(__dirname, '../../build/tray-icon.png')
    : path.join(process.resourcesPath, 'tray-icon.png')
  const native = nativeImage.createFromPath(iconPath)
  const t = new Tray(native.isEmpty() ? nativeImage.createEmpty() : native)
  t.setToolTip('DSH Desktop')
  t.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => win.show() },
    { type: 'separator' },
    { label: 'Settings', click: () => { win.show(); win.webContents.send('open-settings') } },
    { type: 'separator' },
    { label: 'Quit', click: () => { void quit() } },
  ]))
  t.on('double-click', () => win.show())
  return t
}

async function quit(): Promise<void> {
  await runtime?.shutdown()
  app.quit()
}

app.whenReady().then(async () => {
  settings = createSettingsStore().load()
  runtime = new RuntimeManager({ cwd: settings.workspace, provider: settings.provider, model: settings.model, maxTokens: settings.maxTokens, apiKey: settings.apiKey, sessionRoot: settings.sessionRoot })
  await runtime.start().catch(() => {})
  const win = createWindow()
  tray = createTray(win)
  registerIPC(mainWindow!, runtime, settings)
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'DSH Desktop',
      submenu: [
        { label: 'About', click: () => dialog.showMessageBox(win, { message: 'DSH Desktop v0.1.0-rc.5', detail: 'Multi-platform desktop client for DeepSeek Harness' }) },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Session', accelerator: 'CmdOrCtrl+N', click: () => win.webContents.send('new-session') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }],
    },
    {
      label: 'View',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => win.webContents.send('toggle-sidebar') },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
      ],
    },
    {
      label: 'Settings',
      submenu: [
        { label: 'Preferences', accelerator: 'CmdOrCtrl+,', click: () => win.webContents.send('open-settings') },
      ],
    },
  ]))
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') void quit() })
app.on('before-quit', async () => { await runtime?.shutdown() })