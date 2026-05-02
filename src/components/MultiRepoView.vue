<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-background text-foreground text-[13px]">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b bg-card flex-shrink-0">
      <div class="flex items-center gap-2 font-bold text-sm">
        <LayoutGrid class="h-4 w-4 text-primary" />
        <span>{{ t('multiRepo.selectedN', { n: paths.length }) }}</span>
      </div>
      <Button variant="outline" size="sm" class="rounded-full" @click="gitStore.clearSelection()">{{ t('multiRepo.clearSelection') }}</Button>
    </div>

    <div class="flex items-center gap-3.5 px-4 py-2 border-b bg-muted/40 flex-shrink-0 text-xs">
      <span class="inline-flex items-center gap-1 font-semibold text-success">
        <Check class="h-3 w-3" :stroke-width="2.5" />
        {{ t('multiRepo.stagedN', { n: totalStaged }) }}
      </span>
      <span class="inline-flex items-center gap-1 font-semibold text-warning">
        <AlertCircle class="h-3 w-3" />
        {{ t('multiRepo.notStagedN', { n: totalUnstaged }) }}
      </span>
      <span v-if="totalConflicted > 0" class="inline-flex items-center gap-1 font-semibold text-destructive">
        <AlertCircle class="h-3 w-3" />
        {{ t('multiRepo.conflictsN', { n: totalConflicted }) }}
      </span>

      <div class="ml-auto flex gap-2 items-center">
        <Button variant="outline" size="xs" :disabled="working" :title="t('multiRepo.stageAllTitle')" @click="stageAllRepos">
          {{ t('multiRepo.stageAll') }}
        </Button>
      </div>
    </div>

    <div class="flex gap-2 px-4 py-2.5 border-b bg-muted/40 flex-shrink-0">
      <Input
        v-model="commitMsg"
        :placeholder="t('multiRepo.commitPlaceholder')"
        :maxlength="72"
        @keydown.ctrl.enter="commitAll"
        @keydown.meta.enter="commitAll"
      />
      <Button
        :disabled="!commitMsg.trim() || totalStaged === 0 || working"
        @click="commitAll"
      >
        <Loader2 v-if="working" class="h-3.5 w-3.5 animate-spin" />
        <Check v-else class="h-3.5 w-3.5" :stroke-width="2.5" />
        {{ t('multiRepo.commitInN', { n: reposWithStaged.length }) }}
      </Button>
    </div>

    <!-- Per-repo sections -->
    <div class="flex-1 overflow-y-auto py-2">
      <div v-for="path in paths" :key="path" class="border-b">
        <!-- Repo header -->
        <div
          class="flex items-center gap-2 px-4 py-2 cursor-pointer select-none border-l-2 border-transparent hover:bg-accent/40 transition-colors"
          :class="{ 'bg-primary/10 border-l-primary': gitStore.activeRepo === path }"
          @click="focusRepo(path)"
        >
          <ChevronDown
            class="h-3 w-3 transition-transform"
            :class="{ '-rotate-90': collapsed.has(path) }"
          />
          <span class="w-2 h-2 rounded-full flex-shrink-0" :class="dotClass(path)" />
          <span class="font-semibold text-[13px] flex-1">{{ labelFor(path) }}</span>

          <div class="ml-auto flex gap-2 items-center" @click.stop="toggleCollapse(path)">
            <Badge v-if="stagedCount(path)" variant="success" class="rounded-full text-[10px] font-semibold">{{ stagedCount(path) }} {{ t('multiRepo.stagedSmall') }}</Badge>
            <Badge v-if="unstagedCount(path)" variant="warning" class="rounded-full text-[10px] font-semibold">{{ unstagedCount(path) }} {{ t('multiRepo.modifiedSmall') }}</Badge>
            <Button variant="outline" size="xs" :disabled="!unstagedCount(path)" @click.stop="stageAllInRepo(path)">{{ t('multiRepo.stageAll') }}</Button>
            <Button
              size="xs"
              :disabled="!stagedCount(path) || !commitMsg.trim() || working"
              @click.stop="commitRepo(path)"
            >{{ t('multiRepo.commit') }}</Button>
          </div>
        </div>

        <!-- File list -->
        <div v-if="!collapsed.has(path)" class="py-0.5 pb-1.5">
          <div v-if="repoState(path)?.loading && !repoState(path)?.status" class="px-8 py-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
          </div>
          <div v-else-if="repoState(path)?.error" class="px-8 py-2 text-xs text-destructive">{{ repoState(path)?.error }}</div>
          <div v-else-if="!hasChanges(path)" class="flex items-center gap-1.5 px-8 py-2 text-xs text-muted-foreground">
            <Check class="h-3.5 w-3.5" />
            {{ t('repoPanel.noChanges') }}
          </div>
          <template v-else>
            <div
              v-for="file in stagedFiles(path)"
              :key="'s'+path+file"
              class="flex items-center gap-2 px-4 py-1 pl-8 cursor-pointer hover:bg-success/10 bg-success/5 transition-colors"
              @click="focusFile(path, file, true)"
            >
              <input type="checkbox" class="accent-primary cursor-pointer flex-shrink-0" checked @click.stop="gitStore.unstageFile(path, file)" />
              <span class="text-[10px] font-bold w-3.5 text-center flex-shrink-0 text-success">S</span>
              <span class="text-xs text-foreground/80 font-mono">{{ file }}</span>
            </div>
            <div
              v-for="file in unstagedFiles(path)"
              :key="'u'+path+file"
              class="flex items-center gap-2 px-4 py-1 pl-8 cursor-pointer hover:bg-accent/40 transition-colors"
              @click="focusFile(path, file, false)"
            >
              <input type="checkbox" class="accent-primary cursor-pointer flex-shrink-0" :checked="false" @click.stop="gitStore.stageFile(path, file)" />
              <span class="text-[10px] font-bold w-3.5 text-center flex-shrink-0" :class="fileLetterColor(path, file)">{{ fileLetter(path, file) }}</span>
              <span class="text-xs text-foreground/80 font-mono">{{ file }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Results -->
      <div v-if="results.length" class="mx-4 my-3 border rounded-lg overflow-hidden">
        <div class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border-b">
          {{ t('multiRepo.resultTitle') }}
        </div>
        <div
          v-for="r in results"
          :key="r.path"
          class="flex items-center gap-2 px-3 py-1.5 text-xs border-b last:border-b-0"
          :class="r.ok ? 'text-success' : 'text-destructive'"
        >
          <Check v-if="r.ok" class="h-3.5 w-3.5" :stroke-width="2.5" />
          <X v-else class="h-3.5 w-3.5" :stroke-width="2.5" />
          <span>{{ r.label }}</span>
          <span v-if="!r.ok" class="text-[11px] text-muted-foreground ml-1">{{ r.error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import { useProjectStore } from '@/stores/project'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LayoutGrid, Check, AlertCircle, X, ChevronDown, Loader2 } from 'lucide-vue-next'

const emit = defineEmits<{ 'focus-repo': [path: string] }>()

const { t } = useI18n()
const gitStore = useGitStore()
const projectStore = useProjectStore()

const commitMsg = ref('')
const working = ref(false)
const collapsed = ref(new Set<string>())
const results = ref<{ path: string; label: string; ok: boolean; error?: string }[]>([])

function focusRepo(path: string) {
  toggleCollapse(path)
  emit('focus-repo', path)
}

function focusFile(path: string, file: string, staged: boolean) {
  emit('focus-repo', path)
  gitStore.showDiff(path, file, staged)
}

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
  const all = [...s.modified, ...s.not_added, ...s.deleted, ...s.created]
  return [...new Set(all)].filter((f) => !s.staged.includes(f))
}

function stagedCount(path: string) { return stagedFiles(path).length }
function unstagedCount(path: string) { return unstagedFiles(path).length }
function hasChanges(path: string) { return stagedCount(path) + unstagedCount(path) > 0 }

function fileLetter(path: string, file: string) {
  const s = repoState(path)?.status
  if (!s) return 'M'
  if (s.deleted.includes(file)) return 'D'
  if (s.not_added.includes(file) || s.created.includes(file)) return 'A'
  return 'M'
}

function fileLetterColor(path: string, file: string) {
  const letter = fileLetter(path, file)
  if (letter === 'A') return 'text-info'
  if (letter === 'D') return 'text-destructive'
  return 'text-warning'
}

function dotClass(path: string) {
  const st = repoState(path)
  if (!st || st.loading) return 'bg-muted-foreground animate-pulse'
  if (st.error) return 'bg-destructive'
  if (hasChanges(path)) return 'bg-warning'
  return 'bg-success'
}

const totalStaged = computed(() => paths.value.reduce((acc, p) => acc + stagedCount(p), 0))
const totalUnstaged = computed(() => paths.value.reduce((acc, p) => acc + unstagedCount(p), 0))
const totalConflicted = computed(() =>
  paths.value.reduce((acc, p) => acc + (repoState(p)?.status?.conflicted?.length ?? 0), 0)
)
const reposWithStaged = computed(() => paths.value.filter((p) => stagedCount(p) > 0))

function toggleCollapse(path: string) {
  collapsed.value.has(path) ? collapsed.value.delete(path) : collapsed.value.add(path)
}

async function stageAllInRepo(path: string) {
  await window.electron.git.stageAll(path)
  await gitStore.refresh(path)
}

async function stageAllRepos() {
  working.value = true
  await Promise.all(paths.value.map((p) => stageAllInRepo(p)))
  working.value = false
}

async function commitRepo(path: string) {
  if (!commitMsg.value.trim() || !stagedCount(path)) return
  await window.electron.git.commit(path, commitMsg.value.trim())
  await gitStore.refresh(path)
}

async function commitAll() {
  if (!commitMsg.value.trim() || reposWithStaged.value.length === 0) return
  working.value = true
  results.value = []

  const settled = await Promise.allSettled(
    reposWithStaged.value.map((p) => window.electron.git.commit(p, commitMsg.value.trim()))
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

  if (settled.every((s) => s.status === 'fulfilled')) commitMsg.value = ''
  working.value = false
}
</script>
