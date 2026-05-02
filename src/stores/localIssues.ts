import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProjectStore } from './project'

export interface LocalIssueComment { id: string; body: string; createdAt: number; updatedAt: number }
export interface LocalIssue {
  id: string; number: number; title: string; body: string
  state: 'open' | 'closed'; priority: 'none' | 'low' | 'medium' | 'high'
  labels: string[]; starred: boolean; comments: LocalIssueComment[]
  createdAt: number; updatedAt: number
}
export interface LocalLista { id: string; label: string; issues: LocalIssue[] }
export interface LocalGroup { id: string; label: string; collapsed: boolean; listas: LocalLista[] }

export const useLocalIssuesStore = defineStore('localIssues', () => {
  const projectStore = useProjectStore()

  const groups          = ref<LocalGroup[]>([])
  const selectedGroupId = ref<string | null>(null)
  const selectedListaId = ref<string | null>(null)
  const selectedIssueId = ref<string | null>(null)
  const localView       = ref<'lista' | 'saved' | 'draft'>('lista')
  const stateFilter     = ref<'open' | 'closed' | 'all'>('open')
  const loading         = ref(false)

  function projectId() {
    const name = projectStore.current?.name ?? 'default'
    return projectStore.current?.id ?? ''
  }

  const selectedLista = computed(() => {
    if (!selectedGroupId.value || !selectedListaId.value) return null
    return groups.value
      .find(g => g.id === selectedGroupId.value)
      ?.listas.find(l => l.id === selectedListaId.value) ?? null
  })

  const allIssues   = computed(() => groups.value.flatMap(g => g.listas.flatMap(l => l.issues)))
  const savedIssues = computed(() => allIssues.value.filter(i => i.starred))
  const savedCount  = computed(() => savedIssues.value.length)

  const selectedIssue = computed(() => {
    if (!selectedIssueId.value) return null
    return allIssues.value.find(i => i.id === selectedIssueId.value) ?? null
  })

  const draftIssues  = computed(() => allIssues.value.filter(i => !i.body.trim()))
  const draftCount   = computed(() => draftIssues.value.length)

  const currentIssues = computed(() => {
    if (localView.value === 'saved') return savedIssues.value
    if (localView.value === 'draft') return draftIssues.value
    const list = selectedLista.value?.issues ?? []
    if (stateFilter.value === 'all') return list
    return list.filter(i => i.state === stateFilter.value)
  })

  const openCount   = computed(() => (selectedLista.value?.issues ?? []).filter(i => i.state === 'open').length)
  const closedCount = computed(() => (selectedLista.value?.issues ?? []).filter(i => i.state === 'closed').length)

  async function load() {
    loading.value = true
    try {
      const data = await window.electron.localIssue.load(projectId())
      groups.value = (data.groups ?? []) as LocalGroup[]
    } finally {
      loading.value = false
    }
  }

  // ── Groups ────────────────────────────────────────────────
  async function addGroup(label: string) {
    const g = await window.electron.localIssue.addGroup(projectId(), label)
    groups.value.push(g as LocalGroup)
    return g
  }

  async function renameGroup(groupId: string, label: string) {
    await window.electron.localIssue.renameGroup(projectId(), groupId, label)
    const g = groups.value.find(g => g.id === groupId)
    if (g) g.label = label
  }

  async function toggleGroup(groupId: string) {
    await window.electron.localIssue.toggleGroup(projectId(), groupId)
    const g = groups.value.find(g => g.id === groupId)
    if (g) g.collapsed = !g.collapsed
  }

  async function reorderGroups() {
    await window.electron.localIssue.reorderGroups(projectId(), groups.value.map(g => g.id))
  }

  async function deleteGroup(groupId: string) {
    await window.electron.localIssue.deleteGroup(projectId(), groupId)
    groups.value = groups.value.filter(g => g.id !== groupId)
    if (selectedGroupId.value === groupId) {
      selectedGroupId.value = null; selectedListaId.value = null; selectedIssueId.value = null
    }
  }

  // ── Listas ────────────────────────────────────────────────
  async function addLista(groupId: string, label: string) {
    const lista = await window.electron.localIssue.addLista(projectId(), groupId, label)
    const group = groups.value.find(g => g.id === groupId)
    if (group && lista) group.listas.push(lista as LocalLista)
    return lista
  }

  async function renameLista(groupId: string, listaId: string, label: string) {
    await window.electron.localIssue.renameLista(projectId(), groupId, listaId, label)
    const l = groups.value.find(g => g.id === groupId)?.listas.find(l => l.id === listaId)
    if (l) l.label = label
  }

  async function deleteLista(groupId: string, listaId: string) {
    await window.electron.localIssue.deleteLista(projectId(), groupId, listaId)
    const g = groups.value.find(g => g.id === groupId)
    if (g) g.listas = g.listas.filter(l => l.id !== listaId)
    if (selectedListaId.value === listaId) { selectedListaId.value = null; selectedIssueId.value = null }
  }

  function selectLista(groupId: string, listaId: string) {
    selectedGroupId.value = groupId
    selectedListaId.value = listaId
    selectedIssueId.value = null
    localView.value = 'lista'
  }

  // ── Issues ────────────────────────────────────────────────
  async function createIssue(data: { title: string; body?: string; priority?: string; labels?: string[] }): Promise<LocalIssue | null> {
    if (!selectedGroupId.value || !selectedListaId.value) return null
    const issue = await window.electron.localIssue.createIssue(projectId(), selectedGroupId.value, selectedListaId.value, data)
    const lista = groups.value.find(g => g.id === selectedGroupId.value)?.listas.find(l => l.id === selectedListaId.value)
    if (lista) lista.issues.unshift(issue)
    selectedIssueId.value = issue.id
    return issue
  }

  async function updateIssue(issueId: string, patch: Partial<Omit<LocalIssue, 'id' | 'number' | 'createdAt' | 'comments'>>) {
    const updated = await window.electron.localIssue.updateIssue(projectId(), issueId, patch as any)
    if (!updated) return
    for (const g of groups.value)
      for (const l of g.listas) {
        const idx = l.issues.findIndex(i => i.id === issueId)
        if (idx >= 0) { l.issues[idx] = updated; return }
      }
  }

  async function deleteIssue(issueId: string) {
    await window.electron.localIssue.deleteIssue(projectId(), issueId)
    for (const g of groups.value)
      for (const l of g.listas) {
        const idx = l.issues.findIndex(i => i.id === issueId)
        if (idx >= 0) { l.issues.splice(idx, 1); break }
      }
    if (selectedIssueId.value === issueId) selectedIssueId.value = null
  }

  function selectIssue(id: string | null) { selectedIssueId.value = id }

  // ── Comments ──────────────────────────────────────────────
  async function addComment(issueId: string, body: string) {
    const comment = await window.electron.localIssue.addComment(projectId(), issueId, body)
    if (!comment) return null
    const issue = allIssues.value.find(i => i.id === issueId)
    if (issue) issue.comments.push(comment)
    return comment
  }

  async function deleteComment(issueId: string, commentId: string) {
    await window.electron.localIssue.deleteComment(projectId(), issueId, commentId)
    const issue = allIssues.value.find(i => i.id === issueId)
    if (issue) issue.comments = issue.comments.filter(c => c.id !== commentId)
  }

  async function updateComment(issueId: string, commentId: string, body: string) {
    await window.electron.localIssue.updateComment(projectId(), issueId, commentId, body)
    const issue = allIssues.value.find(i => i.id === issueId)
    if (issue) {
      const c = issue.comments.find(c => c.id === commentId)
      if (c) { c.body = body; c.updatedAt = Date.now() }
    }
  }

  return {
    groups, loading, stateFilter, localView,
    selectedGroupId, selectedListaId, selectedIssueId,
    selectedLista, selectedIssue, allIssues, savedIssues, savedCount,
    draftIssues, draftCount, currentIssues, openCount, closedCount,
    load, addGroup, renameGroup, toggleGroup, reorderGroups, deleteGroup,
    addLista, renameLista, deleteLista, selectLista,
    createIssue, updateIssue, deleteIssue, selectIssue,
    addComment, deleteComment, updateComment,
  }
})
