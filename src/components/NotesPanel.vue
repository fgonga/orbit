<template>
  <aside
    class="flex-shrink-0 bg-card border-r flex flex-col overflow-hidden"
    :style="{ width: width + 'px' }"
  >
    <!-- Search -->
    <div class="flex items-center gap-1.5 px-2.5 py-2 border-b bg-muted/40">
      <Search class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <input
        v-model="search"
        :placeholder="t('notes.searchPlaceholder')"
        class="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
      />
    </div>

    <!-- Notebooks list -->
    <div class="flex-1 overflow-y-auto pb-1">
      <template v-if="notesStore.notebooks.length === 0 && !notesStore.loading">
        <div class="p-4 text-center text-muted-foreground text-xs">
          {{ t('notes.noNotebooks') }}
        </div>
      </template>

      <VueDraggable
        v-model="notesStore.notebooks"
        handle=".nb-drag-handle"
        :animation="160"
        @end="notesStore.saveNotebookOrder()"
      >
      <template v-for="nb in notesStore.notebooks" :key="nb.id">
        <!-- Notebook header -->
        <div
          class="group/nb flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none border-t hover:bg-accent/40 transition-colors first:border-t-0"
          @click="notesStore.toggleNotebook(nb.id)"
        >
          <GripVertical class="nb-drag-handle h-3 w-3 flex-shrink-0 opacity-30 cursor-grab hover:opacity-80 transition-opacity" />
          <ChevronDown
            class="h-3 w-3 transition-transform flex-shrink-0"
            :class="{ '-rotate-90': nb.collapsed }"
          />

          <template v-if="editingNotebook?.id === nb.id">
            <input
              :ref="el => { if (el && editingNotebook?.id === nb.id) (el as HTMLInputElement).select() }"
              v-model="editingNotebook.label"
              class="flex-1 bg-background border border-primary rounded text-foreground text-xs px-1.5 py-px outline-none min-w-0 lowercase"
              @click.stop
              @keydown.enter.stop="confirmRenameNotebook"
              @keydown.esc.stop="editingNotebook = null"
              @blur="confirmRenameNotebook"
            />
          </template>
          <span
            v-else
            class="flex-1 truncate"
            :title="t('notes.dblClickRename')"
            @dblclick.stop="startRenameNotebook(nb)"
          >{{ nb.label }}</span>

          <button
            class="bg-transparent border-none cursor-pointer p-0.5 text-muted-foreground opacity-0 group-hover/nb:opacity-100 hover:!text-primary transition-colors rounded flex items-center"
            :title="t('notes.addNote')"
            @click.stop="notesStore.addNote(nb.id)"
          >
            <Plus class="h-3 w-3" :stroke-width="2.5" />
          </button>

          <button
            class="group/nbdel relative flex items-center justify-center min-w-[22px] h-[18px] text-[10px] rounded-full px-1.5 ml-1 bg-muted text-muted-foreground font-normal hover:bg-destructive/10 hover:text-destructive/60 transition-all cursor-pointer"
            :title="t('notes.deleteNotebook')"
            @click.stop="confirmDeleteNotebook(nb)"
          >
            <span class="group-hover/nbdel:opacity-0 transition-opacity leading-none select-none">{{ nb.notes.length }}</span>
            <Trash2 class="absolute h-2.5 w-2.5 opacity-0 group-hover/nbdel:opacity-100 transition-opacity" :stroke-width="2" />
          </button>
        </div>

        <!-- Notes list -->
        <template v-if="!nb.collapsed">
          <div
            v-for="note in nb.notes.filter(n => matchesSearch(n))"
            :key="note.id"
            class="group/note flex items-center gap-2 w-full pl-[22px] pr-2.5 py-1.5 cursor-pointer text-muted-foreground text-xs transition-colors hover:bg-accent/50 hover:text-foreground"
            :class="{
              'bg-primary/15 !text-primary font-semibold': notesStore.selectedNoteId === note.id,
            }"
            @click="notesStore.selectNote(note.id)"
          >
            <Lock v-if="note.locked" class="h-2.5 w-2.5 flex-shrink-0 text-warning" :stroke-width="2.5" />
            <FileText v-else class="h-2.5 w-2.5 flex-shrink-0 opacity-40" :stroke-width="2" />

            <span class="flex-1 truncate">{{ note.title || t('notes.untitled') }}</span>

            <button
              class="opacity-0 group-hover/note:opacity-100 bg-transparent border-none cursor-pointer p-0.5 rounded text-muted-foreground flex-shrink-0 flex items-center hover:!text-destructive hover:bg-destructive/15 transition-all"
              :title="t('notes.deleteNote')"
              @click.stop="notesStore.removeNote(note.id)"
            >
              <X class="h-2.5 w-2.5" :stroke-width="2.5" />
            </button>
          </div>

          <div v-if="nb.notes.length === 0" class="px-2.5 pl-[22px] py-1.5 text-muted-foreground text-[11px]">
            {{ t('notes.noNotes') }}
          </div>
        </template>
      </template>
      </VueDraggable>
    </div>

    <!-- Add notebook -->
    <div class="p-2 border-t flex-shrink-0">
      <div v-if="addingNotebook" class="mb-1.5">
        <input
          ref="nbInputRef"
          v-model="newNotebookLabel"
          class="w-full bg-background border border-primary rounded px-2 py-1 text-[11px] outline-none"
          :placeholder="t('notes.notebookNamePlaceholder')"
          @keydown.enter="confirmAddNotebook"
          @keydown.esc="addingNotebook = false"
          @blur="addingNotebook = false"
        />
      </div>
      <button
        class="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md border border-dashed border-muted-foreground/40 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        @click="startAddNotebook"
      >
        <Plus class="h-3 w-3" />
        {{ t('notes.newNotebook') }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueDraggable } from 'vue-draggable-plus'
import { useNotesStore, type Notebook, type Note } from '@/stores/notes'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, Plus, X, Lock, FileText, Trash2, GripVertical } from 'lucide-vue-next'

defineProps<{ width: number }>()

const { t } = useI18n()
const notesStore = useNotesStore()

const search = ref('')

function matchesSearch(note: Note) {
  if (!search.value.trim()) return true
  const q = search.value.toLowerCase()
  return note.title.toLowerCase().includes(q) || (!note.locked && note.content.toLowerCase().includes(q))
}

// ── Add notebook ───────────────────────────────────────────
const addingNotebook   = ref(false)
const newNotebookLabel = ref('')
const nbInputRef       = ref<HTMLInputElement | null>(null)

function startAddNotebook() {
  addingNotebook.value   = true
  newNotebookLabel.value = ''
  nextTick(() => nbInputRef.value?.focus())
}

function confirmAddNotebook() {
  if (!newNotebookLabel.value.trim()) { addingNotebook.value = false; return }
  notesStore.addNotebook(newNotebookLabel.value.trim())
  addingNotebook.value = false
}

// ── Rename notebook ────────────────────────────────────────
const editingNotebook = ref<{ id: string; label: string } | null>(null)

function startRenameNotebook(nb: Notebook) {
  editingNotebook.value = { id: nb.id, label: nb.label }
}

function confirmRenameNotebook() {
  if (!editingNotebook.value) return
  const label = editingNotebook.value.label.trim()
  if (label) notesStore.renameNotebook(editingNotebook.value.id, label)
  editingNotebook.value = null
}

function confirmDeleteNotebook(nb: Notebook) {
  if (nb.notes.length > 0 && !confirm(t('notes.deleteNotebookConfirm', { label: nb.label, n: nb.notes.length }))) return
  notesStore.removeNotebook(nb.id)
}
</script>
