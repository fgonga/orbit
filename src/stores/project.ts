import { defineStore } from 'pinia'
import { ref, toRaw, watch } from 'vue'
import { nanoid } from 'nanoid'
import type { Project, Group, Repo } from '@/types/project'

export const useProjectStore = defineStore('project', () => {
  const current   = ref<Project | null>(null)
  const saving    = ref(false)
  const saveError = ref('')

  // ── Auto-save: dispara sempre que o projecto muda ────────
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    current,
    () => {
      if (!current.value?.id) return
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(async () => {
        saving.value = true
        saveError.value = ''
        try {
          const plain = JSON.parse(JSON.stringify(toRaw(current.value)))
          await window.electron.project.save({ project: plain })
        } catch (e: any) {
          saveError.value = e?.message ?? 'Erro ao guardar'
        } finally {
          saving.value = false
        }
      }, 300)
    },
    { deep: true },
  )

  // ── Abrir / criar ────────────────────────────────────────
  async function createProject(name: string) {
    current.value = await window.electron.project.createInWorkspace(name)
  }

  async function openById(id: string) {
    const project = await window.electron.project.loadFromPath(id)
    if (project) current.value = project
  }

  // kept for compatibility — now "path" = project id
  async function openFromPath(id: string) { return openById(id) }

  async function importProject() {
    const project = await window.electron.project.import()
    if (project) current.value = project
    return project
  }

  async function saveProject() {
    if (!current.value) return
    const plain = JSON.parse(JSON.stringify(toRaw(current.value)))
    await window.electron.project.save({ project: plain })
  }

  // ── Grupos ───────────────────────────────────────────────
  function addGroup(label: string) {
    if (!current.value) return
    current.value.groups.push({ id: nanoid(), label, repos: [], collapsed: false })
  }

  function removeGroup(groupId: string) {
    if (!current.value) return
    current.value.groups = current.value.groups.filter((g) => g.id !== groupId)
  }

  function renameGroup(groupId: string, label: string) {
    const g = current.value?.groups.find((g) => g.id === groupId)
    if (g) g.label = label
  }

  function toggleGroup(groupId: string) {
    const g = current.value?.groups.find((g) => g.id === groupId)
    if (g) g.collapsed = !g.collapsed
  }

  function setGroupColumns(groupId: string, columns: 1 | 2 | 3) {
    const g = current.value?.groups.find((g) => g.id === groupId)
    if (g) g.columns = columns
  }

  // ── Repos ────────────────────────────────────────────────
  function addRepo(groupId: string, label: string, path: string) {
    const g = current.value?.groups.find((g) => g.id === groupId)
    if (!g) return
    g.repos.push({ id: nanoid(), label, path })
  }

  function removeRepo(groupId: string, repoId: string) {
    const g = current.value?.groups.find((g) => g.id === groupId)
    if (!g) return
    g.repos = g.repos.filter((r) => r.id !== repoId)
  }

  function renameRepo(groupId: string, repoId: string, label: string) {
    const g = current.value?.groups.find((g) => g.id === groupId)
    const r = g?.repos.find((r) => r.id === repoId)
    if (r) r.label = label
  }

  function moveRepo(fromGroupId: string, toGroupId: string, repoId: string) {
    const fromGroup = current.value?.groups.find((g) => g.id === fromGroupId)
    const toGroup   = current.value?.groups.find((g) => g.id === toGroupId)
    if (!fromGroup || !toGroup) return
    const idx = fromGroup.repos.findIndex((r) => r.id === repoId)
    if (idx === -1) return
    const [repo] = fromGroup.repos.splice(idx, 1)
    toGroup.repos.push(repo)
  }

  return {
    current, saving, saveError,
    createProject, openById, openFromPath, saveProject, importProject,
    addGroup, removeGroup, renameGroup, toggleGroup, setGroupColumns,
    addRepo, removeRepo, renameRepo, moveRepo,
  }
})
