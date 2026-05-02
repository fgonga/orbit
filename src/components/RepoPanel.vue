<template>
  <Card class="h-full" :class="{ 'border-primary': isSelected }">
    <div class="group/header flex items-center gap-2 py-2 px-2 border-b">
      <span class="repo-drag-handle text-muted-foreground flex-shrink-0 opacity-50 cursor-grab" :title="t('repoPanel.drag')">
        <GripVertical class="h-3 w-3" />
      </span>
      <input
        type="checkbox"
        class="m-0 accent-primary cursor-pointer"
        :checked="isSelected"
        :title="t('repoPanel.selectBulk')"
        @change="gitStore.toggleSelect(repo.path)"
      />

      <div class="flex-1 overflow-hidden">
        <div class="font-semibold truncate text-sm">{{ repo.label }}</div>
        <div class="text-muted-foreground text-[11px] flex items-center gap-1 flex-wrap">
          <Badge v-if="state?.branches?.current" variant="secondary" class="text-info bg-info/15 border-0 px-1.5 py-0 rounded font-normal">
            {{ state.branches.current }}
          </Badge>
          <span v-if="state?.status?.ahead" class="text-success">+{{ state.status.ahead }}</span>
          <span v-if="state?.status?.behind" class="text-destructive">-{{ state.status.behind }}</span>
        </div>
      </div>

      <div class="flex gap-1 flex-shrink-0">
        <Badge v-if="stagedCount > 0" variant="success" class="px-1.5 py-0 text-[10px] rounded" :title="t('repoPanel.stagedTitle')">{{ stagedCount }}</Badge>
      </div>

      <Button variant="ghost" size="icon-xs" :disabled="state?.loading" :title="t('common.refresh')" @click="gitStore.refresh(repo.path)">
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': state?.loading }" />
      </Button>

      <button
        class="group/rdel relative flex items-center justify-center min-w-[22px] h-[18px] text-[10px] rounded-full flex-shrink-0 transition-all hover:bg-destructive/10 hover:text-destructive/60 cursor-pointer"
        :class="changedCount > 0 ? 'px-1.5 bg-warning/20 text-warning font-bold' : 'opacity-0 group-hover/header:opacity-100'"
        :title="t('common.remove')"
        @click="projectStore.removeRepo(groupId, repo.id)"
      >
        <span v-if="changedCount > 0" class="group-hover/rdel:opacity-0 transition-opacity leading-none select-none">{{ changedCount }}</span>
        <Trash2 class="absolute h-2.5 w-2.5 opacity-0 group-hover/rdel:opacity-100 transition-opacity" :stroke-width="2" />
      </button>
    </div>

    <div v-if="state?.error" class="px-2 py-1 bg-destructive/15 text-destructive text-xs">
      {{ state.error }}
    </div>

    <div v-else-if="state?.loading && !state.status" class="p-2 flex flex-col gap-1.5">
      <Skeleton class="h-3 w-2/3" />
      <Skeleton class="h-3 w-1/2" />
    </div>

    <div v-else-if="state?.status" class="p-0">
      <div v-if="showBranchPicker" class="px-2 py-1 border-b bg-muted/40">
        <select
          class="flex h-7 w-full rounded border border-input bg-background px-2 text-xs"
          :value="state.branches?.current"
          @change="switchBranch"
        >
          <option v-for="b in state.branches?.all" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>

      <div v-if="hasChanges" class="max-h-[200px] overflow-y-auto">
        <template v-if="state.status.staged.length">
          <div class="py-1 px-2 bg-success/15 text-success flex items-center gap-1 text-[11px] border-b">
            <Check class="h-3 w-3" />
            {{ t('repoDetail.stagedN', { n: state.status.staged.length }) }}
          </div>
          <div
            v-for="file in state.status.staged"
            :key="'s-' + file"
            class="py-1 px-2 flex items-center gap-1 text-xs border-b border-border/20 hover:bg-accent/30"
          >
            <span class="text-success font-bold text-[10px]">S</span>
            <span class="flex-1 truncate" :title="file">{{ file }}</span>
            <Button variant="ghost" size="icon-xs" title="Diff" @click="gitStore.showDiff(repo.path, file, true)">
              <FileText class="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" class="!text-warning" :title="t('diffViewer.unstageFileTitle')" @click="gitStore.unstageFile(repo.path, file)">-</Button>
          </div>
        </template>

        <template v-if="unstaged.length">
          <div class="py-1 px-2 bg-warning/15 text-warning flex items-center gap-1 text-[11px] border-b">
            <AlertCircle class="h-3 w-3" />
            {{ t('repoDetail.modifiedN', { n: unstaged.length }) }}
          </div>
          <div
            v-for="file in unstaged"
            :key="'m-' + file"
            class="py-1 px-2 flex items-center gap-1 text-xs border-b border-border/20 hover:bg-accent/30"
          >
            <span class="text-warning font-bold text-[10px]">M</span>
            <span class="flex-1 truncate" :title="file">{{ file }}</span>
            <Button variant="ghost" size="icon-xs" title="Diff" @click="gitStore.showDiff(repo.path, file, false)">
              <FileText class="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" class="!text-success" :title="t('diffViewer.stageFileTitle')" @click="gitStore.stageFile(repo.path, file)">+</Button>
          </div>
        </template>
      </div>

      <div v-else class="px-2 py-2 text-muted-foreground text-xs text-center">{{ t('repoPanel.noChanges') }}</div>

      <div class="px-2 py-2 border-t flex flex-col gap-1.5">
        <div class="flex gap-1">
          <Input
            v-model="commitMessage"
            class="flex-1 h-7 text-xs"
            :placeholder="t('repoPanel.commitPlaceholder')"
            @keydown.enter="doCommit"
          />
          <Button
            variant="success"
            size="icon-sm"
            :title="t('multiRepo.commit')"
            :disabled="!commitMessage.trim() || stagedCount === 0 || committing"
            @click="doCommit"
          >
            <Check class="h-3.5 w-3.5" />
          </Button>
        </div>

        <div class="flex gap-1">
          <Button variant="outline" size="xs" class="flex-1" :disabled="!hasChanges" @click="gitStore.stageAll(repo.path)">
            {{ t('repoPanel.stageAll') }}
          </Button>
          <Button variant="outline" size="xs" class="text-primary border-primary/30" :disabled="pushing" :title="t('repoDetail.pushTitle')" @click="doPush">
            <ArrowUp class="h-3 w-3" />
            {{ t('repoDetail.push') }}
          </Button>
          <Button variant="outline" size="xs" class="text-info border-info/30" :disabled="pulling" :title="t('repoDetail.pullTitle')" @click="doPull">
            <ArrowDown class="h-3 w-3" />
            {{ t('repoDetail.pull') }}
          </Button>
          <Button variant="ghost" size="icon-xs" :title="t('repoPanel.changeBranch')" @click="showBranchPicker = !showBranchPicker">
            <GitBranch class="h-3.5 w-3.5" />
          </Button>
        </div>

        <div v-if="actionError" class="text-destructive text-[11px]">{{ actionError }}</div>
      </div>

      <div v-if="state.log.length" class="border-t">
        <button
          class="w-full flex items-center gap-1 py-1 px-2 text-[11px] text-muted-foreground hover:bg-accent/40 transition-colors"
          @click="showLog = !showLog"
        >
          <History class="h-3 w-3" />
          {{ t('repoPanel.logN', { n: state.log.length }) }}
          <ChevronDown
            class="h-3 w-3 ml-auto transition-transform"
            :class="{ '-rotate-90': !showLog }"
          />
        </button>
        <div v-if="showLog" class="px-2 pb-2 max-h-[140px] overflow-y-auto">
          <div v-for="c in state.log.slice(0, 15)" :key="c.hash" class="flex gap-2 py-1 border-b border-border/20 text-[11px]">
            <code class="text-muted-foreground flex-shrink-0">{{ c.hash }}</code>
            <span class="flex-1 truncate" :title="c.message">{{ c.message }}</span>
            <span class="text-muted-foreground flex-shrink-0">{{ c.author.split(' ')[0] }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-3">
      <Button variant="ghost" size="sm" @click="gitStore.refresh(repo.path)">{{ t('repoPanel.load') }}</Button>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import { useProjectStore } from '@/stores/project'
import type { Repo } from '@/types/project'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GripVertical, RefreshCw, X, Check, AlertCircle, FileText,
  ArrowUp, ArrowDown, GitBranch, History, ChevronDown, Trash2,
} from 'lucide-vue-next'

const props = defineProps<{ repo: Repo; groupId: string }>()

const { t } = useI18n()
const gitStore = useGitStore()
const projectStore = useProjectStore()

const commitMessage = ref('')
const showLog = ref(false)
const showBranchPicker = ref(false)
const committing = ref(false)
const pushing = ref(false)
const pulling = ref(false)
const actionError = ref('')

onMounted(() => gitStore.refresh(props.repo.path))

const state = computed(() => gitStore.repos[props.repo.path])
const isSelected = computed(() => gitStore.selectedRepos.has(props.repo.path))
const stagedCount = computed(() => state.value?.status?.staged.length ?? 0)
const changedCount = computed(() => {
  const s = state.value?.status
  if (!s) return 0
  return s.modified.length + s.not_added.length + s.deleted.length + s.created.length
})
const hasChanges = computed(() => changedCount.value > 0 || stagedCount.value > 0)
const unstaged = computed(() => {
  const s = state.value?.status
  if (!s) return []
  return [...new Set([...s.modified, ...s.not_added, ...s.deleted, ...s.created])]
    .filter((f) => !s.staged.includes(f))
})

async function doCommit() {
  if (!commitMessage.value.trim() || stagedCount.value === 0) return
  committing.value = true
  actionError.value = ''
  try {
    await gitStore.commit(props.repo.path, commitMessage.value.trim())
    commitMessage.value = ''
  } catch (e: any) {
    actionError.value = e?.message ?? t('repoPanel.commitError')
  } finally {
    committing.value = false
  }
}

async function doPush() {
  pushing.value = true
  actionError.value = ''
  try { await gitStore.push(props.repo.path) }
  catch (e: any) { actionError.value = e?.message ?? t('repoPanel.pushError') }
  finally { pushing.value = false }
}

async function doPull() {
  pulling.value = true
  actionError.value = ''
  try { await gitStore.pull(props.repo.path) }
  catch (e: any) { actionError.value = e?.message ?? t('repoPanel.pullError') }
  finally { pulling.value = false }
}

async function switchBranch(e: Event) {
  const branch = (e.target as HTMLSelectElement).value
  await gitStore.checkout(props.repo.path, branch)
  showBranchPicker.value = false
}
</script>
