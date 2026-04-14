import { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } from 'electron'
import Store from 'electron-store'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const store = new Store({
  defaults: {
    settings: {
      defaultDurationSec: 1500,
      presetsSec: [900, 1500, 1800, 2700, 3600],
      overlay: {
        alwaysOnTop: true,
        clickThroughByDefault: false,
        opacity: 0.9,
        sizePx: 300,
      },
    },
    dialState: {
      range: { min: 1, max: 300 },
      durationSec: 2700,
      current: null,
      blockedIds: [],
      doneIds: [],
      counts: { done: 0, skipped: 0, notAvailable: 0 },
      updatedAt: new Date().toISOString(),
    },
    problems: [],
    history: [],
  },
})

let overlayWindow = null
let mainWindow = null
let overlayClickThrough = false

function getSettings() {
  return store.get('settings')
}

function setSettings(settings) {
  store.set('settings', settings)
}

function listProblems() {
  return store.get('problems')
}

function upsertProblem(problem) {
  const problems = listProblems()
  const idx = problems.findIndex((p) => p.id === problem.id)
  if (idx >= 0) problems[idx] = problem
  else problems.unshift(problem)
  store.set('problems', problems)
}

function deleteProblem(problemId) {
  store.set(
    'problems',
    listProblems().filter((p) => p.id !== problemId),
  )
}

function listHistory() {
  return store.get('history')
}

function appendHistory(item) {
  const history = listHistory()
  history.unshift(item)
  store.set('history', history.slice(0, 200))
}

function clearHistory() {
  store.set('history', [])
}

function getOverlayWindowState(win) {
  const bounds = win.getBounds()
  const opacity = win.getOpacity()
  return { x: bounds.x, y: bounds.y, sizePx: bounds.width, opacity }
}

function applyOverlayWindowState(win, state) {
  const size = Math.max(120, Math.min(480, Math.round(state.sizePx)))
  win.setBounds({ x: Math.round(state.x), y: Math.round(state.y), width: size, height: size })
  const opacity = Math.max(0.2, Math.min(1, state.opacity))
  win.setOpacity(opacity)
}

function getInitialOverlayBounds() {
  const settings = getSettings()
  const display = screen.getPrimaryDisplay()
  const work = display.workArea
  const size = Math.max(120, Math.min(480, Math.round(settings.overlay.sizePx)))
  const saved = settings.overlay.position
  const x = saved?.x ?? Math.round(work.x + work.width - size - 24)
  const y = saved?.y ?? Math.round(work.y + 24)
  return { x, y, width: size, height: size }
}

function persistOverlayPosition(win) {
  const settings = getSettings()
  const bounds = win.getBounds()
  setSettings({
    ...settings,
    overlay: {
      ...settings.overlay,
      sizePx: bounds.width,
      position: { x: bounds.x, y: bounds.y },
      opacity: win.getOpacity(),
    },
  })
}

async function loadRoute(win, route) {
  if (!app.isPackaged) {
    const base = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
    await win.loadURL(`${base}/#${route}`)
    return
  }

  const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
  await win.loadFile(indexHtml, { hash: route })
}

function createOverlayWindow() {
  const settings = getSettings()
  const win = new BrowserWindow({
    ...getInitialOverlayBounds(),
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: settings.overlay.alwaysOnTop,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.setOpacity(settings.overlay.opacity)
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.on('move', () => persistOverlayPosition(win))
  win.on('resize', () => persistOverlayPosition(win))

  overlayClickThrough = Boolean(settings.overlay.clickThroughByDefault)
  if (overlayClickThrough) {
    win.setIgnoreMouseEvents(true, { forward: true })
  }

  void loadRoute(win, '/simple')
  return win
}

function createMainWindow() {
  // We can skip the main window if you only want the dial.
  // Uncomment this if you want the big settings window back.
  /*
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  void loadRoute(win, '/picker')
  return win
  */
  return null
}

function registerIpc() {
  ipcMain.handle('overlay:setAlwaysOnTop', async (_event, enabled) => {
    if (!overlayWindow) return
    overlayWindow.setAlwaysOnTop(Boolean(enabled))
    const settings = getSettings()
    setSettings({ ...settings, overlay: { ...settings.overlay, alwaysOnTop: Boolean(enabled) } })
  })

  ipcMain.handle('overlay:setClickThrough', async (_event, enabled) => {
    if (!overlayWindow) return
    overlayClickThrough = Boolean(enabled)
    overlayWindow.setIgnoreMouseEvents(overlayClickThrough, { forward: true })
    const settings = getSettings()
    setSettings({
      ...settings,
      overlay: { ...settings.overlay, clickThroughByDefault: overlayClickThrough },
    })
  })

  ipcMain.handle('overlay:getWindowState', async () => {
    if (!overlayWindow) {
      const settings = getSettings()
      const display = screen.getPrimaryDisplay()
      const work = display.workArea
      const size = Math.max(120, Math.min(480, Math.round(settings.overlay.sizePx)))
      return { x: work.x, y: work.y, sizePx: size, opacity: settings.overlay.opacity }
    }
    return getOverlayWindowState(overlayWindow)
  })

  ipcMain.handle('overlay:setWindowState', async (_event, state) => {
    if (!overlayWindow) return
    applyOverlayWindowState(overlayWindow, state)
    persistOverlayPosition(overlayWindow)
  })

  ipcMain.handle('store:getSettings', async () => getSettings())
  ipcMain.handle('store:setSettings', async (_event, settings) => {
    setSettings(settings)
    if (overlayWindow) {
      overlayWindow.setAlwaysOnTop(Boolean(settings.overlay.alwaysOnTop))
      overlayWindow.setOpacity(Math.max(0.2, Math.min(1, settings.overlay.opacity)))
      const bounds = overlayWindow.getBounds()
      const size = Math.max(120, Math.min(480, Math.round(settings.overlay.sizePx)))
      overlayWindow.setBounds({ x: bounds.x, y: bounds.y, width: size, height: size })
    }
  })

  ipcMain.handle('store:listProblems', async () => listProblems())
  ipcMain.handle('store:upsertProblem', async (_event, problem) => upsertProblem(problem))
  ipcMain.handle('store:deleteProblem', async (_event, problemId) => deleteProblem(problemId))

  ipcMain.handle('store:appendPickHistory', async (_event, item) => appendHistory(item))
  ipcMain.handle('store:listPickHistory', async () => listHistory())
  ipcMain.handle('store:clearHistory', async () => clearHistory())

  ipcMain.handle('shell:openExternal', async (_event, url) => {
    if (typeof url !== 'string' || !url.trim()) return
    await shell.openExternal(url)
  })

  ipcMain.handle('dial:getState', async () => store.get('dialState'))
  ipcMain.handle('dial:setState', async (_event, state) => {
    if (!state || typeof state !== 'object') return
    store.set('dialState', state)
  })

  ipcMain.handle('app:quit', async () => {
    app.quit()
  })
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+O', () => {
    if (!overlayWindow) return
    overlayClickThrough = !overlayClickThrough
    overlayWindow.setIgnoreMouseEvents(overlayClickThrough, { forward: true })
    const settings = getSettings()
    setSettings({
      ...settings,
      overlay: { ...settings.overlay, clickThroughByDefault: overlayClickThrough },
    })
  })

  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (!overlayWindow) return
    if (overlayWindow.isVisible()) overlayWindow.hide()
    else overlayWindow.show()
  })

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (!mainWindow) {
      mainWindow = createMainWindow()
      mainWindow.on('closed', () => {
        mainWindow = null
      })
      return
    }
    if (mainWindow.isVisible()) mainWindow.hide()
    else mainWindow.show()
  })
}

app.whenReady().then(() => {
  registerIpc()

  overlayWindow = createOverlayWindow()
  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  mainWindow = createMainWindow()
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      overlayWindow = createOverlayWindow()
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
