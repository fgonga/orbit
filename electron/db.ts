/**
 * Unified SQLite database for Orbit.
 * All persistent data lives here — projects, notes, local issues, settings.
 */
import { app } from 'electron'
import { join } from 'path'
import {
  existsSync, readFileSync, readdirSync,
  unlinkSync, rmSync, writeFileSync,
} from 'fs'
import * as crypto from 'crypto'
import Database from 'better-sqlite3'

const DB_PATH        = join(app.getPath('userData'), 'orbit.db')
const MIGRATION_FLAG = join(app.getPath('userData'), 'orbit-migrated.flag')

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS kv (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL,
    data       TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
  );

  CREATE TABLE IF NOT EXISTS notebooks (
    id         TEXT    PRIMARY KEY,
    project_id TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label      TEXT    NOT NULL,
    collapsed  INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_nb_pid ON notebooks(project_id);

  CREATE TABLE IF NOT EXISTS notes (
    id          TEXT    PRIMARY KEY,
    notebook_id TEXT    NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL DEFAULT 'Nova nota',
    content     TEXT    NOT NULL DEFAULT '',
    locked      INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_note_nb ON notes(notebook_id);

  CREATE TABLE IF NOT EXISTS li_groups (
    id         TEXT    PRIMARY KEY,
    project_id TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label      TEXT    NOT NULL,
    collapsed  INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_lig_pid ON li_groups(project_id);

  CREATE TABLE IF NOT EXISTS li_lists (
    id         TEXT    PRIMARY KEY,
    group_id   TEXT    NOT NULL REFERENCES li_groups(id) ON DELETE CASCADE,
    label      TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_lil_gid ON li_lists(group_id);

  CREATE TABLE IF NOT EXISTS li_issues (
    id         TEXT    PRIMARY KEY,
    list_id    TEXT    NOT NULL REFERENCES li_lists(id) ON DELETE CASCADE,
    number     INTEGER NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    state      TEXT    NOT NULL DEFAULT 'open',
    priority   TEXT    NOT NULL DEFAULT 'none',
    labels     TEXT    NOT NULL DEFAULT '[]',
    starred    INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lii_lid ON li_issues(list_id);

  CREATE TABLE IF NOT EXISTS li_comments (
    id         TEXT    PRIMARY KEY,
    issue_id   TEXT    NOT NULL REFERENCES li_issues(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lic_iid ON li_comments(issue_id);
`

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    _db.exec(SCHEMA)
    migrateFromFiles(_db)
  }
  return _db
}

// ── One-time migration from file-based storage ─────────────
function safeSlug(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60)
}

function migrateFromFiles(db: Database.Database) {
  if (existsSync(MIGRATION_FLAG)) return

  const userData = app.getPath('userData')
  const PROJECTS_DIR   = join(userData, 'projects')
  const NOTES_ROOT     = join(userData, 'notes')
  const NOTES_DB       = join(userData, 'notes.db')
  const LI_ROOT        = join(userData, 'localIssues')
  const TOKEN_FILE     = join(userData, 'github-token.txt')
  const NOTES_KEY_FILE = join(userData, 'notes-key.enc')

  // Slug → new project UUID map (built during project migration)
  const slugToId: Record<string, string> = {}

  const run = db.transaction(() => {
    // ── 1. Migrate projects ──────────────────────────────────
    if (existsSync(PROJECTS_DIR)) {
      const insertProject = db.prepare(`
        INSERT OR IGNORE INTO projects (id, name, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      for (const file of readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.gitdash.json'))) {
        try {
          const raw  = readFileSync(join(PROJECTS_DIR, file), 'utf-8')
          const data = JSON.parse(raw)
          const id   = crypto.randomUUID()
          const now  = Date.now()
          const { _filePath: _, ...clean } = data
          insertProject.run(id, data.name || file, JSON.stringify(clean), now, now)
          slugToId[safeSlug(data.name || file)] = id
        } catch {}
      }
    }

    // ── 2. Migrate notes (file-based) ────────────────────────
    if (existsSync(NOTES_ROOT)) {
      const insertNb = db.prepare(`
        INSERT OR IGNORE INTO notebooks (id, project_id, label, collapsed, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `)
      const insertNote = db.prepare(`
        INSERT OR IGNORE INTO notes (id, notebook_id, title, content, locked, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const slugEntry of readdirSync(NOTES_ROOT, { withFileTypes: true })) {
        if (!slugEntry.isDirectory()) continue
        const slug = slugEntry.name
        const projectId = slugToId[slug]
        if (!projectId) continue   // no matching project

        const indexPath = join(NOTES_ROOT, slug, '_index.json')
        const nbOrder: string[] = existsSync(indexPath)
          ? (JSON.parse(readFileSync(indexPath, 'utf-8')).notebookOrder ?? [])
          : []

        for (const nbEntry of readdirSync(join(NOTES_ROOT, slug), { withFileTypes: true })) {
          if (!nbEntry.isDirectory()) continue
          const metaPath = join(NOTES_ROOT, slug, nbEntry.name, '_meta.json')
          if (!existsSync(metaPath)) continue
          const meta      = JSON.parse(readFileSync(metaPath, 'utf-8'))
          const noteOrder: string[] = meta.noteOrder ?? []
          insertNb.run(meta.id, projectId, meta.label, meta.collapsed ? 1 : 0, nbOrder.indexOf(meta.id))
          for (const f of readdirSync(join(NOTES_ROOT, slug, nbEntry.name))) {
            if (!f.endsWith('.json') || f === '_meta.json') continue
            try {
              const n = JSON.parse(readFileSync(join(NOTES_ROOT, slug, nbEntry.name, f), 'utf-8'))
              insertNote.run(n.id, meta.id, n.title, n.content ?? '', n.locked ? 1 : 0, noteOrder.indexOf(n.id), n.createdAt, n.updatedAt)
            } catch {}
          }
        }
      }
    }

    // ── 3. Migrate notes.db (if created by the intermediate SQLite step) ─
    if (existsSync(NOTES_DB)) {
      try {
        const oldDb = new Database(NOTES_DB, { readonly: true })
        const insertNb = db.prepare(`
          INSERT OR IGNORE INTO notebooks (id, project_id, label, collapsed, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `)
        const insertNote = db.prepare(`
          INSERT OR IGNORE INTO notes (id, notebook_id, title, content, locked, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        // notebooks in notes.db had project_slug, map to project_id
        const nbs = oldDb.prepare('SELECT * FROM notebooks').all() as any[]
        for (const nb of nbs) {
          const projectId = slugToId[nb.project_slug] ?? nb.project_slug
          insertNb.run(nb.id, projectId, nb.label, nb.collapsed, nb.sort_order)
          const noteRows = oldDb.prepare('SELECT * FROM notes WHERE notebook_id = ?').all(nb.id) as any[]
          for (const n of noteRows) {
            insertNote.run(n.id, n.notebook_id, n.title, n.content, n.locked, n.sort_order, n.created_at, n.updated_at)
          }
        }
        oldDb.close()
      } catch (e) {
        console.error('[orbit] notes.db migration error:', e)
      }
    }

    // ── 4. Migrate local issues ──────────────────────────────
    if (existsSync(LI_ROOT)) {
      const insertGroup = db.prepare(`
        INSERT OR IGNORE INTO li_groups (id, project_id, label, collapsed, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `)
      const insertList = db.prepare(`
        INSERT OR IGNORE INTO li_lists (id, group_id, label, sort_order)
        VALUES (?, ?, ?, ?)
      `)
      const insertIssue = db.prepare(`
        INSERT OR IGNORE INTO li_issues (id, list_id, number, title, body, state, priority, labels, starred, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const insertComment = db.prepare(`
        INSERT OR IGNORE INTO li_comments (id, issue_id, body, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `)

      for (const slugEntry of readdirSync(LI_ROOT, { withFileTypes: true })) {
        if (!slugEntry.isDirectory()) continue
        const slug      = slugEntry.name
        const projectId = slugToId[slug]
        if (!projectId) continue

        const metaPath = join(LI_ROOT, slug, '_meta.json')
        const groupOrder: string[] = existsSync(metaPath)
          ? (JSON.parse(readFileSync(metaPath, 'utf-8')).groupOrder ?? [])
          : []

        for (const gEntry of readdirSync(join(LI_ROOT, slug), { withFileTypes: true })) {
          if (!gEntry.isDirectory()) continue
          const gMeta = join(LI_ROOT, slug, gEntry.name, '_meta.json')
          if (!existsSync(gMeta)) continue
          const gm = JSON.parse(readFileSync(gMeta, 'utf-8'))
          insertGroup.run(gm.id, projectId, gm.label, gm.collapsed ? 1 : 0, groupOrder.indexOf(gm.id))

          const listaOrder: string[] = gm.listaOrder ?? []
          for (const lEntry of readdirSync(join(LI_ROOT, slug, gEntry.name), { withFileTypes: true })) {
            if (!lEntry.isDirectory()) continue
            const lMeta = join(LI_ROOT, slug, gEntry.name, lEntry.name, '_meta.json')
            if (!existsSync(lMeta)) continue
            const lm = JSON.parse(readFileSync(lMeta, 'utf-8'))
            insertList.run(lm.id, gm.id, lm.label, listaOrder.indexOf(lm.id))

            for (const f of readdirSync(join(LI_ROOT, slug, gEntry.name, lEntry.name))) {
              if (!f.endsWith('.json') || f === '_meta.json') continue
              try {
                const issue = JSON.parse(readFileSync(join(LI_ROOT, slug, gEntry.name, lEntry.name, f), 'utf-8'))
                insertIssue.run(
                  issue.id, lm.id, issue.number, issue.title,
                  issue.body ?? '', issue.state ?? 'open',
                  issue.priority ?? 'none', JSON.stringify(issue.labels ?? []),
                  issue.starred ? 1 : 0, issue.createdAt, issue.updatedAt,
                )
                for (const c of (issue.comments ?? [])) {
                  insertComment.run(c.id, issue.id, c.body, c.createdAt, c.updatedAt)
                }
              } catch {}
            }
          }
        }
      }
    }

    // ── 5. Migrate settings ──────────────────────────────────
    const insertKv = db.prepare('INSERT OR IGNORE INTO kv (key, value) VALUES (?, ?)')
    if (existsSync(TOKEN_FILE)) {
      try { insertKv.run('github_token', readFileSync(TOKEN_FILE, 'utf-8').trim()) } catch {}
    }
    if (existsSync(NOTES_KEY_FILE)) {
      try { insertKv.run('notes_key', readFileSync(NOTES_KEY_FILE, 'utf-8').trim()) } catch {}
    }
  })

  try {
    run()
    writeFileSync(MIGRATION_FLAG, new Date().toISOString())

    // Clean up old files now that migration is done
    const toRemove = [
      join(userData, 'projects'),
      join(userData, 'notes'),
      join(userData, 'notes.db'),
      join(userData, 'notes-migrated.flag'),
      join(userData, 'localIssues'),
      join(userData, 'github-token.txt'),
      join(userData, 'notes-key.enc'),
    ]
    for (const p of toRemove) {
      try {
        if (!existsSync(p)) continue
        const stat = require('fs').statSync(p)
        if (stat.isDirectory()) rmSync(p, { recursive: true, force: true })
        else unlinkSync(p)
      } catch {}
    }
  } catch (e) {
    console.error('[orbit] migration error:', e)
  }
}
