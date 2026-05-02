import { ipcMain } from 'electron'
import * as crypto from 'crypto'
import { getDb } from '../db'

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 16) }

export function registerLocalIssuesHandlers() {
  const db = getDb()

  // ── Load all groups + listas + issues for a project ───────
  ipcMain.handle('localIssue:load', (_, projectId: string) => {
    const groups = (db.prepare(
      'SELECT id, label, collapsed, sort_order FROM li_groups WHERE project_id = ? ORDER BY sort_order'
    ).all(projectId) as any[]).map(g => {
      const listas = (db.prepare(
        'SELECT id, label, sort_order FROM li_lists WHERE group_id = ? ORDER BY sort_order'
      ).all(g.id) as any[]).map(l => {
        const issues = (db.prepare(
          'SELECT id, number, title, body, state, priority, labels, starred, created_at AS createdAt, updated_at AS updatedAt FROM li_issues WHERE list_id = ? ORDER BY number DESC'
        ).all(l.id) as any[]).map(i => ({
          ...i,
          starred: Boolean(i.starred),
          labels: JSON.parse(i.labels ?? '[]'),
          comments: (db.prepare(
            'SELECT id, body, created_at AS createdAt, updated_at AS updatedAt FROM li_comments WHERE issue_id = ? ORDER BY created_at'
          ).all(i.id) as any[]),
        }))
        return { id: l.id, label: l.label, issues }
      })
      return { id: g.id, label: g.label, collapsed: Boolean(g.collapsed), listas }
    })
    const meta = db.prepare(
      "SELECT value FROM kv WHERE key = 'li_nextNumber_' || ?"
    ).get(projectId) as any
    return { groups, nextNumber: meta ? Number(meta.value) : 1 }
  })

  // ── Groups ────────────────────────────────────────────────
  ipcMain.handle('localIssue:addGroup', (_, projectId: string, label: string) => {
    const id = uid()
    const count = (db.prepare('SELECT COUNT(*) AS c FROM li_groups WHERE project_id = ?').get(projectId) as any).c
    db.prepare('INSERT INTO li_groups (id, project_id, label, collapsed, sort_order) VALUES (?, ?, ?, 0, ?)').run(id, projectId, label, count)
    return { id, label, collapsed: false, listas: [] }
  })

  ipcMain.handle('localIssue:renameGroup', (_, _pid: string, groupId: string, label: string) => {
    db.prepare('UPDATE li_groups SET label = ? WHERE id = ?').run(label, groupId)
  })

  ipcMain.handle('localIssue:toggleGroup', (_, _pid: string, groupId: string) => {
    db.prepare('UPDATE li_groups SET collapsed = NOT collapsed WHERE id = ?').run(groupId)
  })

  ipcMain.handle('localIssue:reorderGroups', (_, _pid: string, order: string[]) => {
    const upd = db.prepare('UPDATE li_groups SET sort_order = ? WHERE id = ?')
    db.transaction((ids: string[]) => ids.forEach((id, i) => upd.run(i, id)))(order)
  })

  ipcMain.handle('localIssue:deleteGroup', (_, _pid: string, groupId: string) => {
    db.prepare('DELETE FROM li_groups WHERE id = ?').run(groupId)  // CASCADE
  })

  // ── Listas ────────────────────────────────────────────────
  ipcMain.handle('localIssue:addLista', (_, _pid: string, groupId: string, label: string) => {
    const id = uid()
    const count = (db.prepare('SELECT COUNT(*) AS c FROM li_lists WHERE group_id = ?').get(groupId) as any).c
    db.prepare('INSERT INTO li_lists (id, group_id, label, sort_order) VALUES (?, ?, ?, ?)').run(id, groupId, label, count)
    return { id, label, issues: [] }
  })

  ipcMain.handle('localIssue:renameLista', (_, _pid: string, _gid: string, listaId: string, label: string) => {
    db.prepare('UPDATE li_lists SET label = ? WHERE id = ?').run(label, listaId)
  })

  ipcMain.handle('localIssue:deleteLista', (_, _pid: string, _gid: string, listaId: string) => {
    db.prepare('DELETE FROM li_lists WHERE id = ?').run(listaId)  // CASCADE
  })

  // ── Issues ────────────────────────────────────────────────
  ipcMain.handle('localIssue:createIssue', (_, projectId: string, _gid: string, listaId: string, data: {
    title: string; body?: string; priority?: string; labels?: string[]
  }) => {
    const kvKey = `li_nextNumber_${projectId}`
    const row   = db.prepare('SELECT value FROM kv WHERE key = ?').get(kvKey) as any
    const number = row ? Number(row.value) : 1
    db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)").run(kvKey, String(number + 1))

    const issue = {
      id: uid(), number, list_id: listaId,
      title: data.title.trim() || 'Sem título',
      body: data.body ?? '', state: 'open' as const,
      priority: data.priority ?? 'none',
      labels: JSON.stringify(data.labels ?? []),
      starred: 0, created_at: Date.now(), updated_at: Date.now(),
    }
    db.prepare(`
      INSERT INTO li_issues (id, list_id, number, title, body, state, priority, labels, starred, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(issue.id, issue.list_id, issue.number, issue.title, issue.body, issue.state,
           issue.priority, issue.labels, issue.starred, issue.created_at, issue.updated_at)

    return { ...issue, labels: data.labels ?? [], starred: false, comments: [] }
  })

  ipcMain.handle('localIssue:updateIssue', (_, _pid: string, issueId: string, patch: any) => {
    const row = db.prepare('SELECT * FROM li_issues WHERE id = ?').get(issueId) as any
    if (!row) return null
    const { comments: _c, labels, ...rest } = patch
    const updated = {
      ...rest,
      labels: labels !== undefined ? JSON.stringify(labels) : row.labels,
      starred: patch.starred !== undefined ? (patch.starred ? 1 : 0) : row.starred,
      updated_at: Date.now(),
    }
    const cols = Object.keys(updated).map(k => `${k} = ?`).join(', ')
    db.prepare(`UPDATE li_issues SET ${cols} WHERE id = ?`).run(...Object.values(updated), issueId)
    const fresh = db.prepare('SELECT * FROM li_issues WHERE id = ?').get(issueId) as any
    return { ...fresh, starred: Boolean(fresh.starred), labels: JSON.parse(fresh.labels ?? '[]') }
  })

  ipcMain.handle('localIssue:deleteIssue', (_, _pid: string, issueId: string) => {
    db.prepare('DELETE FROM li_issues WHERE id = ?').run(issueId)  // CASCADE
  })

  // ── Comments ──────────────────────────────────────────────
  ipcMain.handle('localIssue:addComment', (_, _pid: string, issueId: string, body: string) => {
    const comment = { id: uid(), issue_id: issueId, body, created_at: Date.now(), updated_at: Date.now() }
    db.prepare('INSERT INTO li_comments (id, issue_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      comment.id, comment.issue_id, comment.body, comment.created_at, comment.updated_at,
    )
    db.prepare('UPDATE li_issues SET updated_at = ? WHERE id = ?').run(Date.now(), issueId)
    return { id: comment.id, body: comment.body, createdAt: comment.created_at, updatedAt: comment.updated_at }
  })

  ipcMain.handle('localIssue:deleteComment', (_, _pid: string, issueId: string, commentId: string) => {
    db.prepare('DELETE FROM li_comments WHERE id = ?').run(commentId)
    db.prepare('UPDATE li_issues SET updated_at = ? WHERE id = ?').run(Date.now(), issueId)
  })

  ipcMain.handle('localIssue:updateComment', (_, _pid: string, issueId: string, commentId: string, body: string) => {
    db.prepare('UPDATE li_comments SET body = ?, updated_at = ? WHERE id = ?').run(body, Date.now(), commentId)
    db.prepare('UPDATE li_issues SET updated_at = ? WHERE id = ?').run(Date.now(), issueId)
  })
}
