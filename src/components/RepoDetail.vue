<template>
  <!-- Modais -->
  <CommitLogModal v-model="showLog" :repo-path="repoPath" :repo-label="repoLabel" />
  <BranchModal v-model="showBranch" :repo-path="repoPath" />
  <PushPullModal v-if="pushPullOp" v-model="showPushPull" :repo-path="repoPath" :op="pushPullOp" @done="showPushPull = false" />
  <RepoSettingsModal v-model="showSettings" :group-id="groupId" :repo-id="repoId" :repo-label="repoLabel" :repo-path="repoPath" @removed="onRemoved" />
  <ConflictModal v-if="hasConflicts" v-model="showConflicts" :repo-path="repoPath" @done="showConflicts = false" />

  <div class="flex flex-1 overflow-hidden bg-background text-foreground text-[13px]">
    <!-- ── Left: files panel ─────────────────────────────── -->
    <div class="flex-shrink-0 flex flex-col border-r bg-card" :style="{ width: filesW + 'px' }">
      <!-- Header -->
      <div class="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b">
        <span class="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">{{ t('repoDetail.changes') }}</span>
        <Button variant="ghost" size="icon-xs" :disabled="state?.loading" :title="t('common.refresh')" @click="gitStore.refresh(repoPath)">
          <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': state?.loading }" />
        </Button>
      </div>

      <div
        class="flex items-center gap-1.5 px-2.5 py-1 border-b bg-muted/40 flex-shrink-0 text-muted-foreground transition-colors"
        :class="{ 'border-primary': fileSearch }"
      >
        <Search class="h-3 w-3" />
        <input
          v-model="fileSearch"
          class="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
          :placeholder="t('repoDetail.filterFilesPlaceholder')"
          @keydown.esc="fileSearch = ''"
        />
        <button v-if="fileSearch" class="p-0.5 flex items-center hover:text-foreground transition-colors" @click="fileSearch = ''">
          <X class="h-2.5 w-2.5" :stroke-width="2.5" />
        </button>
      </div>

      <!-- Loading -->
      <div v-if="state?.loading && !state.status" class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />
      </div>

      <!-- Error -->
      <div v-else-if="state?.error" class="flex-1 flex items-center justify-center text-destructive text-xs px-4 text-center">
        {{ state.error }}
      </div>

      <!-- No changes -->
      <div v-else-if="!hasChanges && !state?.loading" class="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1.5">
        <Check class="h-7 w-7 opacity-40" :stroke-width="1.5" />
        <span>{{ t('repoDetail.noChanges') }}</span>
      </div>

      <!-- File sections -->
      <div v-else class="flex-1 overflow-y-auto">
        <!-- Staged -->
        <div v-if="staged.length > 0">
          <div class="px-3 pt-1.5 pb-1 border-b border-border/40">
            <div class="flex items-center gap-2 cursor-pointer text-[11px] font-bold uppercase tracking-wider text-muted-foreground" @click="unstageAll">
              <input type="checkbox" class="flex-shrink-0 accent-primary w-3.5 h-3.5 cursor-pointer" checked @click.stop="unstageAll" />
              <span>{{ t('repoDetail.stagedN', { n: staged.length }) }}</span>
            </div>
          </div>
          <div
            v-for="file in staged.filter(matchFile)"
            :key="'s'+file"
            class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent/40 border-b border-border/20 transition-colors"
            :class="{ 'bg-primary/10': selectedFile === file && selectedStaged }"
            @click="selectFile(file, true)"
          >
            <input
              type="checkbox"
              class="flex-shrink-0 accent-primary w-3.5 h-3.5 cursor-pointer"
              checked
              @click.stop="gitStore.unstageFile(repoPath, file)"
            />
            <span class="flex-shrink-0 text-[10px] font-bold w-4 text-center text-success">S</span>
            <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs" :title="file">{{ fileName(file) }}</span>
            <span class="text-[10px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px]">{{ fileDir(file) }}</span>
          </div>
        </div>

        <!-- Unstaged -->
        <div v-if="unstaged.length > 0">
          <div class="px-3 pt-1.5 pb-1 border-b border-border/40">
            <div class="flex items-center gap-2 cursor-pointer text-[11px] font-bold uppercase tracking-wider text-muted-foreground" @click="toggleStageAll">
              <input
                type="checkbox"
                class="flex-shrink-0 accent-primary w-3.5 h-3.5 cursor-pointer"
                :checked="allUnstagedStaged"
                @click.stop="toggleStageAll"
              />
              <span>{{ t('repoDetail.modifiedN', { n: unstaged.length }) }}</span>
            </div>
          </div>
          <div
            v-for="file in unstaged.filter(matchFile)"
            :key="'u'+file"
            class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent/40 border-b border-border/20 transition-colors"
            :class="{ 'bg-primary/10': selectedFile === file && !selectedStaged }"
            @click="selectFile(file, false)"
          >
            <input
              type="checkbox"
              class="flex-shrink-0 accent-primary w-3.5 h-3.5 cursor-pointer"
              :checked="false"
              @click.stop="gitStore.stageFile(repoPath, file)"
            />
            <span class="flex-shrink-0 text-[10px] font-bold w-4 text-center" :class="statusColor(file)">{{ statusLetter(file) }}</span>
            <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs" :title="file">{{ fileName(file) }}</span>
            <span class="text-[10px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px]">{{ fileDir(file) }}</span>
          </div>
        </div>
      </div>

      <!-- ── Commit area ──────────────────────────────── -->
      <div class="border-t px-3 py-3 flex flex-col gap-1.5 bg-muted/40">
        <!-- Branch + actions row -->
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5">
          <button
            class="inline-flex items-center gap-1 bg-primary/15 border border-primary/25 rounded-full px-2.5 py-0.5 cursor-pointer text-primary text-[11px] font-semibold hover:bg-primary/25 transition-colors"
            :title="t('repoDetail.manageBranches')"
            @click="showBranch = true"
          >
            <GitBranch class="h-2.5 w-2.5" />
            {{ state?.branches?.current ?? '...' }}
            <ChevronDown class="h-2.5 w-2.5" />
          </button>
          <span v-if="state?.status?.ahead" class="text-[10px] px-1.5 py-px rounded-full font-bold bg-success/15 text-success">+{{ state.status.ahead }}</span>
          <span v-if="state?.status?.behind" class="text-[10px] px-1.5 py-px rounded-full font-bold bg-destructive/15 text-destructive">-{{ state.status.behind }}</span>
          <div class="ml-auto flex gap-1">
            <Button variant="outline" size="icon-xs" :title="t('repoDetail.pullTitle')" @click="openPushPull('pull')">
              <ArrowDown class="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon-xs" :title="t('repoDetail.pushTitle')" @click="openPushPull('push')">
              <ArrowUp class="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon-xs" :title="t('repoDetail.historyTitle')" @click="showLog = true">
              <History class="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon-xs" :title="t('repoDetail.settingsTitle')" @click="showSettings = true">
              <Settings class="h-3 w-3" />
            </Button>
          </div>
        </div>

        <!-- Summary + description -->
        <Input
          v-model="commitSummary"
          :placeholder="t('repoDetail.commitSummaryPlaceholder')"
          class="h-8 text-xs"
          :maxlength="72"
          @keydown.ctrl.enter="doCommit"
          @keydown.meta.enter="doCommit"
        />
        <Textarea
          v-model="commitDescription"
          :placeholder="t('repoDetail.commitDescriptionPlaceholder')"
          class="text-xs resize-none min-h-[52px]"
          rows="2"
        />

        <button
          v-if="hasConflicts"
          class="w-full py-1.5 rounded-md border border-destructive/40 cursor-pointer text-xs font-semibold bg-destructive/10 text-destructive flex items-center justify-center gap-1.5 hover:bg-destructive/20 transition-colors"
          @click="showConflicts = true"
        >
          <AlertCircle class="h-3.5 w-3.5" />
          {{ t('repoDetail.resolveConflicts', { n: state?.status?.conflicted?.length ?? 0 }) }}
        </button>

        <div v-if="commitError" class="text-[11px] text-destructive">{{ commitError }}</div>

        <Button
          class="w-full"
          size="sm"
          :disabled="!commitSummary.trim() || staged.length === 0 || committing"
          @click="doCommit"
        >
          <Loader2 v-if="committing" class="h-3.5 w-3.5 animate-spin" />
          {{ t('repoDetail.commitTo') }} <strong class="ml-1">{{ state?.branches?.current ?? 'branch' }}</strong>
        </Button>

        <div v-if="staged.length === 0 && hasChanges" class="text-[11px] text-muted-foreground text-center">
          {{ t('repoDetail.markFilesHint') }}
        </div>
      </div>
    </div>

    <ResizeHandle @resize="resizeFiles" />

    <!-- ── Right: diff panel ──────────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden bg-background">
      <div v-if="!selectedFile" class="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs gap-1.5">
        <FileText class="h-9 w-9 opacity-30" :stroke-width="1" />
        <span>{{ t('repoDetail.clickFileDiff') }}</span>
      </div>

      <template v-else>
        <!-- Diff header -->
        <div class="flex items-center gap-2 px-3.5 py-2 border-b bg-card flex-shrink-0">
          <span class="font-mono text-xs font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{{ selectedFile }}</span>
          <span v-if="selectedStaged" class="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success flex-shrink-0">{{ t('repoDetail.stagedLabel') }}</span>
          <div class="ml-auto flex gap-2 items-center">
            <Button variant="outline" size="xs" @click="toggleStaged">{{ selectedStaged ? t('diffViewer.working') : t('diffViewer.staged') }}</Button>
            <Button v-if="!selectedStaged" variant="outline" size="xs" class="text-success border-success/30" @click="gitStore.stageFile(repoPath, selectedFile)">
              + {{ t('diffViewer.staged') }}
            </Button>
            <Button v-else variant="outline" size="xs" class="text-warning border-warning/30" @click="gitStore.unstageFile(repoPath, selectedFile)">
              − {{ t('diffViewer.staged') }}
            </Button>
          </div>
        </div>

        <!-- Stats bar -->
        <div class="flex items-center gap-1 px-3.5 py-1 text-xs font-semibold border-b bg-muted/40 flex-shrink-0">
          <span class="text-success">+{{ diffStats.add }}</span>
          <span class="text-destructive ml-2">-{{ diffStats.del }}</span>
          <div class="flex w-[60px] h-1.5 rounded-full overflow-hidden bg-border flex-shrink-0 ml-3">
            <div class="bg-success" :style="{ width: diffStats.addPct + '%' }"></div>
            <div class="bg-destructive" :style="{ width: diffStats.delPct + '%' }"></div>
          </div>
          <span class="ml-auto text-muted-foreground font-normal">{{ t('repoDetail.linesCount', { n: diffLines.length }) }}</span>
        </div>

        <!-- Diff content -->
        <div class="flex-1 overflow-auto font-mono text-xs" v-if="!diffLoading">
          <div v-if="diffLines.length === 0" class="p-5 text-muted-foreground">{{ t('repoDetail.noDifferences') }}</div>
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
import CommitLogModal from '@/components/modals/CommitLogModal.vue'
import BranchModal from '@/components/modals/BranchModal.vue'
import PushPullModal from '@/components/modals/PushPullModal.vue'
import RepoSettingsModal from '@/components/modals/RepoSettingsModal.vue'
import ConflictModal from '@/components/modals/ConflictModal.vue'
import ResizeHandle from '@/components/ResizeHandle.vue'
import { useResizable } from '@/composables/useResizable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  RefreshCw, Search, X, Check, Loader2, GitBranch, ChevronDown,
  ArrowDown, ArrowUp, History, Settings, FileText, AlertCircle,
} from 'lucide-vue-next'

const props = defineProps<{
  repoPath: string
  repoLabel: string
  groupId?: string
  repoId?: string
}>()

const { t } = useI18n()
const gitStore = useGitStore()

const { width: filesW, onResize: resizeFiles } = useResizable('repo-detail-files', 280, 180, 480)

const showLog       = ref(false)
const showBranch    = ref(false)
const showPushPull  = ref(false)
const pushPullOp    = ref<'push' | 'pull' | null>(null)
const showSettings  = ref(false)
const showConflicts = ref(false)

const hasConflicts = computed(() => (state.value?.status?.conflicted?.length ?? 0) > 0)

function openPushPull(op: 'push' | 'pull') {
  pushPullOp.value = op
  showPushPull.value = true
}

function onRemoved() {
  gitStore.activeRepo = null
}

const selectedFile = ref<string | null>(null)
const selectedStaged = ref(false)
const commitSummary = ref('')
const commitDescription = ref('')
const committing = ref(false)
const commitError = ref('')
const diffLoading = ref(false)
const rawDiff = ref('')

const state      = computed(() => gitStore.repos[props.repoPath])
const fileSearch = ref('')

function matchFile(file: string) {
  if (!fileSearch.value.trim()) return true
  return file.toLowerCase().includes(fileSearch.value.toLowerCase())
}

const staged = computed(() => state.value?.status?.staged ?? [])

const unstaged = computed(() => {
  const s = state.value?.status
  if (!s) return []
  const all = [...s.modified, ...s.not_added, ...s.deleted, ...s.created]
  return [...new Set(all)].filter((f) => !s.staged.includes(f))
})

const hasChanges = computed(() => staged.value.length > 0 || unstaged.value.length > 0)

const allUnstagedStaged = computed(() =>
  unstaged.value.length > 0 && unstaged.value.every((f) => staged.value.includes(f))
)

function fileName(path: string) { return path.split('/').pop() ?? path }
function fileDir(path: string) {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

function statusColor(file: string) {
  const s = state.value?.status
  if (!s) return ''
  if (s.deleted.includes(file)) return 'text-destructive'
  if (s.created.includes(file) || s.not_added.includes(file)) return 'text-info'
  return 'text-warning'
}

function statusLetter(file: string) {
  const s = state.value?.status
  if (!s) return 'M'
  if (s.deleted.includes(file)) return 'D'
  if (s.created.includes(file) || s.not_added.includes(file)) return 'A'
  if (s.renamed.includes(file)) return 'R'
  return 'M'
}

async function toggleStageAll() {
  if (allUnstagedStaged.value) {
    const toUnstage = [...staged.value].filter((f) =>
      state.value?.status?.modified.includes(f) ||
      state.value?.status?.not_added.includes(f) ||
      state.value?.status?.deleted.includes(f) ||
      state.value?.status?.created.includes(f)
    )
    if (toUnstage.length) await window.electron.git.unstage(props.repoPath, toUnstage)
    await gitStore.refresh(props.repoPath)
  } else {
    const toStage = unstaged.value.filter((f) => !staged.value.includes(f))
    if (toStage.length) await window.electron.git.stage(props.repoPath, toStage)
    await gitStore.refresh(props.repoPath)
  }
}

async function unstageAll() {
  await Promise.all(staged.value.map((f) => gitStore.unstageFile(props.repoPath, f)))
}

async function selectFile(file: string, isStaged: boolean) {
  selectedFile.value = file
  selectedStaged.value = isStaged
  await loadDiff(file, isStaged)
}

async function loadDiff(file: string, staged: boolean) {
  diffLoading.value = true
  try {
    rawDiff.value = await window.electron.git.diff(props.repoPath, file, staged)
  } finally {
    diffLoading.value = false
  }
}

async function toggleStaged() {
  if (!selectedFile.value) return
  selectedStaged.value = !selectedStaged.value
  await loadDiff(selectedFile.value, selectedStaged.value)
}

watch(() => state.value?.status, () => {
  if (selectedFile.value) loadDiff(selectedFile.value, selectedStaged.value)
})

type DiffLine = { text: string; sign: string; cls: string }

const diffLines = computed<DiffLine[]>(() => {
  return rawDiff.value.split('\n').map((raw) => {
    if (raw.startsWith('+')) return { text: raw.slice(1), sign: '+', cls: 'add' }
    if (raw.startsWith('-')) return { text: raw.slice(1), sign: '−', cls: 'del' }
    if (raw.startsWith('@@')) return { text: raw, sign: '⋯', cls: 'hunk' }
    return { text: raw, sign: ' ', cls: 'ctx' }
  })
})

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

async function doCommit() {
  if (!commitSummary.value.trim() || staged.value.length === 0) return
  committing.value = true
  commitError.value = ''
  try {
    const msg = commitDescription.value.trim()
      ? `${commitSummary.value.trim()}\n\n${commitDescription.value.trim()}`
      : commitSummary.value.trim()
    await gitStore.commit(props.repoPath, msg)
    commitSummary.value = ''
    commitDescription.value = ''
    selectedFile.value = null
    rawDiff.value = ''
  } catch (e: any) {
    commitError.value = e?.message ?? t('repoDetail.commitError')
  } finally {
    committing.value = false
  }
}
</script>
