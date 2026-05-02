import { app, ipcMain, dialog, shell } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import { getDb } from '../db'

export function registerBackupHandlers() {
  // ── Export ────────────────────────────────────────────────
  ipcMain.handle('backup:export', async () => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Exportar backup',
      defaultPath: `orbit-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Orbit Backup', extensions: ['json'] }],
    })
    if (canceled || !filePath) return { ok: false }

    const db = getDb()

    // Projects
    const projects = (db.prepare('SELECT id, name, data, created_at, updated_at FROM projects').all() as any[])
      .map(r => ({ id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at, ...JSON.parse(r.data) }))

    // Notes (per project) — with sort_order preserved
    const notes: Record<string, any[]> = {}
    for (const p of projects) {
      const nbs = db.prepare('SELECT * FROM notebooks WHERE project_id = ? ORDER BY sort_order').all(p.id) as any[]
      notes[p.id] = nbs.map(nb => ({
        id: nb.id, label: nb.label, collapsed: Boolean(nb.collapsed), sort_order: nb.sort_order,
        notes: (db.prepare('SELECT * FROM notes WHERE notebook_id = ? ORDER BY sort_order').all(nb.id) as any[])
          .map(n => ({
            id: n.id, title: n.title, content: n.content, locked: Boolean(n.locked),
            sort_order: n.sort_order, createdAt: n.created_at, updatedAt: n.updated_at,
          })),
      }))
    }

    // Local issues (per project) — with sort_order preserved
    const localIssues: Record<string, any[]> = {}
    for (const p of projects) {
      const groups = db.prepare('SELECT * FROM li_groups WHERE project_id = ? ORDER BY sort_order').all(p.id) as any[]
      localIssues[p.id] = groups.map(g => ({
        id: g.id, label: g.label, collapsed: Boolean(g.collapsed), sort_order: g.sort_order,
        listas: (db.prepare('SELECT * FROM li_lists WHERE group_id = ? ORDER BY sort_order').all(g.id) as any[])
          .map(l => ({
            id: l.id, label: l.label, sort_order: l.sort_order,
            issues: (db.prepare('SELECT * FROM li_issues WHERE list_id = ? ORDER BY number DESC').all(l.id) as any[]).map(i => ({
              id: i.id, number: i.number, title: i.title, body: i.body,
              state: i.state, priority: i.priority, labels: JSON.parse(i.labels ?? '[]'),
              starred: Boolean(i.starred), createdAt: i.created_at, updatedAt: i.updated_at,
              comments: (db.prepare('SELECT * FROM li_comments WHERE issue_id = ? ORDER BY created_at').all(i.id) as any[])
                .map(c => ({ id: c.id, body: c.body, createdAt: c.created_at, updatedAt: c.updated_at })),
            })),
          })),
      }))
    }

    // Settings — exclude notes_key (machine-specific OS keychain encryption)
    const settings: Record<string, string> = {}
    for (const row of db.prepare("SELECT key, value FROM kv WHERE key != 'notes_key'").all() as any[]) {
      settings[row.key] = row.value
    }
    // Export li_nextNumber counters
    for (const row of db.prepare("SELECT key, value FROM kv WHERE key LIKE 'li_nextNumber_%'").all() as any[]) {
      settings[row.key] = row.value
    }

    try {
      writeFileSync(filePath, JSON.stringify({
        version: 3, app: 'orbit',
        exportedAt: new Date().toISOString(),
        projects, notes, localIssues, settings,
      }, null, 2))
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Erro ao escrever ficheiro.' }
    }

    return { ok: true, path: filePath }
  })

  // ── Import ────────────────────────────────────────────────
  ipcMain.handle('backup:import', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Importar backup',
      filters: [{ name: 'Orbit Backup', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths[0]) return { ok: false }

    let bundle: any
    try { bundle = JSON.parse(readFileSync(filePaths[0], 'utf-8')) }
    catch { return { ok: false, error: 'Ficheiro inválido ou corrompido.' } }

    if (bundle?.app !== 'orbit' || !bundle?.version) {
      return { ok: false, error: 'O ficheiro não é um backup Orbit válido.' }
    }

    const db = getDb()
    try {
      db.transaction(() => {
        // Projects
        for (const p of (bundle.projects ?? [])) {
          const { id, name, createdAt, updatedAt, ...data } = p
          db.prepare(`
            INSERT OR REPLACE INTO projects (id, name, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(id, name, JSON.stringify(data), createdAt ?? Date.now(), updatedAt ?? Date.now())
        }

        // Notes — restore sort_order from backup
        if (bundle.notes) {
          for (const [projectId, nbs] of Object.entries(bundle.notes as Record<string, any[]>)) {
            let nbIdx = 0
            for (const nb of nbs) {
              db.prepare(`INSERT OR REPLACE INTO notebooks (id, project_id, label, collapsed, sort_order) VALUES (?, ?, ?, ?, ?)`)
                .run(nb.id, projectId, nb.label, nb.collapsed ? 1 : 0, nb.sort_order ?? nbIdx)
              nbIdx++
              let noteIdx = 0
              for (const n of (nb.notes ?? [])) {
                db.prepare(`INSERT OR REPLACE INTO notes (id, notebook_id, title, content, locked, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                  .run(n.id, nb.id, n.title, n.content ?? '', n.locked ? 1 : 0, n.sort_order ?? noteIdx, n.createdAt ?? Date.now(), n.updatedAt ?? Date.now())
                noteIdx++
              }
            }
          }
        }

        // Local issues — restore sort_order from backup
        if (bundle.localIssues) {
          for (const [projectId, groups] of Object.entries(bundle.localIssues as Record<string, any[]>)) {
            let gIdx = 0
            for (const g of groups) {
              db.prepare(`INSERT OR REPLACE INTO li_groups (id, project_id, label, collapsed, sort_order) VALUES (?, ?, ?, ?, ?)`)
                .run(g.id, projectId, g.label, g.collapsed ? 1 : 0, g.sort_order ?? gIdx)
              gIdx++
              let lIdx = 0
              for (const l of (g.listas ?? [])) {
                db.prepare(`INSERT OR REPLACE INTO li_lists (id, group_id, label, sort_order) VALUES (?, ?, ?, ?)`)
                  .run(l.id, g.id, l.label, l.sort_order ?? lIdx)
                lIdx++
                for (const i of (l.issues ?? [])) {
                  db.prepare(`INSERT OR REPLACE INTO li_issues (id, list_id, number, title, body, state, priority, labels, starred, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                    .run(i.id, l.id, i.number, i.title, i.body ?? '', i.state ?? 'open', i.priority ?? 'none', JSON.stringify(i.labels ?? []), i.starred ? 1 : 0, i.createdAt ?? Date.now(), i.updatedAt ?? Date.now())
                  for (const c of (i.comments ?? [])) {
                    db.prepare(`INSERT OR REPLACE INTO li_comments (id, issue_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
                      .run(c.id, i.id, c.body, c.createdAt ?? Date.now(), c.updatedAt ?? Date.now())
                  }
                }
              }
            }
          }
        }

        // Settings (github_token + li_nextNumber counters; never notes_key)
        if (bundle.settings) {
          for (const [key, value] of Object.entries(bundle.settings as Record<string, string>)) {
            if (key === 'notes_key') continue
            db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)').run(key, value)
          }
        }
      })()
    } catch (e: any) {
      console.error('[orbit] backup:import error:', e)
      return { ok: false, error: e?.message ?? 'Erro ao importar backup.' }
    }

    return { ok: true, projectCount: (bundle.projects ?? []).length }
  })

  // ── Open data folder ──────────────────────────────────────
  ipcMain.handle('backup:openFolder', async () => {
    await shell.openPath(app.getPath('userData'))
  })
}
