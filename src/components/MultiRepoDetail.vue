<template>
  <div class="flex flex-1 overflow-hidden bg-background text-foreground text-[13px]">
    <!-- ── Left: grouped files ───────────────────────────── -->
    <div class="flex-shrink-0 flex flex-col border-r bg-card" :style="{ width: filesW + 'px' }">
      <div class="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b gap-2">
        <span class="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">{{ t('multiRepo.alterations', { n: paths.length }) }}</span>
        <div class="flex gap-1 ml-auto">
          <Button variant="outline" size="xs" :disabled="working" :title="t('multiRepo.stageAllTitle')" @click="stageAllRepos">{{ t('multiRepo.allPlus') }}</Button>
          <Button variant="outline" size="icon-xs" :title="t('multiRepo.clearSelection')" @click="gitStore.clearSelection()">
            <X class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <!-- File groups -->
      <div class="flex-1 overflow-y-auto">
        <div v-for="path in paths" :key="path">
          <!-- Group header -->
          <div
            class="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-l-2 border-transparent hover:bg-accent/40 transition-colors"
            :class="{ 'bg-primary/10 border-l-primary': activeRepo === path }"
            @click="setActiveRepo(path)"
          >
            <ChevronDown
              class="h-2.5 w-2.5 flex-shrink-0 transition-transform"
              :class="{ '-rotate-90': collapsed.has(path) }"
              @click.stop="toggleCollapse(path)"
            />
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="dotClass(path)" />
            <span class="font-semibold text-xs flex-1 truncate">{{ labelFor(path) }}</span>
            <div class="flex gap-1 ml-auto" @click.stop>
              <span v-if="stagedCount(path)" class="text-[10px] px-1.5 py-px rounded-full font-bold bg-success/15 text-success">{{ stagedCount(path) }}S</span>
              <span v-if="unstagedCount(path)" class="text-[10px] px-1.5 py-px rounded-full font-bold bg-warning/15 text-warning">{{ unstagedCount(path) }}M</span>
              <Button variant="outline" size="icon-xs" :disabled="!unstagedCount(path)" :title="t('multiRepo.stageAllInRepo')" @click="stageAll(path)">+</Button>
            </div>
          </div>

          <!-- Files -->
          <template v-if="!collapsed.has(path)">
            <div v-if="repoState(path)?.loading && !repoState(path)?.status" class="px-8 py-2 flex items-center gap-1.5">
              <Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
            <template v-else>
              <div
                v-for="file in stagedFiles(path)"
                :key="'s'+path+file"
                class="flex items-center gap-2 px-3 py-1 pl-6 cursor-pointer border-b border-border/10 hover:bg-accent/30"
                :class="{ 'bg-primary/10': selectedFile === file && selectedPath === path && selectedStaged }"
                @click="selectFile(path, file, true)"
              >
                <input type="checkbox" class="accent-primary cursor-pointer flex-shrink-0 w-3.5 h-3.5" checked @click.stop="gitStore.unstageFile(path, file)" />
                <span class="text-[10px] font-bold w-4 text-center text-success flex-shrink-0">S</span>
                <span class="text-xs flex-1 truncate" :title="file">{{ baseName(file) }}</span>
                <span class="text-[10px] text-muted-foreground truncate max-w-[80px]">{{ dirName(file) }}</span>
              </div>
              <div
                v-for="file in unstagedFiles(path)"
                :key="'u'+path+file"
                class="flex items-center gap-2 px-3 py-1 pl-6 cursor-pointer border-b border-border/10 hover:bg-accent/30"
                :class="{ 'bg-primary/10': selectedFile === file && selectedPath === path && !selectedStaged }"
                @click="selectFile(path, file, false)"
              >
                <input type="checkbox" class="accent-primary cursor-pointer flex-shrink-0 w-3.5 h-3.5" :checked="false" @click.stop="gitStore.stageFile(path, file)" />
                <span class="text-[10px] font-bold w-4 text-center flex-shrink-0" :class="fileLetterColor(path, file)">{{ fileLetter(path, file) }}</span>
                <span class="text-xs flex-1 truncate" :title="file">{{ baseName(file) }}</span>
                <span class="text-[10px] text-muted-foreground truncate max-w-[80px]">{{ dirName(file) }}</span>
              </div>
              <div v-if="!stagedFiles(path).length && !unstagedFiles(path).length" class="flex items-center gap-1.5 px-8 py-1.5 text-muted-foreground text-xs">
                <Check class="h-3 w-3" />
                {{ t('repoPanel.noChanges') }}
              </div>
            </template>
          </template>
        </div>
      </div>

      <!-- Commit area -->
      <div class="border-t px-3 py-3 flex flex-col gap-1.5 bg-muted/40">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
          <LayoutGrid class="h-2.5 w-2.5" />
          <span>{{ t('multiRepo.stagedInRepos', { n: totalStaged, m: reposWithStaged.length }) }}</span>
        </div>

        <Input
          v-model="commitMsg"
          class="h-8 text-xs"
          :placeholder="t('multiRepo.summaryPlaceholder')"
          :maxlength="72"
          @keydown.ctrl.enter="commitAll"
          @keydown.meta.enter="commitAll"
        />
        <Textarea
          v-model="commitDesc"
          class="text-xs resize-none min-h-[52px]"
          :placeholder="t('multiRepo.descriptionPlaceholder')"
          rows="2"
        />

        <div v-if="commitError" class="text-[11px] text-destructive">{{ commitError }}</div>

        <Button
          class="w-full"
          size="sm"
          :disabled="!commitMsg.trim() || totalStaged === 0 || working"
          @click="commitAll"
        >
          <Loader2 v-if="working" class="h-3.5 w-3.5 animate-spin" />
          {{ t('multiRepo.commitInNRepos', { n: reposWithStaged.length }) }}
        </Button>

        <div v-if="results.length" class="mt-1 border rounded overflow-hidden">
          <div
            v-for="r in results"
            :key="r.path"
            class="flex items-center gap-2 px-2 py-1 text-[11px] border-b last:border-b-0"
            :class="r.ok ? 'text-success' : 'text-destructive'"
          >
            <Check v-if="r.ok" class="h-3 w-3" :stroke-width="2.5" />
            <X v-else class="h-3 w-3" :stroke-width="2.5" />
            <span>{{ r.label }}</span>
            <span v-if="!r.ok" class="text-[10px] text-muted-foreground ml-1">{{ r.error }}</span>
          </div>
        </div>
      </div>
    </div>

    <ResizeHandle @resize="resizeFiles" />

    <!-- ── Right: diff ───────────────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <div v-if="!selectedFile" class="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1.5">
        <FileText class="h-9 w-9 opacity-30" :stroke-width="1" />
        <span>{{ t('repoDetail.clickFileDiff') }}</span>
      </div>
      <template v-else>
        <div class="flex items-center gap-2 px-3.5 py-2 border-b bg-card flex-shrink-0">
          <Badge variant="secondary" class="text-primary bg-primary/15 border-0 rounded-full text-[10px]">{{ labelFor(selectedPath!) }}</Badge>
          <span class="font-mono text-xs font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{{ selectedFile }}</span>
          <span v-if="selectedStaged" class="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success flex-shrink-0">{{ t('repoDetail.stagedLabel') }}</span>
          <div class="ml-auto flex gap-2">
            <Button variant="outline" size="xs" @click="toggleDiffStaged">{{ selectedStaged ? t('diffViewer.working') : t('diffViewer.staged') }}</Button>
            <Button v-if="!selectedStaged" variant="outline" size="xs" class="text-success border-success/30" @click="gitStore.stageFile(selectedPath!, selectedFile)">
              + {{ t('diffViewer.staged') }}
            </Button>
            <Button v-else variant="outline" size="xs" class="text-warning border-warning/30" @click="gitStore.unstageFile(selectedPath!, selectedFile)">
              − {{ t('diffViewer.staged') }}
            </Button>
          </div>
        </div>
        <div class="flex items-center gap-1 px-3.5 py-1 text-xs font-semibold border-b bg-muted/40 flex-shrink-0">
          <span class="text-success">+{{ diffStats.add }}</span>
          <span class="text-destructive ml-2">-{{ diffStats.del }}</span>
          <div class="flex w-[60px] h-1.5 rounded-full overflow-hidden bg-border flex-shrink-0 ml-3">
            <div class="bg-success" :style="{ width: diffStats.addPct + '%' }"></div>
            <div class="bg-destructive" :style="{ width: diffStats.delPct + '%' }"></div>
          </div>
        </div>
        <div class="flex-1 overflow-auto font-mono text-xs" v-if="!diffLoading">
          <div v-if="!diffLines.length" class="p-5 text-muted-foreground">{{ t('repoDetail.noDifferences') }}</div>
          <table class="border-collapse w-full" v-else>
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

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import { useProjectStore } from '@/stores/project'
import ResizeHandle from '@/components/ResizeHandle.vue'
import { useResizable } from '@/composables/useResizable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, X, Check, Loader2, LayoutGrid, FileText } from 'lucide-vue-next'

const { t } = useI18n()
const gitStore = useGitStore()
const projectStore = useProjectStore()

const { width: filesW, onResize: resizeFiles } = useResizable('multi-detail-files', 280, 180, 480)

const collapsed   = ref(new Set<string>())
const activeRepo  = ref<string | null>(null)
const selectedFile   = ref<string | null>(null)
const selectedPath   = ref<string | null>(null)
const selectedStaged = ref(false)
const rawDiff     = ref('')
const diffLoading = ref(false)
const commitMsg   = ref('')
const commitDesc  = ref('')
const commitError = ref('')
const working     = ref(false)
const results     = ref<{ path: string; label: string; ok: boolean; error?: string }[]>([])

const paths = computed(() => [...gitStore.selectedRepos])

function labelFor(path: string) {
  for (const g of projectStore.current?.groups ?? []) {
    const r = g.repos.find((r) => r.path === path)
    if (r) return r.label
  }
  return path.split('/').pop() ?? path
}
function repoState(path: string) { return gitStore.repos[path] }
function stagedFiles(path: string) { return repoState(path)?.status?.staged ?? [] }
function unstagedFiles(path: string) {
  const s = repoState(path)?.status
  if (!s) return []
  return [...new Set([...s.modified, ...s.not_added, ...s.deleted, ...s.created])]
    .filter((f) => !s.staged.includes(f))
}
function stagedCount(path: string) { return stagedFiles(path).length }
function unstagedCount(path: string) { return unstagedFiles(path).length }

function dotClass(path: string) {
  const st = repoState(path)
  if (!st || st.loading) return 'bg-muted-foreground animate-pulse'
  if (st.error) return 'bg-destructive'
  if (stagedCount(path) + unstagedCount(path) > 0) return 'bg-warning'
  return 'bg-success'
}

function fileLetter(path: string, file: string) {
  const s = repoState(path)?.status
  if (!s) return 'M'
  if (s.deleted.includes(file)) return 'D'
  if (s.not_added.includes(file) || s.created.includes(file)) return 'A'
  return 'M'
}
function fileLetterColor(path: string, file: string) {
  const l = fileLetter(path, file)
  if (l === 'A') return 'text-info'
  if (l === 'D') return 'text-destructive'
  return 'text-warning'
}
function baseName(f: string) { return f.split('/').pop() ?? f }
function dirName(f: string) { const p = f.split('/'); return p.length > 1 ? p.slice(0, -1).join('/') : '' }

const totalStaged = computed(() => paths.value.reduce((a, p) => a + stagedCount(p), 0))
const reposWithStaged = computed(() => paths.value.filter((p) => stagedCount(p) > 0))

function toggleCollapse(path: string) {
  collapsed.value.has(path) ? collapsed.value.delete(path) : collapsed.value.add(path)
}

function setActiveRepo(path: string) {
  activeRepo.value = path
  if (collapsed.value.has(path)) collapsed.value.delete(path)
}

async function stageAll(path: string) {
  await window.electron.git.stageAll(path)
  await gitStore.refresh(path)
}

async function stageAllRepos() {
  working.value = true
  await Promise.all(paths.value.map(stageAll))
  working.value = false
}

async function selectFile(path: string, file: string, staged: boolean) {
  activeRepo.value = path
  selectedPath.value = path
  selectedFile.value = file
  selectedStaged.value = staged
  await loadDiff(path, file, staged)
}

async function loadDiff(path: string, file: string, staged: boolean) {
  diffLoading.value = true
  try { rawDiff.value = await window.electron.git.diff(path, file, staged) }
  finally { diffLoading.value = false }
}

async function toggleDiffStaged() {
  if (!selectedPath.value || !selectedFile.value) return
  selectedStaged.value = !selectedStaged.value
  await loadDiff(selectedPath.value, selectedFile.value, selectedStaged.value)
}

watch(
  () => selectedPath.value && repoState(selectedPath.value)?.status,
  () => { if (selectedFile.value && selectedPath.value) loadDiff(selectedPath.value, selectedFile.value, selectedStaged.value) }
)

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
  const total = add + del || 1
  return { add, del, addPct: Math.round(add / total * 100), delPct: Math.round(del / total * 100) }
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

async function commitAll() {
  if (!commitMsg.value.trim() || reposWithStaged.value.length === 0) return
  working.value = true
  commitError.value = ''
  results.value = []

  const msg = commitDesc.value.trim()
    ? `${commitMsg.value.trim()}\n\n${commitDesc.value.trim()}`
    : commitMsg.value.trim()

  const settled = await Promise.allSettled(
    reposWithStaged.value.map((p) => window.electron.git.commit(p, msg))
  )
  await Promise.all(reposWithStaged.value.map((p) => gitStore.refresh(p)))

  results.value = reposWithStaged.value.map((path, i) => ({
    path,
    label: labelFor(path),
    ok: settled[i].status === 'fulfilled',
    error: settled[i].status === 'rejected'
      ? (settled[i] as PromiseRejectedResult).reason?.message
      : undefined,
  }))

  if (settled.every((s) => s.status === 'fulfilled')) {
    commitMsg.value = ''
    commitDesc.value = ''
    selectedFile.value = null
    rawDiff.value = ''
  }
  working.value = false
}
</script>
