import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { GitStatus, GitCommit, GitBranches } from '@/env'

export interface RepoState {
  loading: boolean
  error: string | null
  status: GitStatus | null
  log: GitCommit[]
  branches: GitBranches | null
}

export interface DiffPane {
  repoPath: string
  file: string
  staged: boolean
  diff: string
}

export const useGitStore = defineStore('git', () => {
  const repos = reactive<Record<string, RepoState>>({})
  const selectedRepos = ref<Set<string>>(new Set())
  const diffPane = ref<DiffPane | null>(null)
  const activeRepo = ref<string | null>(null)

  function initRepo(repoPath: string) {
    if (!repos[repoPath]) {
      repos[repoPath] = { loading: false, error: null, status: null, log: [], branches: null }
    }
  }

  async function refresh(repoPath: string) {
    initRepo(repoPath)
    const state = repos[repoPath]
    state.loading = true
    state.error = null
    try {
      const [status, log, branches] = await Promise.all([
        window.electron.git.status(repoPath),
        window.electron.git.log(repoPath),
        window.electron.git.branches(repoPath),
      ])
      state.status = status
      state.log = log
      state.branches = branches
    } catch (e: any) {
      state.error = e?.message ?? 'Erro ao carregar repositório'
    } finally {
      state.loading = false
    }
  }

  async function stageFile(repoPath: string, file: string) {
    await window.electron.git.stage(repoPath, [file])
    await refresh(repoPath)
  }

  async function unstageFile(repoPath: string, file: string) {
    await window.electron.git.unstage(repoPath, [file])
    await refresh(repoPath)
  }

  async function stageAll(repoPath: string) {
    await window.electron.git.stageAll(repoPath)
    await refresh(repoPath)
  }

  async function commit(repoPath: string, message: string) {
    await window.electron.git.commit(repoPath, message)
    await refresh(repoPath)
  }

  async function push(repoPath: string) {
    await window.electron.git.push(repoPath)
    await refresh(repoPath)
  }

  async function pull(repoPath: string, strategy: 'merge' | 'rebase' | 'ff-only' = 'merge') {
    await window.electron.git.pull(repoPath, strategy)
    await refresh(repoPath)
  }

  async function checkout(repoPath: string, branch: string) {
    await window.electron.git.checkout(repoPath, branch)
    await refresh(repoPath)
  }

  async function showDiff(repoPath: string, file: string, staged = false) {
    const diff = await window.electron.git.diff(repoPath, file, staged)
    diffPane.value = { repoPath, file, staged, diff }
  }

  function closeDiff() {
    diffPane.value = null
  }

  function toggleSelect(repoPath: string) {
    if (selectedRepos.value.has(repoPath)) {
      selectedRepos.value.delete(repoPath)
    } else {
      selectedRepos.value.add(repoPath)
    }
  }

  function clearSelection() {
    selectedRepos.value.clear()
  }

  async function bulkCommit(paths: string[], message: string) {
    await Promise.allSettled(paths.map((p) => commit(p, message)))
  }

  async function bulkPush(paths: string[]) {
    await Promise.allSettled(paths.map((p) => push(p)))
  }

  async function bulkPull(paths: string[]) {
    await Promise.allSettled(paths.map((p) => pull(p)))
  }

  return {
    repos,
    selectedRepos,
    diffPane,
    activeRepo,
    initRepo,
    refresh,
    stageFile,
    unstageFile,
    stageAll,
    commit,
    push,
    pull,
    checkout,
    showDiff,
    closeDiff,
    toggleSelect,
    clearSelection,
    bulkCommit,
    bulkPush,
    bulkPull,
  }
})
