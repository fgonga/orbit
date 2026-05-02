<template>
  <div class="flex-1 overflow-hidden flex flex-col bg-background text-foreground text-[13px]">
    <!-- Empty state -->
    <div v-if="!localStore.selectedIssue" class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <CircleDot class="h-12 w-12 opacity-25 mb-3" :stroke-width="1" />
      <p>{{ t('localIssues.emptySelect') }}</p>
    </div>

    <template v-else>
      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="px-5 pt-4 pb-3 border-b bg-card flex-shrink-0 flex flex-col gap-2.5">
        <!-- Row 1: number + state + actions -->
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground font-bold">#{{ issue.number }}</span>
            <span
              class="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              :class="issue.state === 'open' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'"
            >
              <CircleDot v-if="issue.state === 'open'" class="h-2.5 w-2.5" :stroke-width="2.5" />
              <CheckCircle v-else class="h-2.5 w-2.5" :stroke-width="2.5" />
              {{ issue.state === 'open' ? t('localIssues.stateOpen') : t('localIssues.stateClosed') }}
            </span>
          </div>
          <div class="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost" size="icon-sm"
              :title="t('localIssues.starred')"
              @click="toggleSaved"
            >
              <Bookmark class="h-3.5 w-3.5" :class="issue.starred ? 'text-primary fill-primary' : 'text-muted-foreground'" />
            </Button>
            <Button
              variant="outline" size="sm"
              :class="issue.state === 'open' ? 'text-destructive border-destructive/40 hover:bg-destructive/10' : 'text-success border-success/40 hover:bg-success/10'"
              @click="toggleState"
            >
              {{ issue.state === 'open' ? t('localIssues.closeIssue') : t('localIssues.reopenIssue') }}
            </Button>
            <Button size="icon-sm" variant="ghost" :title="t('localIssues.deleteIssue')" @click="confirmDelete">
              <Trash2 class="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" />
            </Button>
          </div>
        </div>

        <!-- Row 2: title (click to edit) -->
        <div v-if="!editingTitle" class="group/title text-lg font-bold leading-snug cursor-text flex items-start gap-2" @click="startEditTitle">
          {{ issue.title }}
          <button class="opacity-0 group-hover/title:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all flex-shrink-0" :title="t('common.edit')">
            <Pencil class="h-3 w-3" />
          </button>
        </div>
        <div v-else class="flex gap-2 items-center">
          <input
            ref="titleInputRef"
            v-model="titleDraft"
            class="flex-1 bg-background border border-primary rounded-md px-3 py-1.5 text-base font-bold outline-none"
            @keydown.enter="saveTitle"
            @keydown.esc="editingTitle = false"
          />
          <Button size="sm" @click="saveTitle">{{ t('common.save') }}</Button>
          <Button variant="outline" size="sm" @click="editingTitle = false">{{ t('common.cancel') }}</Button>
        </div>

        <!-- Row 3: timestamps -->
        <div class="text-xs text-muted-foreground flex gap-3">
          <span>{{ t('localIssues.created') }} {{ formatDate(issue.createdAt) }}</span>
          <span v-if="issue.updatedAt !== issue.createdAt">{{ t('localIssues.updated') }} {{ timeAgo(issue.updatedAt) }}</span>
        </div>
      </div>

      <!-- ── Body ───────────────────────────────────────────────── -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Left: description + comments -->
        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          <!-- Description -->
          <div class="flex flex-col gap-2.5">
            <div class="group/sec flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('localIssues.description') }}</span>
              <button
                class="opacity-0 group-hover/sec:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all"
                :title="editingBody ? t('common.cancel') : t('common.edit')"
                @click="toggleEditBody"
              >
                <Pencil v-if="!editingBody" class="h-3 w-3" />
                <X v-else class="h-3 w-3" />
              </button>
            </div>
            <div
              v-if="!editingBody"
              class="text-[13px] leading-relaxed bg-card border rounded-lg p-3.5 min-h-[80px] prose prose-sm dark:prose-invert max-w-none"
              v-html="renderedBody"
            />
            <div v-else class="flex flex-col gap-2">
              <textarea
                v-model="bodyDraft"
                rows="8"
                class="w-full bg-muted/30 rounded-lg p-3 text-sm border border-primary/50 outline-none resize-none font-mono leading-relaxed"
                :placeholder="t('localIssues.bodyPlaceholder')"
              />
              <div class="flex gap-2">
                <Button size="sm" @click="saveBody">{{ t('common.save') }}</Button>
                <Button variant="outline" size="sm" @click="editingBody = false">{{ t('common.cancel') }}</Button>
              </div>
            </div>
          </div>

          <!-- Comments -->
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('localIssues.comments') }}</span>
              <span v-if="issue.comments.length" class="text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">{{ issue.comments.length }}</span>
            </div>

            <div class="flex flex-col gap-3.5">
              <div v-for="c in issue.comments" :key="c.id" class="flex flex-col gap-0 group/comment">
                <div class="flex-1 border rounded-lg overflow-hidden bg-card">
                  <div class="group/ch flex items-center gap-2 px-3 py-2 border-b bg-muted/40 text-xs">
                    <span class="text-muted-foreground">{{ formatDate(c.createdAt) }}</span>
                    <div class="ml-auto flex gap-1" @click.stop>
                      <button v-if="editingComment === c.id" class="opacity-0 group-hover/ch:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all" @click="editingComment = null">
                        <X class="h-3 w-3" />
                      </button>
                      <button v-else class="opacity-0 group-hover/ch:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all" :title="t('common.edit')" @click="startEditComment(c.id, c.body)">
                        <Pencil class="h-3 w-3" />
                      </button>
                      <button class="opacity-0 group-hover/ch:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" :title="t('localIssues.deleteComment')" @click="deleteComment(c.id)">
                        <Trash2 class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div v-if="editingComment !== c.id" class="p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap">{{ c.body }}</div>
                  <div v-else class="flex flex-col gap-2 p-3">
                    <textarea
                      v-model="editCommentBody"
                      rows="4"
                      class="w-full bg-background border border-primary rounded-lg px-3 py-2 text-sm outline-none resize-none"
                      @keydown.ctrl.enter="saveComment(c.id)"
                      @keydown.meta.enter="saveComment(c.id)"
                    />
                    <div class="flex gap-2">
                      <Button size="sm" @click="saveComment(c.id)">{{ t('common.save') }}</Button>
                      <Button variant="outline" size="sm" @click="editingComment = null">{{ t('common.cancel') }}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- New comment -->
            <div class="flex gap-2.5">
              <div class="flex-1 border rounded-lg p-3 bg-primary/5">
                <textarea
                  v-model="newComment"
                  rows="3"
                  class="w-full bg-transparent outline-none resize-none text-sm"
                  :placeholder="t('localIssues.commentPlaceholder')"
                />
                <div class="flex justify-end mt-2">
                  <Button :disabled="!newComment.trim()" @click="submitComment">
                    {{ t('localIssues.comment') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right sidebar: metadata -->
        <div class="w-[200px] flex-shrink-0 overflow-y-auto p-4 border-l bg-card flex flex-col gap-4">

          <!-- Priority -->
          <div class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('localIssues.priority') }}</div>
            <div class="flex flex-col gap-1">
              <button
                v-for="p in priorities" :key="p.value"
                class="flex items-center gap-2 px-2 py-1 rounded-md text-[12px] font-medium transition-colors"
                :class="issue.priority === p.value
                  ? p.activeClass + ' font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
                @click="setPriority(p.value)"
              >
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="p.dotClass" />
                {{ p.label }}
              </button>
            </div>
          </div>

          <!-- Labels -->
          <div class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('localIssues.labels') }}</div>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="l in issue.labels" :key="l"
                class="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold group/label"
              >
                {{ l }}
                <button class="opacity-0 group-hover/label:opacity-100 transition-opacity" @click="removeLabel(l)">
                  <X class="h-2.5 w-2.5" :stroke-width="2.5" />
                </button>
              </span>
              <input
                v-if="addingLabel"
                ref="labelInputRef"
                v-model="newLabel"
                class="bg-background border border-primary rounded-full px-2 py-px text-[11px] outline-none w-24"
                :placeholder="t('localIssues.addLabel')"
                @keydown.enter="confirmAddLabel"
                @keydown.esc="addingLabel = false"
                @blur="addingLabel = false"
              />
              <button
                v-else
                class="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                @click="startAddLabel"
              >+ label</button>
            </div>
          </div>

          <!-- Created -->
          <div class="flex flex-col gap-0.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('localIssues.created') }}</div>
            <span class="text-xs">{{ formatDate(issue.createdAt) }}</span>
          </div>

          <!-- Updated -->
          <div v-if="issue.updatedAt !== issue.createdAt" class="flex flex-col gap-0.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('localIssues.updated') }}</div>
            <span class="text-xs">{{ timeAgo(issue.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalIssuesStore } from '@/stores/localIssues'
import { Button } from '@/components/ui/button'
import { CircleDot, CheckCircle, Trash2, X, Pencil, Bookmark } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localStore = useLocalIssuesStore()

const issue = computed(() => localStore.selectedIssue!)

// ── Title edit ───────────────────────────────────────────────
const editingTitle  = ref(false)
const titleDraft    = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)

function startEditTitle() {
  titleDraft.value  = issue.value.title
  editingTitle.value = true
  nextTick(() => titleInputRef.value?.select())
}

function saveTitle() {
  const title = titleDraft.value.trim()
  if (title && title !== issue.value.title) localStore.updateIssue(issue.value.id, { title })
  editingTitle.value = false
}

// ── Body edit ────────────────────────────────────────────────
const editingBody = ref(false)
const bodyDraft   = ref('')

function toggleEditBody() {
  if (editingBody.value) { editingBody.value = false; return }
  bodyDraft.value  = issue.value.body ?? ''
  editingBody.value = true
}

function saveBody() {
  localStore.updateIssue(issue.value.id, { body: bodyDraft.value })
  editingBody.value = false
}

const renderedBody = computed(() => {
  const body = issue.value?.body ?? ''
  if (!body) return `<span class="opacity-40 italic">${t('localIssues.noDescription')}</span>`
  return body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded overflow-x-auto my-2 text-xs"><code>$1</code></pre>')
    .replace(/`([^`\n]+)`/g, '<code class="bg-muted px-1 py-px rounded font-mono text-info text-xs">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3} (.+)$/gm, '<strong class="block text-sm my-2">$1</strong>')
    .replace(/^- (.+)$/gm, '<div class="pl-3.5 my-0.5 relative before:content-[\'–\'] before:absolute before:left-0 before:text-muted-foreground">$1</div>')
    .replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
})

// ── State ────────────────────────────────────────────────────
function toggleState() {
  localStore.updateIssue(issue.value.id, { state: issue.value.state === 'open' ? 'closed' : 'open' })
}

function toggleSaved() {
  localStore.updateIssue(issue.value.id, { starred: !issue.value.starred })
}

// ── Priority / labels ────────────────────────────────────────
const priorities = computed(() => [
  { value: 'none',   label: t('localIssues.priorityNone'),   dotClass: 'bg-muted-foreground/40', activeClass: 'bg-muted/80 text-foreground' },
  { value: 'low',    label: t('localIssues.priorityLow'),    dotClass: 'bg-info',                activeClass: 'bg-info/15 text-info' },
  { value: 'medium', label: t('localIssues.priorityMedium'), dotClass: 'bg-warning',             activeClass: 'bg-warning/15 text-warning' },
  { value: 'high',   label: t('localIssues.priorityHigh'),   dotClass: 'bg-destructive',         activeClass: 'bg-destructive/15 text-destructive' },
])

function setPriority(p: string) {
  localStore.updateIssue(issue.value.id, { priority: p as any })
}

const addingLabel   = ref(false)
const newLabel      = ref('')
const labelInputRef = ref<HTMLInputElement | null>(null)

function startAddLabel() {
  addingLabel.value = true; newLabel.value = ''
  nextTick(() => labelInputRef.value?.focus())
}

function confirmAddLabel() {
  if (!newLabel.value.trim()) { addingLabel.value = false; return }
  const lbl = newLabel.value.trim()
  if (!issue.value.labels.includes(lbl))
    localStore.updateIssue(issue.value.id, { labels: [...issue.value.labels, lbl] })
  addingLabel.value = false
}

function removeLabel(lbl: string) {
  localStore.updateIssue(issue.value.id, { labels: issue.value.labels.filter(l => l !== lbl) })
}

// ── Comments ─────────────────────────────────────────────────
const newComment      = ref('')
const editingComment  = ref<string | null>(null)
const editCommentBody = ref('')

watch(() => localStore.selectedIssue, (iss) => {
  if (iss) {
    newComment.value     = ''
    editingComment.value = null
    editingTitle.value   = false
    editingBody.value    = false
  }
})

async function submitComment() {
  if (!newComment.value.trim()) return
  await localStore.addComment(issue.value.id, newComment.value.trim())
  newComment.value = ''
}

function startEditComment(id: string, body: string) {
  editingComment.value  = id
  editCommentBody.value = body
}

function saveComment(id: string) {
  if (!editCommentBody.value.trim()) return
  localStore.updateComment(issue.value.id, id, editCommentBody.value.trim())
  editingComment.value = null
}

function deleteComment(commentId: string) {
  localStore.deleteComment(issue.value.id, commentId)
}

function confirmDelete() {
  if (confirm(t('localIssues.confirmDelete', { n: issue.value.number })))
    localStore.deleteIssue(issue.value.id)
}

// ── Formatters ───────────────────────────────────────────────
function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('common.now')
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(locale.value, { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>
