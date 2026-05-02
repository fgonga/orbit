<template>
  <div class="flex flex-1 overflow-hidden bg-background text-foreground text-[13px]">
    <!-- Empty state -->
    <template v-if="!note">
      <div class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <NotebookPen class="h-14 w-14 opacity-25 mb-3" :stroke-width="1" />
        <p>{{ t('notes.emptyNote') }}</p>
      </div>
    </template>

    <!-- Locked state — password prompt -->
    <template v-else-if="note.locked && unlockedContent === null">
      <div class="flex-1 flex flex-col items-center justify-center gap-4">
        <div class="flex flex-col items-center gap-2 mb-2">
          <div class="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center">
            <Lock class="h-6 w-6 text-warning" />
          </div>
          <p class="font-semibold">{{ note.title || t('notes.untitled') }}</p>
          <p class="text-muted-foreground text-xs">{{ t('notes.lockedDesc') }}</p>
        </div>

        <div class="flex flex-col gap-2 w-64">
          <Input
            v-model="passwordInput"
            type="password"
            :placeholder="t('notes.passwordPlaceholder')"
            :class="{ 'border-destructive': wrongPassword }"
            @keydown.enter="unlock"
            @input="wrongPassword = false"
          />
          <p v-if="wrongPassword" class="text-destructive text-xs text-center">{{ t('notes.wrongPassword') }}</p>
          <Button :disabled="!passwordInput || unlocking" @click="unlock">
            <Loader2 v-if="unlocking" class="h-3.5 w-3.5 animate-spin" />
            <LockOpen v-else class="h-3.5 w-3.5" />
            {{ t('notes.unlock') }}
          </Button>
          <p v-if="!notesStore.hasPassword" class="text-muted-foreground text-[11px] text-center">
            {{ t('notes.noPasswordConfigured') }}
          </p>
        </div>
      </div>
    </template>

    <!-- Active note editor -->
    <template v-else-if="note">
      <div class="flex flex-1 flex-col overflow-hidden">
        <!-- Row 1: title only -->
        <div class="flex items-center gap-2 px-4 py-2 border-b bg-card flex-shrink-0">
          <input
            v-model="editTitle"
            class="flex-1 bg-transparent border-none outline-none font-semibold text-sm text-foreground placeholder:text-muted-foreground min-w-0"
            :placeholder="t('notes.untitled')"
            @blur="saveTitle"
            @keydown.enter.prevent="saveTitle"
          />
        </div>

        <!-- Row 2: formatting toolbar — directly above the editor -->
        <div v-if="viewMode !== 'preview'" class="flex items-center gap-0.5 px-3 py-1 border-b bg-card/60 flex-shrink-0">
          <button
            v-for="tool in toolbar"
            :key="tool.label"
            class="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            :title="tool.label"
            @click.prevent="applyFormat(tool.fmt)"
          >
            <component :is="tool.icon" class="h-3.5 w-3.5" :stroke-width="1.8" />
          </button>
        </div>

        <!-- Lock password prompt bar -->
        <div v-if="lockPrompt" class="flex items-center gap-2 px-4 py-2 bg-warning/10 border-b border-warning/20 text-xs flex-shrink-0">
          <Lock class="h-3.5 w-3.5 text-warning flex-shrink-0" />
          <span class="text-warning flex-1">{{ t('notes.lockPromptDesc') }}</span>
          <Input
            v-model="lockPasswordInput"
            type="password"
            size="sm"
            class="w-40 h-7 text-xs"
            :placeholder="t('notes.passwordPlaceholder')"
            @keydown.enter="confirmLock"
            @keydown.esc="lockPrompt = false"
          />
          <Button size="sm" :disabled="!lockPasswordInput" @click="confirmLock">{{ t('notes.lock') }}</Button>
          <button class="p-1 text-muted-foreground hover:text-foreground" @click="lockPrompt = false">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Editor / Preview / Split -->
        <div class="flex flex-1 overflow-hidden">
          <!-- Edit only -->
          <textarea
            v-if="viewMode === 'edit'"
            ref="editorRef"
            v-model="editContent"
            class="flex-1 resize-none bg-background text-foreground font-mono text-sm px-4 py-3 outline-none leading-relaxed"
            :placeholder="t('notes.editPlaceholder')"
            @blur="saveContent"
            @keydown.tab.prevent="insertTab"
            @keydown="onEditorKeydown"
          />

          <!-- Split: editor left + resizable handle + preview right -->
          <template v-else-if="viewMode === 'split'">
            <textarea
              ref="editorRef"
              v-model="editContent"
              class="resize-none bg-background text-foreground font-mono text-sm px-4 py-3 outline-none leading-relaxed flex-shrink-0"
              :style="{ width: splitEditorW + 'px' }"
              :placeholder="t('notes.editPlaceholder')"
              @blur="saveContent"
              @keydown.tab.prevent="insertTab"
              @keydown="onEditorKeydown"
            />
            <!-- Inline resize handle -->
            <div
              class="w-[3px] flex-shrink-0 cursor-col-resize bg-transparent hover:bg-primary/40 transition-colors relative z-10 after:content-[''] after:absolute after:inset-y-0 after:-left-1 after:-right-1 border-x border-border/30"
              :class="{ '!bg-primary/40': splitDragging }"
              @mousedown.prevent="startSplitDrag"
            />
            <div
              class="flex-1 overflow-auto px-6 py-4 border-l border-border/30 prose-notes bg-muted/20"
              v-html="renderedMarkdown"
              @click="onPreviewClick"
            />
          </template>

          <!-- Preview only -->
          <div
            v-else
            class="flex-1 overflow-auto px-6 py-4 prose-notes"
            v-html="renderedMarkdown"
            @click="onPreviewClick"
          />
        </div>

        <!-- Footer: view icons + lock on the left, stats on the right -->
        <div class="flex items-center gap-1.5 px-3 py-1 border-t bg-card/40 text-[11px] text-muted-foreground flex-shrink-0">
          <!-- View mode toggle -->
          <div class="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            <button
              class="p-1 rounded transition-colors"
              :class="viewMode === 'split' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
              :title="t('notes.split')"
              @click="viewMode = 'split'"
            ><Columns2 class="h-3 w-3" /></button>
            <button
              class="p-1 rounded transition-colors"
              :class="viewMode === 'edit' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
              :title="t('notes.edit')"
              @click="viewMode = 'edit'"
            ><Pencil class="h-3 w-3" /></button>
            <button
              class="p-1 rounded transition-colors"
              :class="viewMode === 'preview' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
              :title="t('notes.preview')"
              @click="viewMode = 'preview'"
            ><Eye class="h-3 w-3" /></button>
          </div>

          <!-- Lock/Unlock -->
          <button
            class="p-1 rounded transition-colors"
            :class="note.locked
              ? 'text-warning hover:bg-warning/15'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'"
            :title="note.locked ? t('notes.unlockPermanently') : t('notes.lock')"
            @click="toggleLock"
          >
            <LockOpen v-if="note.locked" class="h-3 w-3" />
            <Lock v-else class="h-3 w-3" />
          </button>

          <div class="w-px h-3 bg-border mx-0.5" />
          <span>{{ wordCount }} {{ t('notes.words') }}</span>
          <span class="ml-auto">{{ t('notes.lastEdited') }} {{ relativeTime }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotesStore } from '@/stores/notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Lock, LockOpen, NotebookPen, Loader2, X, Columns2, Pencil, Eye,
  Bold, Italic, Code, Heading1, Heading2, List, Quote, ListTodo,
} from 'lucide-vue-next'

const { t } = useI18n()
const notesStore = useNotesStore()

type ViewMode = 'edit' | 'split' | 'preview'

const viewMode         = ref<ViewMode>('split')
const editTitle        = ref('')
const editContent      = ref('')
const passwordInput    = ref('')
const wrongPassword    = ref(false)
const unlocking        = ref(false)
const lockPrompt       = ref(false)
const lockPasswordInput = ref('')
const unlockedContent  = ref<string | null>(null)
const editorRef        = ref<HTMLTextAreaElement | null>(null)

const note = computed(() => notesStore.selectedNote)

// ── Split resize ───────────────────────────────────────────
const SPLIT_KEY = 'gd:layout:note-split'
const stored = localStorage.getItem(SPLIT_KEY)
const splitEditorW = ref(stored ? Number(stored) : 420)
const splitDragging = ref(false)

function startSplitDrag(e: MouseEvent) {
  splitDragging.value = true
  let lastX = e.clientX
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMove(e: MouseEvent) {
    const delta = e.clientX - lastX
    lastX = e.clientX
    splitEditorW.value = Math.max(200, Math.min(900, splitEditorW.value + delta))
    localStorage.setItem(SPLIT_KEY, String(splitEditorW.value))
  }
  function onUp() {
    splitDragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const toolbar = [
  { label: 'Bold',      fmt: 'bold',   icon: Bold     },
  { label: 'Italic',    fmt: 'italic', icon: Italic   },
  { label: 'Code',      fmt: 'code',   icon: Code     },
  { label: 'H1',        fmt: 'h1',     icon: Heading1 },
  { label: 'H2',        fmt: 'h2',     icon: Heading2 },
  { label: 'Lista',     fmt: 'list',   icon: List     },
  { label: 'Checklist', fmt: 'check',  icon: ListTodo },
  { label: 'Citação',   fmt: 'quote',  icon: Quote    },
]

watch(note, (n, prev) => {
  // Flush unsaved content for the previous note before switching
  if (prev && !prev.locked && saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    notesStore.updateNote(prev.id, { content: editContent.value })
  }

  if (!n) {
    editTitle.value = ''
    editContent.value = ''
    unlockedContent.value = null
    passwordInput.value = ''
    wrongPassword.value = false
    lockPrompt.value = false
    return
  }
  editTitle.value = n.title
  if (n.locked) {
    if (notesStore.sessionPassword) {
      autoUnlock(n.id, notesStore.sessionPassword)
    } else {
      unlockedContent.value = null
      editContent.value = ''
    }
  } else {
    unlockedContent.value = null
    editContent.value = n.content
  }
}, { immediate: true })

async function autoUnlock(id: string, password: string) {
  const result = await window.electron.notes.decrypt({ encrypted: note.value!.content, password })
  if (result.error || note.value?.id !== id) return
  unlockedContent.value = result.content ?? ''
  editContent.value = result.content ?? ''
}

async function unlock() {
  if (!note.value || unlocking.value) return
  unlocking.value = true
  const ok = await notesStore.verifyPassword(passwordInput.value)
  if (!ok) { wrongPassword.value = true; unlocking.value = false; return }
  const result = await window.electron.notes.decrypt({ encrypted: note.value.content, password: passwordInput.value })
  if (result.error) { wrongPassword.value = true; unlocking.value = false; return }
  unlockedContent.value = result.content ?? ''
  editContent.value = result.content ?? ''
  passwordInput.value = ''
  wrongPassword.value = false
  unlocking.value = false
}

function toggleLock() {
  if (!note.value) return
  if (note.value.locked) {
    if (unlockedContent.value !== null) {
      notesStore.updateNote(note.value.id, { content: unlockedContent.value, locked: false })
      editContent.value = unlockedContent.value
      unlockedContent.value = null
    }
  } else {
    lockPrompt.value = true
    lockPasswordInput.value = ''
  }
}

async function confirmLock() {
  if (!note.value || !lockPasswordInput.value) return
  const pwd = lockPasswordInput.value
  if (!notesStore.hasPassword) {
    await notesStore.setPassword(pwd)
  } else {
    const ok = await notesStore.verifyPassword(pwd)
    if (!ok) { alert(t('notes.wrongPassword')); return }
  }
  await notesStore.lockNote(note.value.id, pwd)
  unlockedContent.value = null
  lockPrompt.value = false
  lockPasswordInput.value = ''
}

function saveTitle() {
  if (!note.value) return
  const title = editTitle.value.trim()
  if (title !== note.value.title) notesStore.updateNote(note.value.id, { title: title || 'Nova nota' })
}

function saveContent() {
  if (!note.value) return
  if (note.value.locked && unlockedContent.value !== null && notesStore.sessionPassword) {
    window.electron.notes.encrypt({ content: editContent.value, password: notesStore.sessionPassword })
      .then((enc) => {
        notesStore.updateNote(note.value!.id, { content: enc })
        unlockedContent.value = editContent.value
      })
  } else {
    notesStore.updateNote(note.value.id, { content: editContent.value })
  }
}

function applyFormat(fmt: string) {
  const ta = editorRef.value
  if (!ta) return
  const start = ta.selectionStart
  const end   = ta.selectionEnd
  const sel   = editContent.value.substring(start, end)
  let before = '', after = '', insert = ''
  switch (fmt) {
    case 'bold':   before = '**'; after = '**'; insert = sel || 'texto'; break
    case 'italic': before = '*';  after = '*';  insert = sel || 'texto'; break
    case 'code':   before = '`';  after = '`';  insert = sel || 'código'; break
    case 'h1':     before = '# '; after = '';   insert = sel || 'Título'; break
    case 'h2':     before = '## '; after = '';  insert = sel || 'Título'; break
    case 'list':   before = '- ';      after = ''; insert = sel || 'item'; break
    case 'check':  before = '- [ ] '; after = ''; insert = sel || 'item'; break
    case 'quote':  before = '> ';      after = ''; insert = sel || 'citação'; break
  }
  const newContent = editContent.value.substring(0, start) + before + insert + after + editContent.value.substring(end)
  editContent.value = newContent
  nextTick(() => {
    ta.focus()
    const cursor = start + before.length + insert.length
    ta.setSelectionRange(cursor, cursor)
  })
}

function insertTab() {
  const ta = editorRef.value
  if (!ta) return
  const start = ta.selectionStart
  editContent.value = editContent.value.substring(0, start) + '  ' + editContent.value.substring(ta.selectionEnd)
  nextTick(() => { ta.setSelectionRange(start + 2, start + 2) })
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.shiftKey) return
  const ta = editorRef.value
  if (!ta) return
  const pos = ta.selectionStart
  const text = editContent.value
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const currentLine = text.substring(lineStart, pos)

  const match = currentLine.match(/^(\s*)- \[[ xX]\] (.*)/)
  if (!match) return

  e.preventDefault()
  const [, indent, content] = match

  if (!content.trim()) {
    // Empty checklist item → break out
    const newText = text.substring(0, lineStart) + indent + '\n' + text.substring(pos)
    editContent.value = newText
    nextTick(() => { ta.setSelectionRange(lineStart + indent.length + 1, lineStart + indent.length + 1) })
  } else {
    // Continue with new unchecked item
    const newLine = '\n' + indent + '- [ ] '
    const newText = text.substring(0, pos) + newLine + text.substring(ta.selectionEnd)
    editContent.value = newText
    nextTick(() => { ta.setSelectionRange(pos + newLine.length, pos + newLine.length) })
  }
}

function onPreviewClick(e: MouseEvent) {
  const target = e.target as HTMLInputElement
  if (target.tagName !== 'INPUT' || target.type !== 'checkbox') return
  const lineIdx = parseInt(target.getAttribute('data-line') ?? '-1')
  if (lineIdx < 0) return
  e.preventDefault()
  const lines = editContent.value.split('\n')
  if (lineIdx >= lines.length) return
  const line = lines[lineIdx]
  if (/^- \[ \]/.test(line))       lines[lineIdx] = line.replace(/^- \[ \]/, '- [x]')
  else if (/^- \[[xX]\]/.test(line)) lines[lineIdx] = line.replace(/^- \[[xX]\]/, '- [ ]')
  editContent.value = lines.join('\n')
  saveContent()
}

// ── Markdown renderer ──────────────────────────────────────
const renderedMarkdown = computed(() => renderMarkdown(editContent.value))

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s: string): string {
  let h = esc(s)
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>')
  h = h.replace(/~~(.+?)~~/g, '<del>$1</del>')
  h = h.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
  h = h.replace(/\[(.+?)\]\((.+?)\)/g, '<a class="md-link" href="$2">$1</a>')
  return h
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  const rawLines = text.split('\n')
  const out: string[] = []
  let paraLines: string[] = []
  let inCode = false
  let codeLines: string[] = []

  function flushPara() {
    if (!paraLines.length) return
    out.push(`<p class="md-p">${paraLines.map(inline).join('<br>')}</p>`)
    paraLines = []
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]

    if (line.startsWith('```')) {
      if (inCode) {
        out.push(`<pre class="md-pre"><code>${esc(codeLines.join('\n'))}</code></pre>`)
        codeLines = []; inCode = false
      } else { flushPara(); inCode = true }
      continue
    }
    if (inCode) { codeLines.push(line); continue }
    if (!line.trim()) { flushPara(); continue }
    if (line === '---') { flushPara(); out.push('<hr class="md-hr">'); continue }

    const h3 = line.match(/^### (.+)$/); if (h3) { flushPara(); out.push(`<h3 class="md-h3">${inline(h3[1])}</h3>`); continue }
    const h2 = line.match(/^## (.+)$/);  if (h2) { flushPara(); out.push(`<h2 class="md-h2">${inline(h2[1])}</h2>`); continue }
    const h1 = line.match(/^# (.+)$/);   if (h1) { flushPara(); out.push(`<h1 class="md-h1">${inline(h1[1])}</h1>`); continue }
    const bq = line.match(/^> (.+)$/);   if (bq) { flushPara(); out.push(`<blockquote class="md-blockquote">${inline(bq[1])}</blockquote>`); continue }

    // Checklist (must come before regular list)
    const cu = line.match(/^- \[ \] (.*)$/)
    const cc = line.match(/^- \[[xX]\] (.*)$/)
    if (cu || cc) {
      flushPara()
      const done = !!cc
      const label = done ? cc![1] : cu![1]
      out.push(
        `<li class="md-li-check${done ? ' md-li-checked' : ''}" data-line="${i}">` +
        `<input type="checkbox" class="md-checkbox" data-line="${i}"${done ? ' checked' : ''}>` +
        `<span class="${done ? 'md-check-done' : ''}">${inline(label)}</span></li>`)
      continue
    }

    const ul = line.match(/^[-*+] (.+)$/); if (ul) { flushPara(); out.push(`<li class="md-li-ul">${inline(ul[1])}</li>`); continue }
    const ol = line.match(/^\d+\. (.+)$/); if (ol) { flushPara(); out.push(`<li class="md-li-ol">${inline(ol[1])}</li>`); continue }

    paraLines.push(line)
  }
  flushPara()
  return out.join('\n')
}

// ── Word count & relative time ─────────────────────────────
const wordCount = computed(() => {
  if (!editContent.value.trim()) return 0
  return editContent.value.trim().split(/\s+/).length
})

const relativeTime = computed(() => {
  if (!note.value) return ''
  const diff = Date.now() - note.value.updatedAt
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)  return t('common.now')
  if (hours < 1) return t('common.ago', { n: `${mins}m` })
  if (days  < 1) return t('common.ago', { n: `${hours}h` })
  return t('common.ago', { n: `${days}d` })
})

let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(editContent, () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveContent, 600)
})

function flushPendingSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    saveContent()
  }
}

onMounted(() => window.addEventListener('beforeunload', flushPendingSave))
onUnmounted(() => {
  window.removeEventListener('beforeunload', flushPendingSave)
  flushPendingSave()
})
</script>

<style scoped>
:deep(.md-h1)         { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; }
:deep(.md-h2)         { font-size: 1.1rem;  font-weight: 700; margin: 0.875rem 0 0.375rem; }
:deep(.md-h3)         { font-size: 1rem;    font-weight: 600; margin: 0.75rem 0 0.25rem; }
:deep(.md-p)          { margin-bottom: 0.625rem; line-height: 1.65; }
:deep(.md-pre)        { background: hsl(var(--muted)); border-radius: 6px; padding: 0.75rem; margin: 0.625rem 0; font-size: 0.78rem; overflow-x: auto; }
:deep(.md-code)       { background: hsl(var(--muted)); border-radius: 3px; padding: 0.1em 0.35em; font-size: 0.82em; font-family: ui-monospace, monospace; }
:deep(.md-blockquote) { border-left: 3px solid hsl(var(--primary)); padding-left: 0.75rem; color: hsl(var(--muted-foreground)); font-style: italic; margin: 0.5rem 0; }
:deep(.md-hr)         { border: none; border-top: 1px solid hsl(var(--border)); margin: 0.875rem 0; }
:deep(.md-link)       { color: hsl(var(--primary)); text-decoration: underline; }
:deep(.md-li-ul)      { list-style: disc; margin-left: 1.25rem; margin-bottom: 0.1rem; }
:deep(.md-li-ol)      { list-style: decimal; margin-left: 1.25rem; margin-bottom: 0.1rem; }
:deep(.md-li-check)   { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.25rem; list-style: none; }
:deep(.md-checkbox)   { margin-top: 0.2rem; flex-shrink: 0; width: 14px; height: 14px; cursor: pointer; accent-color: hsl(var(--primary)); }
:deep(.md-check-done) { text-decoration: line-through; opacity: 0.55; }
:deep(.md-li-checked) { opacity: 0.8; }
</style>
