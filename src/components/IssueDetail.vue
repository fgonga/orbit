<template>
  <div class="flex-1 overflow-hidden flex flex-col bg-background text-foreground text-[13px]">
    <div v-if="ghStore.issueLoading" class="flex-1 flex items-center justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div v-else-if="!ghStore.selectedIssue" class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <CircleDot class="h-12 w-12 opacity-25 mb-3" :stroke-width="1" />
      <p>{{ t('issueDetail.selectIssue') }}</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="px-5 pt-4 pb-3 border-b bg-card flex-shrink-0 flex flex-col gap-2.5">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground font-bold">#{{ issue.number }}</span>
            <Badge
              class="gap-1 rounded-full text-[11px]"
              :class="issue.state === 'open' ? 'bg-success/15 text-success border-0' : 'bg-primary/15 text-primary border-0'"
            >
              <CircleDot v-if="issue.state === 'open'" class="h-2.5 w-2.5" :stroke-width="2.5" />
              <CheckCircle v-else class="h-2.5 w-2.5" :stroke-width="2.5" />
              {{ issue.state === 'open' ? t('issueDetail.stateOpen') : t('issueDetail.stateClosed') }}
            </Badge>
          </div>

          <div class="flex items-center gap-2 ml-auto">
            <Button
              :variant="issue.state === 'open' ? 'outline' : 'outline'"
              size="sm"
              :class="issue.state === 'open' ? 'text-destructive border-destructive/40' : 'text-success border-success/40'"
              :disabled="saving"
              @click="toggleState"
            >
              {{ issue.state === 'open' ? t('issueDetail.closeIssue') : t('issueDetail.reopenIssue') }}
            </Button>
            <Button variant="ghost" size="icon-sm" :title="t('issueDetail.openOnGithub')" @click="openExternal(issue.html_url)">
              <ExternalLink class="h-3 w-3" />
            </Button>
          </div>
        </div>

        <!-- Title -->
        <div v-if="!editingTitle" class="group/title text-lg font-bold leading-snug cursor-text flex items-start gap-2" @click="startEditTitle">
          {{ issue.title }}
          <button class="opacity-0 group-hover/title:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all" :title="t('issueDetail.editTitle')">
            <Pencil class="h-3 w-3" />
          </button>
        </div>
        <div v-else class="flex gap-2 items-center">
          <Input
            ref="titleRef"
            v-model="titleDraft"
            class="flex-1 h-9 text-base font-bold border-primary"
            @keydown.enter="saveTitle"
            @keydown.esc="editingTitle = false"
          />
          <Button size="sm" :disabled="saving" @click="saveTitle">{{ t('common.save') }}</Button>
          <Button variant="outline" size="sm" @click="editingTitle = false">{{ t('common.cancel') }}</Button>
        </div>

        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <img v-if="issue.user.avatar_url" :src="issue.user.avatar_url" class="w-[18px] h-[18px] rounded-full object-cover" />
          <i18n-t keypath="issueDetail.createdBy">
            <template #user><strong class="text-foreground">{{ issue.user.login }}</strong></template>
            <template #when>{{ timeAgo(issue.created_at) }}</template>
          </i18n-t>
          <span v-if="issue.comments" class="inline-flex items-center gap-1 px-2 py-px rounded-full bg-muted text-[11px]">
            <MessageSquare class="h-2.5 w-2.5" />
            {{ issue.comments }}
          </span>
        </div>
      </div>

      <!-- Body -->
      <div class="flex flex-1 overflow-hidden">
        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <!-- Description -->
          <div class="flex flex-col gap-2.5">
            <div class="group/sec flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.description') }}</span>
              <button class="opacity-0 group-hover/sec:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all" :title="editingBody ? t('common.cancel') : t('common.edit')" @click="startEditBody">
                <Pencil v-if="!editingBody" class="h-3 w-3" />
                <X v-else class="h-3 w-3" />
              </button>
            </div>
            <div v-if="!editingBody" class="text-[13px] leading-relaxed bg-card border rounded-lg p-3.5 prose prose-sm dark:prose-invert max-w-none" v-html="renderMd(issue.body ?? '')"></div>
            <div v-else class="flex flex-col gap-2">
              <Textarea v-model="bodyDraft" rows="8" />
              <div class="flex gap-2">
                <Button size="sm" :disabled="saving" @click="saveBody">{{ t('common.save') }}</Button>
                <Button variant="outline" size="sm" @click="editingBody = false">{{ t('common.cancel') }}</Button>
              </div>
            </div>
          </div>

          <!-- Activity -->
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.activity') }}</span>
              <span class="text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">{{ ghStore.comments.length }}</span>
            </div>

            <div class="flex flex-col gap-3.5">
              <div v-if="issue.state === 'closed'" class="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <div class="w-[22px] h-[22px] rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                  <CheckCircle class="h-3 w-3" :stroke-width="2.5" />
                </div>
                <span class="flex-1">
                  <i18n-t keypath="issueDetail.closedBy">
                    <template #user><strong class="text-foreground">{{ issue.user.login }}</strong></template>
                  </i18n-t>
                </span>
                <span class="text-[11px] whitespace-nowrap">{{ timeAgo(issue.updated_at) }}</span>
              </div>

              <div v-for="c in ghStore.comments" :key="c.id" class="flex gap-2.5">
                <img :src="c.user.avatar_url" :alt="c.user.login" class="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                <div class="flex-1 border rounded-lg overflow-hidden bg-card">
                  <div class="group/ch flex items-center gap-2 px-3 py-2 border-b bg-muted/40 text-xs">
                    <strong>{{ c.user.login }}</strong>
                    <span class="text-[11px] text-muted-foreground">{{ timeAgo(c.created_at) }}</span>
                    <div class="ml-auto flex gap-1" @click.stop>
                      <button v-if="editingCommentId === c.id" class="opacity-0 group-hover/ch:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all" @click="cancelEditComment">
                        <X class="h-3 w-3" />
                      </button>
                      <button v-else class="opacity-0 group-hover/ch:opacity-100 p-1 rounded text-muted-foreground hover:bg-accent transition-all" :title="t('common.edit')" @click="startEditComment(c)">
                        <Pencil class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div v-if="editingCommentId !== c.id" class="p-3 text-[13px] leading-relaxed prose prose-sm dark:prose-invert max-w-none" v-html="renderMd(c.body)"></div>
                  <div v-else class="flex flex-col gap-2 p-3">
                    <Textarea v-model="editCommentDraft" rows="4" />
                    <div class="flex gap-2">
                      <Button size="sm" :disabled="saving" @click="saveEditComment(c.id)">{{ t('common.save') }}</Button>
                      <Button variant="outline" size="sm" @click="cancelEditComment">{{ t('common.cancel') }}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- New comment -->
            <div class="flex gap-2.5">
              <div class="w-7 h-7 rounded-full bg-muted flex-shrink-0 mt-1" />
              <div class="flex-1 border rounded-lg p-3 bg-primary/5">
                <Textarea v-model="newComment" rows="3" :placeholder="t('issueDetail.commentPlaceholder')" />
                <div class="flex justify-end mt-2">
                  <Button :disabled="!newComment.trim() || commenting" @click="submitComment">
                    <Loader2 v-if="commenting" class="h-3.5 w-3.5 animate-spin" />
                    {{ t('issueDetail.comment') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="w-[210px] flex-shrink-0 overflow-y-auto p-4 border-l bg-card flex flex-col gap-4.5">
          <!-- Assignees -->
          <div class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.assignees') }}</div>
            <div v-if="issue.assignees.length" class="flex flex-col gap-2">
              <div v-for="a in issue.assignees" :key="a.login" class="flex items-center gap-2">
                <img :src="a.avatar_url" class="w-5 h-5 rounded-full object-cover" />
                <span class="text-xs">{{ a.login }}</span>
              </div>
            </div>
            <span v-else class="text-xs text-muted-foreground italic">{{ t('common.none') }}</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.labels') }}</div>
            <div v-if="issue.labels.length" class="flex flex-wrap gap-1">
              <span
                v-for="l in issue.labels" :key="l.id"
                class="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
                :style="{ background: '#' + l.color + '30', color: '#' + l.color, borderColor: '#' + l.color + '60' }"
              >{{ l.name }}</span>
            </div>
            <span v-else class="text-xs text-muted-foreground italic">{{ t('common.noneFem') }}</span>
          </div>

          <div v-if="issue.milestone" class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.milestone') }}</div>
            <span class="text-xs">{{ issue.milestone.title }}</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.created') }}</div>
            <span class="text-xs">{{ formatDate(issue.created_at) }}</span>
          </div>
          <div v-if="issue.updated_at !== issue.created_at" class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.updated') }}</div>
            <span class="text-xs">{{ timeAgo(issue.updated_at) }}</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issueDetail.linkedCommits') }}</div>
            <div class="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
              <GitCommit class="h-3 w-3 flex-shrink-0 mt-px" />
              <i18n-t keypath="issueDetail.linkedCommitsHint">
                <template #ref><code class="text-info bg-info/10 px-1 rounded">#{{ issue.number }}</code></template>
              </i18n-t>
            </div>
            <div v-for="c in linkedCommits" :key="c.hash" class="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40">
              <code class="font-mono text-[11px] text-primary bg-primary/15 px-1 py-px rounded flex-shrink-0">{{ c.hash }}</code>
              <span class="text-[11px] text-muted-foreground truncate">{{ c.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGithubStore } from '@/stores/github'
import { useGitStore } from '@/stores/git'
import type { GhComment } from '@/stores/github'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, CircleDot, CheckCircle, ExternalLink, Pencil, X, MessageSquare, GitCommit,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const ghStore  = useGithubStore()
const gitStore = useGitStore()

const issue    = computed(() => ghStore.selectedIssue!)
const repoPath = computed(() => ghStore.selectedRepoPath ?? '')

const editingTitle = ref(false)
const titleDraft   = ref('')
const titleRef     = ref<any>(null)
const saving       = ref(false)

function startEditTitle() {
  titleDraft.value = issue.value.title
  editingTitle.value = true
  nextTick(() => {
    const el = (titleRef.value as any)?.$el ?? titleRef.value
    el?.querySelector?.('input')?.select?.()
  })
}

async function saveTitle() {
  if (!titleDraft.value.trim()) return
  saving.value = true
  try { await ghStore.updateIssue(repoPath.value, issue.value.number, { title: titleDraft.value.trim() }) }
  finally { saving.value = false; editingTitle.value = false }
}

const editingBody = ref(false)
const bodyDraft   = ref('')

function startEditBody() {
  if (editingBody.value) { editingBody.value = false; return }
  bodyDraft.value = issue.value.body ?? ''
  editingBody.value = true
}

async function saveBody() {
  saving.value = true
  try { await ghStore.updateIssue(repoPath.value, issue.value.number, { body: bodyDraft.value }) }
  finally { saving.value = false; editingBody.value = false }
}

async function toggleState() {
  saving.value = true
  try {
    if (issue.value.state === 'open') await ghStore.closeIssue(repoPath.value)
    else await ghStore.reopenIssue(repoPath.value)
    await ghStore.loadIssues(repoPath.value)
  } finally { saving.value = false }
}

const newComment       = ref('')
const commenting       = ref(false)
const editingCommentId = ref<number | null>(null)
const editCommentDraft = ref('')

async function submitComment() {
  if (!newComment.value.trim()) return
  commenting.value = true
  try {
    await ghStore.addComment(repoPath.value, issue.value.number, newComment.value.trim())
    newComment.value = ''
  } finally { commenting.value = false }
}

function startEditComment(c: GhComment) {
  editingCommentId.value = c.id
  editCommentDraft.value = c.body
}
function cancelEditComment() { editingCommentId.value = null }

async function saveEditComment(id: number) {
  saving.value = true
  try {
    await ghStore.updateComment(repoPath.value, id, editCommentDraft.value)
    editingCommentId.value = null
  } finally { saving.value = false }
}

const linkedCommits = computed(() => {
  if (!issue.value) return []
  const num = `#${issue.value.number}`
  const result: { hash: string; message: string }[] = []
  for (const state of Object.values(gitStore.repos)) {
    for (const c of state.log ?? []) {
      if (c.message.includes(num)) result.push(c)
    }
  }
  return result.slice(0, 5)
})

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('common.now')
  if (m < 60) return t('common.ago', { n: `${m}m` })
  if (m < 1440) return t('common.ago', { n: `${Math.floor(m / 60)}h` })
  return t('common.ago', { n: `${Math.floor(m / 1440)}d` })
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(locale.value, { day: '2-digit', month: 'short', year: 'numeric' })
}

function openExternal(url: string) { window.electron.shell.openExternal(url) }

function renderMd(text: string) {
  if (!text) return `<span class="opacity-40 italic">${t('issueDetail.noDescription')}</span>`
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/30 p-3 rounded overflow-x-auto my-2"><code>$1</code></pre>')
    .replace(/`([^`\n]+)`/g, '<code class="bg-black/30 px-1 py-px rounded font-mono text-info text-xs">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3} (.+)$/gm, '<strong class="block text-sm my-2">$1</strong>')
    .replace(/^- (.+)$/gm, '<div class="pl-3.5 my-0.5 relative before:content-[\'–\'] before:absolute before:left-0 before:text-muted-foreground">$1</div>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="#" onclick="event.preventDefault()" class="text-primary">$1</a>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
}
</script>
