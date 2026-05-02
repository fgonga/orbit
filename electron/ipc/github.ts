import { ipcMain } from 'electron'
import simpleGit from 'simple-git'
import axios from 'axios'
import { getDb } from '../db'

function getToken(): string {
  const row = getDb().prepare("SELECT value FROM kv WHERE key = 'github_token'").get() as any
  return row?.value ?? ''
}

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function getOwnerRepo(repoPath: string): Promise<{ owner: string; repo: string } | null> {
  if (repoPath.startsWith('gh:')) {
    const rest = repoPath.slice(3)
    const slash = rest.indexOf('/')
    if (slash < 0) return null
    return { owner: rest.slice(0, slash), repo: rest.slice(slash + 1) }
  }
  try {
    const git = simpleGit(repoPath)
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
    if (!origin) return null
    const url = origin.refs.fetch || origin.refs.push || ''
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/)
    if (!m) return null
    return { owner: m[1], repo: m[2] }
  } catch { return null }
}

export function registerGitHubHandlers() {
  ipcMain.handle('github:getToken', () => getToken())

  ipcMain.handle('github:setToken', (_, token: string) => {
    getDb().prepare("INSERT OR REPLACE INTO kv (key, value) VALUES ('github_token', ?)").run(token.trim())
  })

  ipcMain.handle('github:detectRepo', async (_, repoPath: string) => {
    return await getOwnerRepo(repoPath)
  })

  ipcMain.handle('github:listIssues', async (_, repoPath: string, state: 'open' | 'closed' | 'all' = 'open') => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Não é um repositório GitHub')
    const { data } = await axios.get(
      `https://api.github.com/repos/${info.owner}/${info.repo}/issues`,
      { headers: ghHeaders(token), params: { state, per_page: 100 } }
    )
    return data.filter((i: any) => !i.pull_request) // excluir PRs
  })

  ipcMain.handle('github:getIssue', async (_, repoPath: string, number: number) => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Não é um repositório GitHub')
    const { data } = await axios.get(
      `https://api.github.com/repos/${info.owner}/${info.repo}/issues/${number}`,
      { headers: ghHeaders(token) }
    )
    return data
  })

  ipcMain.handle('github:getComments', async (_, repoPath: string, number: number) => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Não é um repositório GitHub')
    const { data } = await axios.get(
      `https://api.github.com/repos/${info.owner}/${info.repo}/issues/${number}/comments`,
      { headers: ghHeaders(token), params: { per_page: 100 } }
    )
    return data
  })

  ipcMain.handle('github:addComment', async (_, repoPath: string, number: number, body: string) => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Não é um repositório GitHub')
    const { data } = await axios.post(
      `https://api.github.com/repos/${info.owner}/${info.repo}/issues/${number}/comments`,
      { body },
      { headers: ghHeaders(token) }
    )
    return data
  })

  ipcMain.handle('github:updateIssue', async (_, repoPath: string, number: number, patch: any) => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Não é um repositório GitHub')
    const { data } = await axios.patch(
      `https://api.github.com/repos/${info.owner}/${info.repo}/issues/${number}`,
      patch,
      { headers: ghHeaders(token) }
    )
    return data
  })

  ipcMain.handle('github:updateComment', async (_, repoPath: string, commentId: number, body: string) => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Não é um repositório GitHub')
    const { data } = await axios.patch(
      `https://api.github.com/repos/${info.owner}/${info.repo}/issues/comments/${commentId}`,
      { body },
      { headers: ghHeaders(token) }
    )
    return data
  })

  ipcMain.handle('github:getNotifications', async (_, participating = false) => {
    const token = getToken()
    const { data } = await axios.get('https://api.github.com/notifications', {
      headers: ghHeaders(token),
      params: { all: false, participating, per_page: 50 },
    })
    return data
  })

  ipcMain.handle('github:markNotificationRead', async (_, threadId: string) => {
    const token = getToken()
    await axios.patch(`https://api.github.com/notifications/threads/${threadId}`, {}, { headers: ghHeaders(token) })
  })

  ipcMain.handle('github:createIssue', async (_, repoPath: string, payload: { title: string; body?: string; labels?: string[]; assignees?: string[] }) => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Nao e um repositorio GitHub')
    const { data } = await axios.post(
      `https://api.github.com/repos/${info.owner}/${info.repo}/issues`,
      payload,
      { headers: ghHeaders(token) }
    )
    return data
  })

  ipcMain.handle('github:listLabels', async (_, repoPath: string) => {
    const token = getToken()
    const info = await getOwnerRepo(repoPath)
    if (!info) throw new Error('Não é um repositório GitHub')
    const { data } = await axios.get(
      `https://api.github.com/repos/${info.owner}/${info.repo}/labels`,
      { headers: ghHeaders(token), params: { per_page: 100 } }
    )
    return data
  })

  ipcMain.handle('github:listAllRepos', async () => {
    const token = getToken()
    if (!token) return []
    try {
      const { data } = await axios.get('https://api.github.com/user/repos', {
        headers: ghHeaders(token),
        params: { per_page: 100, sort: 'pushed', affiliation: 'owner,collaborator,organization_member' },
      })
      return data.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: { login: r.owner.login, avatar_url: r.owner.avatar_url },
        private: r.private,
        updatedAt: r.pushed_at,
      }))
    } catch { return [] }
  })
}
