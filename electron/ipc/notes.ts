import { ipcMain, safeStorage } from 'electron'
import * as crypto from 'crypto'
import { getDb } from '../db'

// ── Helpers ────────────────────────────────────────────────
function hasStoredPassword(): boolean {
  const row = getDb().prepare("SELECT value FROM kv WHERE key = 'notes_key'").get() as any
  return !!row
}

function encryptContent(content: string, password: string): string {
  const salt   = crypto.randomBytes(16)
  const key    = crypto.scryptSync(password, salt, 32)
  const iv     = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc    = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()])
  const tag    = cipher.getAuthTag()
  return Buffer.concat([salt, iv, tag, enc]).toString('base64')
}

function decryptContent(b64: string, password: string): string {
  const buf  = Buffer.from(b64, 'base64')
  const salt = buf.subarray(0, 16)
  const iv   = buf.subarray(16, 28)
  const tag  = buf.subarray(28, 44)
  const enc  = buf.subarray(44)
  const key  = crypto.scryptSync(password, salt, 32)
  const dec  = crypto.createDecipheriv('aes-256-gcm', key, iv)
  dec.setAuthTag(tag)
  return dec.update(enc) + dec.final('utf8')
}

// ── IPC handlers ───────────────────────────────────────────
export function registerNotesHandlers() {
  const db = getDb()

  const stmtNbs = db.prepare(`
    SELECT id, label, collapsed, sort_order
    FROM notebooks WHERE project_id = ? ORDER BY sort_order
  `)
  const stmtNotes = db.prepare(`
    SELECT id, title, content, locked, sort_order,
           created_at AS createdAt, updated_at AS updatedAt
    FROM notes WHERE notebook_id = ? ORDER BY sort_order
  `)

  ipcMain.handle('notes:load', (_, projectId: string) => {
    const notebooks = (stmtNbs.all(projectId) as any[]).map(nb => ({
      id: nb.id, label: nb.label,
      collapsed: Boolean(nb.collapsed),
      notes: (stmtNotes.all(nb.id) as any[]).map(n => ({ ...n, locked: Boolean(n.locked) })),
    }))
    return { notebooks, hasPassword: hasStoredPassword() }
  })

  ipcMain.handle('notes:saveNotebook', (_, {
    projectId, notebook, notebookOrder,
  }: { projectId: string; notebook: any; notebookOrder: string[] }) => {
    try {
      db.prepare(`
        INSERT INTO notebooks (id, project_id, label, collapsed, sort_order)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          label = excluded.label, collapsed = excluded.collapsed, sort_order = excluded.sort_order
      `).run(notebook.id, projectId, notebook.label, notebook.collapsed ? 1 : 0, notebookOrder.indexOf(notebook.id))

      const upd = db.prepare('UPDATE notebooks SET sort_order = ? WHERE id = ?')
      db.transaction((order: string[]) => order.forEach((id, i) => upd.run(i, id)))(notebookOrder)
    } catch (e) {
      console.error('[orbit] notes:saveNotebook error:', e, { projectId, notebookId: notebook?.id })
      throw e
    }
  })

  ipcMain.handle('notes:saveNote', (_, {
    projectId, notebookId, note, noteOrder,
  }: { projectId: string; notebookId: string; note: any; noteOrder: string[] }) => {
    try {
      db.prepare(`
        INSERT INTO notes (id, notebook_id, title, content, locked, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title, content = excluded.content, locked = excluded.locked,
          sort_order = excluded.sort_order, updated_at = excluded.updated_at
      `).run(note.id, notebookId, note.title, note.content ?? '', note.locked ? 1 : 0,
           noteOrder.indexOf(note.id), note.createdAt ?? Date.now(), note.updatedAt ?? Date.now())

      const upd = db.prepare('UPDATE notes SET sort_order = ? WHERE id = ?')
      db.transaction((order: string[]) => order.forEach((id, i) => upd.run(i, id)))(noteOrder)
    } catch (e) {
      console.error('[orbit] notes:saveNote error:', e, { projectId, notebookId, noteId: note?.id })
      throw e
    }
  })

  ipcMain.handle('notes:deleteNote', (_, { noteId }: { projectId: string; notebookId: string; noteId: string }) => {
    db.prepare('DELETE FROM notes WHERE id = ?').run(noteId)
  })

  ipcMain.handle('notes:deleteNotebook', (_, { notebookId }: { projectId: string; notebookId: string }) => {
    db.prepare('DELETE FROM notebooks WHERE id = ?').run(notebookId)  // CASCADE deletes notes
  })

  // ── Password & encryption ────────────────────────────────
  ipcMain.handle('notes:hasPassword', () => hasStoredPassword())

  ipcMain.handle('notes:setPassword', (_, password: string) => {
    const value = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(password).toString('base64')
      : 'hash:' + crypto.createHash('sha256').update(password).digest('hex')
    db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES ('notes_key', ?)").run(value)
  })

  ipcMain.handle('notes:verifyPassword', (_, password: string) => {
    const row = db.prepare("SELECT value FROM kv WHERE key = 'notes_key'").get() as any
    if (!row) return false
    const stored = row.value as string
    if (stored.startsWith('hash:'))
      return stored === 'hash:' + crypto.createHash('sha256').update(password).digest('hex')
    if (!safeStorage.isEncryptionAvailable()) return false
    try { return safeStorage.decryptString(Buffer.from(stored, 'base64')) === password } catch { return false }
  })

  ipcMain.handle('notes:removePassword', () => {
    db.prepare("DELETE FROM kv WHERE key = 'notes_key'").run()
  })

  ipcMain.handle('notes:encrypt', (_, { content, password }: { content: string; password: string }) =>
    encryptContent(content, password))

  ipcMain.handle('notes:decrypt', (_, { encrypted, password }: { encrypted: string; password: string }) => {
    try { return { content: decryptContent(encrypted, password), error: null } }
    catch { return { content: null, error: 'wrong_password' } }
  })
}
