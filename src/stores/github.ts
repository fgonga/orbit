import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'

export interface GhLabel   { id: number; name: string; color: string; description?: string }
export interface GhUser    { login: string; avatar_url: string; html_url: string }
export interface GhIssue   {
  number: number; title: string; body: string | null; state: 'open' | 'closed'
  labels: GhLabel[]; assignees: GhUser[]; user: GhUser
  comments: number; created_at: string; updated_at: string; html_url: string
  milestone?: { title: string } | null
}
export interface GhNotification {
  id: string
  unread: boolean
  reason: string
  subject: { title: string; type: string; url: string }
  repository: { full_name: string; html_url: string }
  updated_at: string
}

export interface GhComment {
  id: number; user: GhUser; body: string; created_at: string; updated_at: string
}

interface CacheEntry {
  issues: GhIssue[]
  fetchedAt: number
  filter: 'open' | 'closed' | 'all'
}

const CACHE_TTL    = 5 * 60 * 1000  // 5 minutos — stale
const CACHE_PREFIX = 'gd:issues:'

function cacheKey(repoPath: string) {
  // Usa base64 para evitar caracteres problemáticos na chave
  return CACHE_PREFIX + btoa(repoPath)
}

function readCache(repoPath: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(repoPath))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeCache(repoPath: string, entry: CacheEntry) {
  try { localStorage.setItem(cacheKey(repoPath), JSON.stringify(entry)) } catch {}
}

function isFresh(entry: CacheEntry | null): boolean {
  return !!entry && (Date.now() - entry.fetchedAt) < CACHE_TTL
}

export const useGithubStore = defineStore('github', () => {
  const token      = ref('')
  const hasToken   = ref(false)

  // Issues por repo
  const issuesByRepo  = reactive<Record<string, GhIssue[]>>({})
  const fetchedAt     = reactive<Record<string, number>>({})   // timestamp último fetch
  const loadingRepos  = reactive<Record<string, boolean>>({})
  const errorRepos    = reactive<Record<string, string>>({})

  // Issue aberto
  const notifications        = ref<GhNotification[]>([])
  const participatingNotifs  = ref<GhNotification[]>([])
  const notifLoading         = ref(false)
  const repoOwners           = reactive<Record<string, string>>({}) // repoPath → owner/repo

  async function loadNotifications() {
    if (!hasToken.value) return
    notifLoading.value = true
    try {
      const [all, part] = await Promise.all([
        window.electron.github.getNotifications(false),
        window.electron.github.getNotifications(true),
      ])
      notifications.value       = all
      participatingNotifs.value = part
    } catch {} finally {
      notifLoading.value = false
    }
  }

  async function detectRepoOwner(repoPath: string) {
    if (repoOwners[repoPath]) return repoOwners[repoPath]
    try {
      const info = await window.electron.github.detectRepo(repoPath)
      if (info) repoOwners[repoPath] = `${info.owner}/${info.repo}`
    } catch {}
    return repoOwners[repoPath] ?? ''
  }

  const selectedRepoPath = ref<string | null>(null)
  const selectedIssue    = ref<GhIssue | null>(null)
  const comments         = ref<GhComment[]>([])
  const issueLoading     = ref(false)
  const issueFilter      = ref<'open' | 'closed' | 'all'>('open')

  // All repos from GitHub API (for non-project repo picker)
  const allGhRepos      = ref<any[]>([])
  const ghReposLoading  = ref(false)

  async function loadAllGhRepos() {
    if (!hasToken.value || ghReposLoading.value) return
    ghReposLoading.value = true
    try {
      allGhRepos.value = await window.electron.github.listAllRepos()
    } catch {} finally {
      ghReposLoading.value = false
    }
  }

  // Indicador de sync global
  const syncing = computed(() => Object.values(loadingRepos).some(Boolean))

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    token.value    = await window.electron.github.getToken()
    hasToken.value = !!token.value
  }

  async function saveToken(t: string) {
    await window.electron.github.setToken(t)
    token.value    = t
    hasToken.value = !!t
  }

  // ── Cache restore ──────────────────────────────────────────
  function restoreFromCache(repoPath: string) {
    const entry = readCache(repoPath)
    if (entry && entry.filter === issueFilter.value) {
      issuesByRepo[repoPath] = entry.issues
      fetchedAt[repoPath]    = entry.fetchedAt
    }
  }

  function isStale(repoPath: string): boolean {
    const t = fetchedAt[repoPath]
    return !t || (Date.now() - t) > CACHE_TTL
  }

  function cacheAge(repoPath: string): string {
    const t = fetchedAt[repoPath]
    if (!t) return 'nunca'
    const m = Math.floor((Date.now() - t) / 60000)
    if (m < 1) return 'agora'
    return `há ${m}m`
  }

  // ── Load issues: stale-while-revalidate ───────────────────
  async function loadIssues(
    repoPath: string,
    state: 'open' | 'closed' | 'all' = issueFilter.value,
    force = false,
  ) {
    // 1. Restaurar do cache local imediatamente
    if (!issuesByRepo[repoPath]) restoreFromCache(repoPath)

    // 2. Se fresco e não forçado, mostrar cache e sair
    const cached = readCache(repoPath)
    if (!force && isFresh(cached) && cached!.filter === state) return

    // 3. Buscar em background (já temos cache visível)
    loadingRepos[repoPath] = true
    errorRepos[repoPath]   = ''
    try {
      const issues = await window.electron.github.listIssues(repoPath, state)
      issuesByRepo[repoPath] = issues
      fetchedAt[repoPath]    = Date.now()
      writeCache(repoPath, { issues, fetchedAt: fetchedAt[repoPath], filter: state })
    } catch (e: any) {
      const msg = e?.message ?? 'Erro'
      errorRepos[repoPath] = msg.includes('401')
        ? 'Token invalido ou sem permissao'
        : msg.includes('404')
        ? 'Repositorio nao encontrado no GitHub'
        : msg
    } finally {
      loadingRepos[repoPath] = false
    }
  }

  // ── Bulk load: todos os repos do projecto ─────────────────
  async function loadAllRepos(repos: { path: string }[], force = false) {
    // 1. Restaurar todos do cache imediatamente (sincrono)
    for (const r of repos) {
      if (!issuesByRepo[r.path]) restoreFromCache(r.path)
    }

    // 2. Separar frescos de stale
    const toFetch = repos.filter((r) => force || isStale(r.path))
    if (!toFetch.length) return

    // 3. Buscar stale em paralelo (background — cache já visível)
    await Promise.allSettled(toFetch.map((r) => loadIssues(r.path, issueFilter.value, force)))
  }

  // ── Open issue ────────────────────────────────────────────
  async function openIssue(repoPath: string, number: number) {
    issueLoading.value  = true
    selectedIssue.value = null
    comments.value      = []
    try {
      const [issue, cmts] = await Promise.all([
        window.electron.github.getIssue(repoPath, number),
        window.electron.github.getComments(repoPath, number),
      ])
      selectedIssue.value = issue
      comments.value      = cmts
    } finally {
      issueLoading.value = false
    }
  }

  // ── Update / comment ──────────────────────────────────────
  async function updateIssue(repoPath: string, number: number, patch: Partial<Pick<GhIssue, 'title' | 'body' | 'state'>>) {
    const updated = await window.electron.github.updateIssue(repoPath, number, patch)
    selectedIssue.value = updated
    const list = issuesByRepo[repoPath]
    if (list) {
      const idx = list.findIndex((i) => i.number === number)
      if (idx >= 0) list[idx] = updated
      writeCache(repoPath, { issues: list, fetchedAt: fetchedAt[repoPath], filter: issueFilter.value })
    }
  }

  async function addComment(repoPath: string, number: number, body: string) {
    const comment = await window.electron.github.addComment(repoPath, number, body)
    comments.value.push(comment)
    if (selectedIssue.value) selectedIssue.value.comments++
  }

  async function updateComment(repoPath: string, commentId: number, body: string) {
    const updated = await window.electron.github.updateComment(repoPath, commentId, body)
    const idx = comments.value.findIndex((c) => c.id === commentId)
    if (idx >= 0) comments.value[idx] = updated
  }

  async function closeIssue(repoPath: string) {
    if (!selectedIssue.value) return
    await updateIssue(repoPath, selectedIssue.value.number, { state: 'closed' })
  }

  async function reopenIssue(repoPath: string) {
    if (!selectedIssue.value) return
    await updateIssue(repoPath, selectedIssue.value.number, { state: 'open' })
  }

  // ── Filter change: invalida cache e recarrega ─────────────
  async function setFilter(f: 'open' | 'closed' | 'all', repos: { path: string }[]) {
    issueFilter.value = f
    // Invalida fetchedAt para forçar refresh com novo filtro
    for (const r of repos) {
      fetchedAt[r.path] = 0
    }
    await loadAllRepos(repos, false)
  }

  const drafts = ref<Record<string, string>>({}) // key: `${repoPath}:${issueNumber}` → draft text

  function saveDraft(repoPath: string, issueNumber: number, text: string) {
    const key = `${repoPath}:${issueNumber}`
    if (text) drafts.value[key] = text
    else delete drafts.value[key]
    try { localStorage.setItem('gd:drafts', JSON.stringify(drafts.value)) } catch {}
  }

  function loadDrafts() {
    try {
      const saved = localStorage.getItem('gd:drafts')
      if (saved) drafts.value = JSON.parse(saved)
    } catch {}
  }

  function getDraft(repoPath: string, issueNumber: number): string {
    return drafts.value[`${repoPath}:${issueNumber}`] ?? ''
  }

  return {
    token, hasToken,
    notifications, participatingNotifs, notifLoading,
    repoOwners, drafts,
    loadNotifications, detectRepoOwner,
    saveDraft, loadDrafts, getDraft,
    issuesByRepo, fetchedAt, loadingRepos, errorRepos, syncing,
    selectedRepoPath, selectedIssue, comments, issueLoading, issueFilter,
    allGhRepos, ghReposLoading, loadAllGhRepos,
    init, saveToken, loadIssues, loadAllRepos, openIssue,
    updateIssue, addComment, updateComment, closeIssue, reopenIssue,
    setFilter, isStale, cacheAge,
  }
})
