<template>
  <div class="flex-1 flex overflow-hidden bg-background text-foreground text-[13px]">
    <!-- ── Left: commit list ─────────────────────────────── -->
    <div class="flex-shrink-0 flex flex-col overflow-hidden border-r" :style="{ width: listW + 'px' }">
      <div class="flex items-center gap-2 px-3.5 py-2.5 border-b bg-card flex-shrink-0">
        <span class="font-bold text-xs uppercase tracking-wider text-muted-foreground flex-1">{{ t('history.title') }}</span>
        <Badge variant="secondary" class="gap-1 text-primary bg-primary/15 border-0 rounded-full">
          <GitBranch class="h-2.5 w-2.5" />
          {{ currentBranch }}
        </Badge>
        <Button v-if="canLoadMore" variant="outline" size="xs" :disabled="loadingMore" @click="loadMore">
          <Loader2 v-if="loadingMore" class="h-3 w-3 animate-spin" />
          <span v-else>{{ t('history.loadMore') }}</span>
        </Button>
      </div>

      <div v-if="loading && !commits.length" class="flex-1 flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <button
          v-for="c in commits"
          :key="c.hash"
          class="flex w-full text-left border-l-2 border-transparent border-b border-border/20 transition-colors hover:bg-accent/40"
          :class="{ 'bg-primary/10 border-l-primary': selected?.hash === c.hash }"
          @click="selectCommit(c)"
        >
          <!-- Graph line -->
          <div class="w-6 flex-shrink-0 flex flex-col items-center pt-2.5">
            <div class="w-2 h-2 rounded-full bg-primary border-2 border-background z-[1] flex-shrink-0"></div>
            <div class="flex-1 w-0.5 bg-border mt-0.5"></div>
          </div>

          <div class="flex-1 py-2 pl-1.5 pr-2.5 overflow-hidden">
            <div class="flex items-start gap-2 mb-1">
              <span class="flex-1 text-xs font-medium leading-snug overflow-hidden text-ellipsis whitespace-nowrap">{{ c.message }}</span>
              <code class="text-[10px] text-primary bg-primary/15 px-1.5 py-px rounded font-mono flex-shrink-0">{{ c.hash }}</code>
            </div>
            <div class="flex items-center gap-1.5">
              <img v-if="avatarUrl(c.author)" :src="avatarUrl(c.author)" class="w-3.5 h-3.5 rounded-full object-cover" :alt="c.author" />
              <span class="text-[11px] text-muted-foreground">{{ shortName(c.author) }}</span>
              <span class="text-[10px] text-muted-foreground ml-auto">{{ timeAgo(c.date) }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <ResizeHandle @resize="(d) => listW = Math.max(220, Math.min(500, listW + d))" />

    <!-- ── Right: commit detail ───────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <div v-if="!selected" class="flex-1 flex items-center justify-center text-muted-foreground text-xs">
        {{ t('history.emptyCommit') }}
      </div>

      <template v-else>
        <div class="px-4 py-3.5 border-b bg-card flex-shrink-0 flex flex-col gap-2">
          <div class="flex items-center gap-2.5">
            <code class="font-mono text-xs text-primary bg-primary/15 px-2 py-0.5 rounded">{{ selected.hash }}</code>
            <span class="text-[11px] text-muted-foreground">{{ formatDate(selected.date) }}</span>
            <a
              class="ml-auto text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded p-1 transition-colors"
              href="#"
              :title="t('history.openGh')"
              @click.prevent="openGitHub(selected.hash)"
            >
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
          <div class="text-[15px] font-bold leading-snug">{{ selected.message }}</div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <img v-if="avatarUrl(selected.author)" :src="avatarUrl(selected.author)" class="w-5 h-5 rounded-full object-cover" />
            <span>{{ selected.author }}</span>
          </div>
        </div>

        <div class="flex-1 flex overflow-hidden">
          <!-- Changed files -->
          <div class="flex-shrink-0 flex flex-col overflow-hidden" :style="{ width: filesW + 'px' }">
            <div class="px-3 py-2 border-b bg-muted/40 flex-shrink-0">
              <span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {{ t('history.filesChanged', { n: changedFiles.length }) }}
              </span>
            </div>
            <div v-if="detailLoading" class="flex items-center justify-center py-3">
              <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
            <div v-else class="flex-1 overflow-y-auto">
              <button
                v-for="f in changedFiles"
                :key="f.file"
                class="flex items-center gap-1.5 py-1.5 px-3 w-full text-left border-l-2 border-transparent border-b border-border/20 transition-colors hover:bg-accent/40"
                :class="{ 'bg-primary/10 border-l-primary': selectedFile === f.file }"
                @click="selectFile(f)"
              >
                <span class="text-[10px] font-bold w-3.5 flex-shrink-0 text-center" :class="statusColor(f.status)">{{ f.status }}</span>
                <span class="text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ baseName(f.file) }}</span>
                <span class="text-[10px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px]">{{ dirName(f.file) }}</span>
              </button>
            </div>
          </div>

          <ResizeHandle @resize="(d) => filesW = Math.max(160, Math.min(400, filesW + d))" />

          <!-- Diff -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <div v-if="!selectedFile" class="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              {{ t('history.emptyFile') }}
            </div>
            <template v-else>
              <div class="flex items-center gap-2.5 px-3.5 py-2 border-b bg-muted/40 flex-shrink-0">
                <span class="font-mono text-xs font-semibold flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ selectedFile }}</span>
                <div class="text-xs font-bold flex gap-1 flex-shrink-0">
                  <span class="text-success">+{{ diffStats.add }}</span>
                  <span class="text-destructive ml-2">-{{ diffStats.del }}</span>
                </div>
              </div>
              <div class="flex-1 overflow-auto font-mono text-xs" v-if="!diffLoading">
                <table class="border-collapse w-full">
                  <tbody>
                    <tr v-for="(line, i) in diffLines" :key="i" :class="rowBgClass(line.cls)">
                      <td class="w-11 text-right pr-3 pl-1.5 text-muted-foreground text-[10px] select-none border-r">{{ i + 1 }}</td>
                      <td class="w-[18px] text-center select-none px-0.5" :class="signClass(line.cls)">{{ line.sign }}</td>
                      <td class="pl-1.5 whitespace-pre" :class="textClass(line.cls)">{{ line.text }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="flex-1 flex items-center justify-center"><Loader2 class="h-4 w-4 animate-spin text-muted-foreground" /></div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import ResizeHandle from '@/components/ResizeHandle.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GitBranch, Loader2, ExternalLink } from 'lucide-vue-next'
import type { GitCommit } from '@/env'

const props = defineProps<{ repoPath: string }>()

const { t, locale } = useI18n()
const gitStore = useGitStore()

const listW  = ref(300)
const filesW = ref(220)

const commits     = ref<GitCommit[]>([])
const loading     = ref(false)
const loadingMore = ref(false)
const limit       = ref(50)
const canLoadMore = ref(true)

const selected     = ref<GitCommit | null>(null)
const changedFiles = ref<{ status: string; file: string }[]>([])
const detailLoading = ref(false)

const selectedFile = ref<string | null>(null)
const rawDiff      = ref('')
const diffLoading  = ref(false)

const currentBranch = computed(() => gitStore.repos[props.repoPath]?.branches?.current ?? '')

onMounted(loadCommits)
watch(() => props.repoPath, () => { commits.value = []; selected.value = null; limit.value = 50; loadCommits() })

async function loadCommits(append = false) {
  if (append) { loadingMore.value = true } else { loading.value = true }
  try {
    const result = await window.electron.git.log(props.repoPath, limit.value)
    commits.value = result
    canLoadMore.value = result.length === limit.value
    if (!selected.value && result.length) selectCommit(result[0])
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function loadMore() {
  limit.value += 50
  await loadCommits(true)
}

async function selectCommit(c: GitCommit) {
  selected.value = c
  selectedFile.value = null
  rawDiff.value = ''
  changedFiles.value = []
  detailLoading.value = true
  try {
    changedFiles.value = await window.electron.git.commitFiles(props.repoPath, c.hash)
    if (changedFiles.value.length) selectFile(changedFiles.value[0])
  } finally {
    detailLoading.value = false
  }
}

async function selectFile(f: { status: string; file: string }) {
  selectedFile.value = f.file
  rawDiff.value = ''
  diffLoading.value = true
  try {
    const full = await window.electron.git.commitDiff(props.repoPath, selected.value!.hash)
    rawDiff.value = extractFileDiff(full, f.file)
  } finally {
    diffLoading.value = false
  }
}

function extractFileDiff(full: string, file: string): string {
  const lines = full.split('\n')
  let inFile = false
  const out: string[] = []
  for (const line of lines) {
    if (line.startsWith('diff --git')) inFile = line.includes(file)
    if (inFile) out.push(line)
    if (inFile && line.startsWith('diff --git') && out.length > 1) break
  }
  const hunkStart = out.findIndex((l) => l.startsWith('@@'))
  return hunkStart >= 0 ? out.slice(hunkStart).join('\n') : out.join('\n')
}

type DL = { text: string; sign: string; cls: string }
const diffLines = computed<DL[]>(() =>
  rawDiff.value.split('\n').map((raw) => {
    if (raw.startsWith('+')) return { text: raw.slice(1), sign: '+', cls: 'add' }
    if (raw.startsWith('-')) return { text: raw.slice(1), sign: '−', cls: 'del' }
    if (raw.startsWith('@@')) return { text: raw, sign: '⋯', cls: 'hunk' }
    return { text: raw, sign: ' ', cls: 'ctx' }
  })
)

const diffStats = computed(() => {
  const add = diffLines.value.filter((l) => l.cls === 'add').length
  const del = diffLines.value.filter((l) => l.cls === 'del').length
  return { add, del }
})

function rowBgClass(cls: string) {
  if (cls === 'add') return 'bg-success/10'
  if (cls === 'del') return 'bg-destructive/10'
  if (cls === 'hunk') return 'bg-info/10'
  return ''
}
function signClass(cls: string) {
  if (cls === 'add') return 'text-success'
  if (cls === 'del') return 'text-destructive'
  if (cls === 'hunk') return 'text-info'
  return 'text-muted-foreground'
}
function textClass(cls: string) {
  if (cls === 'add') return 'text-success'
  if (cls === 'del') return 'text-destructive'
  if (cls === 'hunk') return 'text-info italic'
  return 'text-foreground/80'
}

function statusColor(s: string) {
  if (s.startsWith('A')) return 'text-success'
  if (s.startsWith('D')) return 'text-destructive'
  if (s.startsWith('R')) return 'text-info'
  return 'text-warning'
}

function baseName(f: string) { return f.split('/').pop() ?? f }
function dirName(f: string) { const p = f.split('/'); return p.length > 1 ? p.slice(0, -1).join('/') : '' }

function avatarUrl(author: string) {
  const email = author.match(/<(.+)>/)
  if (email) return `https://www.gravatar.com/avatar/${hashStr(email[1])}?d=identicon&s=20`
  return ''
}

function hashStr(s: string): string {
  return btoa(s.toLowerCase().trim()).replace(/[^a-z0-9]/g, '').slice(0, 32)
}

function shortName(author: string) {
  return author.replace(/<.+>/, '').trim().split(' ')[0]
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  if (m < 43200) return `${Math.floor(m / 1440)}d`
  return new Date(date).toLocaleDateString(locale.value, { day: '2-digit', month: 'short' })
}

function formatDate(date: string) {
  return new Date(date).toLocaleString(locale.value, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function openGitHub(hash: string) {
  await window.electron.git.branches(props.repoPath)
  navigator.clipboard.writeText(hash)
}
</script>
