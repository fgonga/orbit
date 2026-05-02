<template>
  <div class="flex h-full overflow-hidden text-[13px] text-foreground">
    <!-- ── Left: file list ──────────────────────────────── -->
    <div class="w-[260px] flex-shrink-0 flex flex-col border-r bg-card">
      <div class="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b bg-muted/40 flex-shrink-0">
        <AlertCircle class="h-3.5 w-3.5 text-destructive" />
        <span>{{ t('conflicts.remainingN', { n: remaining }) }}</span>
        <Button variant="outline" size="xs" class="ml-auto text-destructive border-destructive/40 hover:bg-destructive/15" :title="t('conflicts.abortMergeTitle')" @click="abortMerge">
          {{ t('conflicts.abort') }}
        </Button>
      </div>

      <div class="h-[3px] bg-border flex-shrink-0">
        <div class="h-full bg-success transition-[width] duration-300" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b flex-shrink-0">
        <span>{{ t('conflicts.resolvedOf', { r: resolvedCount, t: fileList.length }) }}</span>
      </div>

      <div class="flex-1 overflow-y-auto">
        <button
          v-for="f in fileList"
          :key="f.file"
          class="flex items-center gap-2 px-2.5 py-2 w-full text-left border-l-[3px] border-transparent border-b border-border/20 transition-colors"
          :class="[
            !f.resolved && 'hover:bg-destructive/10',
            !f.resolved && selectedFile === f.file && '!bg-destructive/15 border-l-destructive',
            f.resolved && 'opacity-60 bg-success/5',
            f.resolved && selectedFile === f.file && '!bg-success/15 border-l-success !opacity-100',
          ]"
          @click="selectFile(f.file)"
        >
          <div
            class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            :class="f.resolved ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'"
          >
            <Check v-if="f.resolved" class="h-3 w-3" :stroke-width="3" />
            <X v-else class="h-3 w-3" :stroke-width="3" />
          </div>

          <div class="flex-1 overflow-hidden">
            <div class="text-xs font-medium truncate">{{ baseName(f.file) }}</div>
            <div class="text-[10px] text-muted-foreground truncate">
              {{ f.resolved ? t('conflicts.resolved') : dirName(f.file) || t('conflicts.conflict') }}
            </div>
          </div>

          <div v-if="!f.resolved" class="flex gap-1" @click.stop>
            <button
              class="w-5 h-5 rounded bg-info/15 text-info border border-info/30 text-[10px] font-bold hover:bg-info/25 transition-colors"
              :title="t('conflicts.useOurs')"
              @click="quickResolve(f.file, 'ours')"
            >A</button>
            <button
              class="w-5 h-5 rounded bg-warning/15 text-warning border border-warning/30 text-[10px] font-bold hover:bg-warning/25 transition-colors"
              :title="t('conflicts.useTheirs')"
              @click="quickResolve(f.file, 'theirs')"
            >R</button>
          </div>
        </button>
      </div>

      <div v-if="remaining === 0" class="p-3 border-t flex flex-col gap-1.5">
        <div class="text-[11px] text-success mb-1">{{ t('conflicts.allResolved') }}</div>
        <Input v-model="commitMsg" class="h-8 text-xs" :placeholder="t('conflicts.mergeCommitPlaceholder')" @keydown.enter="commitMerge" />
        <Button :disabled="!commitMsg.trim() || committing" @click="commitMerge">
          <Loader2 v-if="committing" class="h-3.5 w-3.5 animate-spin" />
          {{ t('conflicts.mergeCommit') }}
        </Button>
      </div>
    </div>

    <!-- ── Right: conflict editor ────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <div v-if="!selectedFile && fileList.length === 0" class="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm p-6">
        <Check class="h-10 w-10 opacity-30 text-success" :stroke-width="1" />
        <p>{{ t('conflicts.none') }}</p>
        <p class="text-[11px]">{{ t('conflicts.noneHint') }}</p>
        <Button variant="outline" size="sm" class="mt-2 text-destructive border-destructive/40 hover:bg-destructive/15" @click="abortMerge">{{ t('common.close') }}</Button>
      </div>
      <div v-else-if="!selectedFile" class="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
        <FileText class="h-10 w-10 opacity-30" :stroke-width="1" />
        <p>{{ t('conflicts.selectFile') }}</p>
      </div>

      <template v-else>
        <!-- Editor header -->
        <div class="flex items-center gap-3 px-4 py-2.5 border-b bg-card flex-shrink-0">
          <span class="font-mono text-xs font-semibold flex-1 truncate">{{ selectedFile }}</span>
          <div class="flex gap-2">
            <Button variant="outline" size="xs" class="text-info border-info/40" @click="acceptAll('ours')">{{ t('conflicts.acceptAllOurs') }}</Button>
            <Button variant="outline" size="xs" class="text-warning border-warning/40" @click="acceptAll('theirs')">{{ t('conflicts.acceptAllTheirs') }}</Button>
          </div>
        </div>

        <div class="flex items-center gap-3 px-4 py-1.5 text-[11px] border-b bg-muted/40 flex-shrink-0">
          <span class="text-info font-semibold">{{ t('conflicts.currentLabel', { label: oursLabel }) }}</span>
          <span class="text-warning font-semibold">{{ t('conflicts.remoteLabel', { label: theirsLabel }) }}</span>
          <span v-if="unresolvedCount > 0" class="ml-auto text-destructive font-semibold">{{ t('conflicts.unresolvedN', { n: unresolvedCount }) }}</span>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto font-mono text-[12px]" v-if="!loading">
          <template v-for="(seg, i) in segments" :key="i">
            <!-- Normal lines -->
            <div v-if="seg.type === 'normal'">
              <div v-for="(line, li) in seg.lines" :key="li" class="flex items-start gap-2 px-4 py-px text-foreground/70 leading-snug">
                <span class="w-8 text-right text-muted-foreground text-[10px] select-none flex-shrink-0">{{ li + 1 }}</span>
                <span class="whitespace-pre flex-1">{{ line }}</span>
              </div>
            </div>

            <!-- Conflict hunk -->
            <div v-else class="my-2 mx-2 border rounded-lg overflow-hidden" :class="{ 'opacity-70': seg.hunk.resolved }">
              <div class="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border-b">
                <span class="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{{ t('conflicts.conflictN', { n: seg.hunk.id + 1 }) }}</span>
                <div v-if="!seg.hunk.resolved" class="flex gap-1 ml-auto">
                  <Button variant="outline" size="xs" class="text-info border-info/40" @click="acceptHunk(seg.hunk, 'ours')">{{ t('conflicts.acceptOurs') }}</Button>
                  <Button variant="outline" size="xs" @click="acceptHunk(seg.hunk, 'both')">{{ t('conflicts.acceptBoth') }}</Button>
                  <Button variant="outline" size="xs" class="text-warning border-warning/40" @click="acceptHunk(seg.hunk, 'theirs')">{{ t('conflicts.acceptTheirs') }}</Button>
                </div>
                <div v-else class="ml-auto flex items-center gap-2">
                  <Badge variant="success" class="text-[10px] rounded-full">{{ t('conflicts.resolved') }}</Badge>
                  <Button variant="ghost" size="xs" @click="seg.hunk.resolved = undefined">{{ t('conflicts.undo') }}</Button>
                </div>
              </div>

              <!-- Ours -->
              <div class="bg-info/5" :class="{ 'opacity-30': seg.hunk.resolved === 'theirs' }">
                <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-info bg-info/10">{{ t('conflicts.currentHeader', { label: seg.hunk.oursLabel }) }}</div>
                <div v-for="(line, li) in seg.hunk.ours" :key="li" class="flex items-start gap-2 px-4 py-px text-info leading-snug">
                  <span class="w-4 text-center select-none flex-shrink-0">+</span>
                  <span class="whitespace-pre flex-1">{{ line }}</span>
                </div>
              </div>

              <div class="h-px bg-border"></div>

              <!-- Theirs -->
              <div class="bg-warning/5" :class="{ 'opacity-30': seg.hunk.resolved === 'ours' }">
                <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-warning bg-warning/10">{{ t('conflicts.remoteHeader', { label: seg.hunk.theirsLabel }) }}</div>
                <div v-for="(line, li) in seg.hunk.theirs" :key="li" class="flex items-start gap-2 px-4 py-px text-warning leading-snug">
                  <span class="w-4 text-center select-none flex-shrink-0">+</span>
                  <span class="whitespace-pre flex-1">{{ line }}</span>
                </div>
              </div>

              <!-- Preview -->
              <div v-if="seg.hunk.resolved" class="bg-success/10 border-t">
                <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-success bg-success/20">{{ t('conflicts.result') }}</div>
                <div v-for="(line, li) in (seg.hunk.resolvedLines ?? [])" :key="li" class="flex items-start gap-2 px-4 py-px text-success leading-snug">
                  <span class="w-4 text-center select-none flex-shrink-0"></span>
                  <span class="whitespace-pre flex-1">{{ line }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div v-else class="flex-1 flex items-center justify-center">
          <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
        </div>

        <!-- Save bar -->
        <div class="flex items-center gap-3 px-4 py-2.5 border-t bg-card flex-shrink-0" v-if="!loading">
          <span v-if="unresolvedCount > 0" class="text-xs text-destructive">{{ t('conflicts.hunksUnresolved', { n: unresolvedCount }) }}</span>
          <span v-else class="text-xs text-success">{{ t('conflicts.fileResolved') }}</span>
          <Button class="ml-auto" size="sm" variant="success" :disabled="unresolvedCount > 0 || saving" @click="saveFile">
            <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
            {{ t('conflicts.saveAndResolve') }}
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Check, X, Loader2, FileText } from 'lucide-vue-next'

const props = defineProps<{ repoPath: string }>()
const emit  = defineEmits<{ done: [] }>()

const { t } = useI18n()
const gitStore = useGitStore()

interface ConflictHunk {
  id: number
  oursLabel: string
  theirsLabel: string
  ours: string[]
  theirs: string[]
  resolved?: 'ours' | 'theirs' | 'both'
  resolvedLines?: string[]
}
interface Segment {
  type: 'normal' | 'conflict'
  lines: string[]
  hunk: ConflictHunk
}
interface FileEntry { file: string; resolved: boolean }

const fileList    = ref<FileEntry[]>([])
const selectedFile = ref<string | null>(null)
const segments    = ref<Segment[]>([])
const loading     = ref(false)
const saving      = ref(false)
const committing  = ref(false)
const commitMsg   = ref('Merge branch')

onMounted(loadFileList)

async function loadFileList() {
  const files: string[] = await window.electron.conflict.list(props.repoPath)
  fileList.value = files.map((f) => ({ file: f, resolved: false }))
  if (files.length) selectFile(files[0])
}

const oursLabel       = computed(() => segments.value.find((s) => s.type === 'conflict')?.hunk?.oursLabel ?? 'HEAD')
const theirsLabel     = computed(() => segments.value.find((s) => s.type === 'conflict')?.hunk?.theirsLabel ?? 'remote')
const unresolvedCount = computed(() => segments.value.filter((s) => s.type === 'conflict' && !s.hunk.resolved).length)
const remaining       = computed(() => fileList.value.filter((f) => !f.resolved).length)
const resolvedCount   = computed(() => fileList.value.filter((f) => f.resolved).length)
const progressPct     = computed(() => fileList.value.length ? Math.round((resolvedCount.value / fileList.value.length) * 100) : 0)

async function selectFile(file: string) {
  selectedFile.value = file
  loading.value = true
  try {
    const content = await window.electron.conflict.readFile(props.repoPath, file)
    segments.value = parseConflicts(content)
  } finally {
    loading.value = false
  }
}

function parseConflicts(content: string): Segment[] {
  const lines = content.split('\n')
  const result: Segment[] = []
  let i = 0
  let normalLines: string[] = []
  let hunkId = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('<<<<<<<')) {
      if (normalLines.length) { result.push({ type: 'normal', lines: [...normalLines], hunk: null! }); normalLines = [] }
      const oursLabel = line.replace('<<<<<<<', '').trim()
      const ours: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('=======')) { ours.push(lines[i]); i++ }
      i++
      const theirs: string[] = []
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) { theirs.push(lines[i]); i++ }
      const theirsLabel = lines[i].replace('>>>>>>>', '').trim()
      i++
      const hunk: ConflictHunk = { id: hunkId++, oursLabel, theirsLabel, ours, theirs }
      result.push({ type: 'conflict', lines: [], hunk })
    } else {
      normalLines.push(line)
      i++
    }
  }
  if (normalLines.length) result.push({ type: 'normal', lines: normalLines, hunk: null! })
  return result
}

function buildContent(): string {
  const lines: string[] = []
  for (const seg of segments.value) {
    if (seg.type === 'normal') lines.push(...seg.lines)
    else if (seg.hunk.resolvedLines) lines.push(...seg.hunk.resolvedLines)
  }
  return lines.join('\n')
}

function acceptHunk(hunk: ConflictHunk, side: 'ours' | 'theirs' | 'both') {
  hunk.resolved = side
  hunk.resolvedLines = side === 'ours'   ? [...hunk.ours]
                     : side === 'theirs' ? [...hunk.theirs]
                     : [...hunk.ours, ...hunk.theirs]
}

function acceptAll(side: 'ours' | 'theirs') {
  for (const seg of segments.value) if (seg.type === 'conflict') acceptHunk(seg.hunk, side)
}

async function saveFile() {
  if (unresolvedCount.value > 0 || !selectedFile.value) return
  saving.value = true
  try {
    const content = buildContent()
    await window.electron.conflict.resolveFile(props.repoPath, selectedFile.value, content)
    const entry = fileList.value.find((f) => f.file === selectedFile.value)
    if (entry) entry.resolved = true
    await gitStore.refresh(props.repoPath)
    const next = fileList.value.find((f) => !f.resolved)
    if (next) selectFile(next.file)
  } finally {
    saving.value = false
  }
}

async function quickResolve(file: string, side: 'ours' | 'theirs') {
  await window.electron.conflict.resolveWith(props.repoPath, file, side)
  const entry = fileList.value.find((f) => f.file === file)
  if (entry) entry.resolved = true
  await gitStore.refresh(props.repoPath)
  if (selectedFile.value === file) {
    const next = fileList.value.find((f) => !f.resolved)
    if (next) selectFile(next.file)
    else selectedFile.value = null
  }
}

async function abortMerge() {
  await window.electron.conflict.abortMerge(props.repoPath)
  await gitStore.refresh(props.repoPath)
  emit('done')
}

async function commitMerge() {
  if (!commitMsg.value.trim()) return
  committing.value = true
  try {
    await window.electron.git.commit(props.repoPath, commitMsg.value.trim())
    await gitStore.refresh(props.repoPath)
    emit('done')
  } finally {
    committing.value = false
  }
}

function baseName(f: string) { return f.split('/').pop() ?? f }
function dirName(f: string) { const p = f.split('/'); return p.length > 1 ? p.slice(0, -1).join('/') : '' }
</script>
