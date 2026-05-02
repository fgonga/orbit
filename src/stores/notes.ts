import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { nanoid } from 'nanoid'
import { useProjectStore } from './project'

export interface Note {
  id: string
  title: string
  content: string
  locked: boolean
  createdAt: number
  updatedAt: number
}

export interface Notebook {
  id: string
  label: string
  notes: Note[]
  collapsed?: boolean
}

export const useNotesStore = defineStore('notes', () => {
  const projectStore = useProjectStore()

  const notebooks         = ref<Notebook[]>([])
  const selectedNoteId    = ref<string | null>(null)
  const sessionPassword   = ref<string | null>(null)
  const hasPassword       = ref(false)
  const loading           = ref(false)
  const loadedProjectId   = ref<string | null>(null)
  const saveError         = ref('')

  const selectedNote = computed(() => {
    for (const nb of notebooks.value) {
      const n = nb.notes.find((n) => n.id === selectedNoteId.value)
      if (n) return n
    }
    return null
  })

  function projectId() { return projectStore.current?.id ?? '' }

  function notebookOrder() { return notebooks.value.map((nb) => nb.id) }

  function noteOrder(notebookId: string) {
    return notebooks.value.find((nb) => nb.id === notebookId)?.notes.map((n) => n.id) ?? []
  }

  function findNotebook(noteId: string) {
    return notebooks.value.find((nb) => nb.notes.some((n) => n.id === noteId))
  }

  async function load(force = false) {
    const pid = projectId()
    if (!pid) return
    if (!force && loadedProjectId.value === pid) return
    loading.value = true
    try {
      const data = await window.electron.notes.load(pid)
      notebooks.value = data.notebooks ?? []
      hasPassword.value = data.hasPassword ?? false
      loadedProjectId.value = pid
    } finally {
      loading.value = false
    }
  }

  async function addNotebook(label: string) {
    const nb: Notebook = { id: nanoid(), label, notes: [], collapsed: false }
    notebooks.value.push(nb)
    try {
      await window.electron.notes.saveNotebook({ projectId: projectId(), notebook: rawNotebook(nb), notebookOrder: notebookOrder() })
    } catch (e: any) {
      saveError.value = e?.message ?? 'Erro ao guardar caderno'
      console.error('[notes] saveNotebook failed:', e)
    }
  }

  function rawNotebook(nb: any) {
    return JSON.parse(JSON.stringify(toRaw(nb)))
  }

  function rawNote(n: any) {
    return JSON.parse(JSON.stringify(toRaw(n)))
  }

  async function renameNotebook(id: string, label: string) {
    const nb = notebooks.value.find((n) => n.id === id)
    if (!nb) return
    nb.label = label
    await window.electron.notes.saveNotebook({ projectId: projectId(), notebook: rawNotebook(nb), notebookOrder: notebookOrder() })
  }

  async function removeNotebook(id: string) {
    const idx = notebooks.value.findIndex((n) => n.id === id)
    if (idx < 0) return
    notebooks.value.splice(idx, 1)
    if (selectedNoteId.value && !selectedNote.value) selectedNoteId.value = null
    await window.electron.notes.deleteNotebook({ projectId: projectId(), notebookId: id })
  }

  async function saveNotebookOrder() {
    if (!notebooks.value.length) return
    await window.electron.notes.saveNotebook({ projectId: projectId(), notebook: rawNotebook(notebooks.value[0]), notebookOrder: notebookOrder() })
  }

  async function toggleNotebook(id: string) {
    const nb = notebooks.value.find((n) => n.id === id)
    if (!nb) return
    nb.collapsed = !nb.collapsed
    await window.electron.notes.saveNotebook({ projectId: projectId(), notebook: rawNotebook(nb), notebookOrder: notebookOrder() })
  }

  async function addNote(notebookId: string): Promise<Note | undefined> {
    const nb = notebooks.value.find((n) => n.id === notebookId)
    if (!nb) return
    const note: Note = {
      id: nanoid(), title: 'Nova nota', content: '',
      locked: false, createdAt: Date.now(), updatedAt: Date.now(),
    }
    nb.notes.push(note)
    selectedNoteId.value = note.id
    try {
      await window.electron.notes.saveNote({ projectId: projectId(), notebookId, note: rawNote(note), noteOrder: noteOrder(notebookId) })
    } catch (e: any) {
      saveError.value = e?.message ?? 'Erro ao guardar nota'
      console.error('[notes] saveNote (add) failed:', e)
    }
    return note
  }

  async function updateNote(id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) {
    const nb = findNotebook(id)
    if (!nb) return
    const n = nb.notes.find((n) => n.id === id)
    if (!n) return
    Object.assign(n, patch, { updatedAt: Date.now() })
    try {
      await window.electron.notes.saveNote({ projectId: projectId(), notebookId: nb.id, note: rawNote(n), noteOrder: noteOrder(nb.id) })
    } catch (e: any) {
      saveError.value = e?.message ?? 'Erro ao guardar nota'
      console.error('[notes] saveNote (update) failed:', e)
    }
  }

  async function removeNote(id: string) {
    const nb = findNotebook(id)
    if (!nb) return
    const idx = nb.notes.findIndex((n) => n.id === id)
    if (idx < 0) return
    nb.notes.splice(idx, 1)
    if (selectedNoteId.value === id) selectedNoteId.value = null
    await window.electron.notes.deleteNote({ projectId: projectId(), notebookId: nb.id, noteId: id })
  }

  function selectNote(id: string) { selectedNoteId.value = id }

  async function setPassword(password: string) {
    await window.electron.notes.setPassword(password)
    hasPassword.value = true
    sessionPassword.value = password
  }

  async function removePassword() {
    await window.electron.notes.removePassword()
    hasPassword.value = false
    sessionPassword.value = null
  }

  async function verifyPassword(password: string): Promise<boolean> {
    const ok = await window.electron.notes.verifyPassword(password)
    if (ok) sessionPassword.value = password
    return ok
  }

  async function lockNote(noteId: string, password: string): Promise<boolean> {
    const n = notebooks.value.flatMap((nb) => nb.notes).find((n) => n.id === noteId)
    if (!n || n.locked) return false
    const encrypted = await window.electron.notes.encrypt({ content: n.content, password })
    await updateNote(noteId, { content: encrypted, locked: true })
    return true
  }

  async function unlockNote(noteId: string, password: string): Promise<boolean> {
    const n = notebooks.value.flatMap((nb) => nb.notes).find((n) => n.id === noteId)
    if (!n || !n.locked) return false
    const result = await window.electron.notes.decrypt({ encrypted: n.content, password })
    if (result.error) return false
    await updateNote(noteId, { content: result.content ?? '', locked: false })
    return true
  }

  return {
    notebooks, selectedNoteId, selectedNote, sessionPassword, hasPassword, loading, saveError, loadedProjectId,
    load,
    addNotebook, renameNotebook, removeNotebook, toggleNotebook, saveNotebookOrder,
    addNote, updateNote, removeNote, selectNote,
    setPassword, removePassword, verifyPassword, lockNote, unlockNote,
  }
})
