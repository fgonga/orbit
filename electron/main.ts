import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import * as crypto from 'crypto'
import { is } from '@electron-toolkit/utils'
import { registerGitHandlers } from './ipc/git'
import { registerGitHubHandlers } from './ipc/github'
import { registerConflictHandlers } from './ipc/conflicts'
import { registerNotesHandlers } from './ipc/notes'
import { registerLocalIssuesHandlers } from './ipc/localIssues'
import { registerBackupHandlers } from './ipc/backup'
import { getDb } from './db'

// PATH fix for macOS/Linux launch via Finder/Dock
if (process.platform === 'darwin' || process.platform === 'linux') {
  const extras = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin']
  const current = (process.env.PATH || '').split(':').filter(Boolean)
  process.env.PATH = [...new Set([...current, ...extras])].join(':')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform !== 'darwin'
      ? { color: '#1a1b26', symbolColor: '#6272a4', height: 44 }
      : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function registerProjectHandlers() {
  const db = getDb()

  // ── List all projects ─────────────────────────────────────
  ipcMain.handle('project:listWorkspace', () => {
    return (db.prepare('SELECT id, name, data, updated_at FROM projects ORDER BY updated_at DESC').all() as any[])
      .map(row => {
        const data = JSON.parse(row.data)
        return {
          id: row.id,
          name: row.name,
          groupCount: data.groups?.length ?? 0,
          repoCount: (data.groups ?? []).reduce((acc: number, g: any) => acc + (g.repos?.length ?? 0), 0),
          updatedAt: row.updated_at,
        }
      })
  })

  // ── Create new project ────────────────────────────────────
  ipcMain.handle('project:createInWorkspace', (_, name: string) => {
    const id      = crypto.randomUUID()
    const project = { name, version: 1, groups: [], layout: {} }
    const now     = Date.now()
    db.prepare('INSERT INTO projects (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, JSON.stringify(project), now, now)
    return { ...project, id }
  })

  // ── Load project by id ────────────────────────────────────
  ipcMain.handle('project:loadFromPath', (_, id: string) => {
    const row = db.prepare('SELECT id, name, data FROM projects WHERE id = ?').get(id) as any
    if (!row) return null
    return { ...JSON.parse(row.data), id: row.id }
  })

  // ── Save project ──────────────────────────────────────────
  ipcMain.handle('project:save', (_, { project }: { project: any }) => {
    const { id, ...data } = project
    db.prepare('UPDATE projects SET name = ?, data = ?, updated_at = ? WHERE id = ?')
      .run(data.name, JSON.stringify(data), Date.now(), id)
    return id
  })

  // ── Export project to file (saveAs) ───────────────────────
  ipcMain.handle('project:saveAs', async (_, project: any) => {
    const { id: _id, ...data } = project
    const result = await dialog.showSaveDialog({
      defaultPath: `${(project.name || 'projecto').replace(/[^a-z0-9]/gi, '_')}.gitdash.json`,
      filters: [{ name: 'Orbit Project', extensions: ['gitdash.json'] }],
    })
    if (result.canceled || !result.filePath) return null
    require('fs').writeFileSync(result.filePath, JSON.stringify(data, null, 2))
    return result.filePath
  })

  // ── Delete project ────────────────────────────────────────
  ipcMain.handle('project:delete', (_, id: string) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)   // CASCADE deletes notebooks, li_groups, etc.
  })

  // ── Import project from file ──────────────────────────────
  ipcMain.handle('project:import', async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: 'Orbit Project', extensions: ['gitdash.json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return null
    try {
      const data = JSON.parse(readFileSync(result.filePaths[0], 'utf-8'))
      const { _filePath: _, ...clean } = data
      const id  = crypto.randomUUID()
      const now = Date.now()
      db.prepare('INSERT INTO projects (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, clean.name || 'Importado', JSON.stringify(clean), now, now)
      return { ...clean, id }
    } catch { return null }
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url)
  })
}

app.whenReady().then(() => {
  registerGitHandlers()
  registerGitHubHandlers()
  registerConflictHandlers()
  registerNotesHandlers()
  registerLocalIssuesHandlers()
  registerBackupHandlers()
  registerProjectHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
