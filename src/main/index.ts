import { app, BrowserWindow, Menu, ipcMain, Tray, nativeImage, dialog, shell } from 'electron'
import path from 'node:path'
import { registerIPC } from './ipc.js'
import { RuntimeManager } from './runtime.js'
import { createSettingsStore } from './settings.js'

const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const isLinux = process.platform === 'linux'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let runtime: RuntimeManager | null = null
let settings: { [k: string]: unknown } = {}

function getIconPath(): string {
  const ext = isWin ? '.ico' : (isMac ? '.icns' : '.png')
  return path.join(process.resourcesPath, 'icon' + ext)
}

function createWindow(): BrowserWindow {
  const base: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0e14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  }

  if (isMac) {
    Object.assign(base, {
      frame: true,
      titleBarStyle: 'hiddenInset' as const,
      trafficLightPosition: { x: 16, y: 14 },
    })
  } else if (isWin) {
    Object.assign(base, {
      frame: true,
      titleBarStyle: 'hidden' as const,
      icon: getIconPath(),
    })
  } else {
    Object.assign(base, {
      frame: true,
      icon: getIconPath(),
    })
  }

  const win = new BrowserWindow(base)

  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadURL('file://' + path.join(__dirname, '../renderer/dist/index.html'))

  if (isDev) win.webContents.openDevTools()
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => { mainWindow = null })
  mainWindow = win
  return win
}

function createTray(win: BrowserWindow): Tray {
  const iconFile = isMac ? 'tray-icon.png' : (isWin ? 'tray-icon.ico' : 'tray-icon.png')
  const iconPath = path.join(process.resourcesPath, iconFile)
  const native = nativeImage.createFromPath(iconPath)
  const t = new Tray(native.isEmpty() ? nativeImage.createEmpty() : native)
  t.setToolTip('DSH Desktop')
  t.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => win.show() },
    { type: 'separator' },
    { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => { win.show(); win.webContents.send('open-settings') } },
    { type: 'separator' },
    { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { void quit() } },
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
  runtime = new RuntimeManager(settings as any)
  await runtime.start().catch(() => {})
  const win = createWindow()
  tray = createTray(win)
  registerIPC(mainWindow!, runtime, settings as any)

  ipcMain.on('win:minimize', () => { win?.minimize() })
  ipcMain.on('win:toggle-maximize', () => { win?.isMaximized() ? win?.unmaximize() : win?.maximize() })
  ipcMain.on('win:close', () => { void quit() })

  if (isMac) {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'DSH Desktop',
        submenu: [
          { label: 'About', role: 'about' },
          { type: 'separator' },
          { label: 'Preferences', accelerator: 'Cmd+,', click: () => win.webContents.send('open-settings') },
          { type: 'separator' },
          { role: 'services' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      {
        label: 'Window',
        submenu: [
          { label: 'New Session', accelerator: 'Cmd+N', click: () => win.webContents.send('new-session') },
          { type: 'separator' },
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'close' },
        ],
      },
    ]))
  } else {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          { label: 'New Session', accelerator: 'Ctrl+N', click: () => win.webContents.send('new-session') },
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
          { label: 'Toggle Sidebar', accelerator: 'Ctrl+B', click: () => win.webContents.send('toggle-sidebar') },
          { label: 'Zoom In', accelerator: 'Ctrl+=', click: () => win.webContents.executeJavaScript('document.body.style.zoom = (parseFloat(document.body.style.zoom) || 1) + 0.1') },
          { label: 'Zoom Out', accelerator: 'Ctrl+-', click: () => win.webContents.executeJavaScript('document.body.style.zoom = Math.max(0.5, (parseFloat(document.body.style.zoom) || 1) - 0.1)') },
          { label: 'Reset Zoom', accelerator: 'Ctrl+0', click: () => win.webContents.executeJavaScript('document.body.style.zoom = 1') },
        ],
      },
      {
        label: 'Settings',
        submenu: [
          { label: 'Preferences', accelerator: 'Ctrl+,', click: () => win.webContents.send('open-settings') },
        ],
      },
    ]))
  }

  if (isMac) app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
})

app.on('window-all-closed', () => { if (!isMac) void quit() })
app.on('before-quit', async () => { await runtime?.shutdown() })