<template>
  <div class="border-b border-t-2 border-t-primary bg-card flex-shrink-0">
    <!-- Main row -->
    <div class="flex items-center gap-3 px-3 py-2">
      <Button variant="ghost" size="icon-xs" :title="showDetails ? t('bulkBar.hideRepos') : t('bulkBar.showRepos')" @click="showDetails = !showDetails">
        <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': !showDetails }" />
      </Button>

      <span class="font-semibold text-info text-[13px] whitespace-nowrap">
        {{ t('bulkBar.reposN', { n: gitStore.selectedRepos.size }) }}
      </span>

      <div class="flex gap-2 items-center flex-1 flex-wrap">
        <div class="flex gap-1 items-center">
          <label class="flex items-center gap-1 text-muted-foreground text-[11px] mr-1 cursor-pointer" :title="t('bulkBar.stageAllTooltip')">
            <input v-model="stageBeforeCommit" type="checkbox" class="accent-primary" />
            {{ t('bulkBar.stageAll') }}
          </label>
          <Input
            v-model="bulkMessage"
            class="min-w-[220px] h-8"
            :placeholder="t('bulkBar.commitPlaceholder')"
            @keydown.enter="doBulkCommit"
          />
          <Button variant="success" size="sm" :disabled="!bulkMessage.trim() || working" @click="doBulkCommit">
            <Check class="h-3.5 w-3.5" />
            {{ t('bulkBar.commit') }}
          </Button>
        </div>

        <Separator orientation="vertical" class="h-5 opacity-40" />

        <Button variant="outline" size="sm" class="text-primary border-primary/30" :disabled="working" @click="doBulkPush">
          <ArrowUp class="h-3.5 w-3.5" />
          {{ t('bulkBar.pushAll') }}
        </Button>
        <Button variant="outline" size="sm" class="text-info border-info/30" :disabled="working" @click="doBulkPull">
          <ArrowDown class="h-3.5 w-3.5" />
          {{ t('bulkBar.pullAll') }}
        </Button>
      </div>

      <div v-if="working" class="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 class="h-3.5 w-3.5 animate-spin text-info" />
        {{ currentOp }}...
      </div>

      <Button variant="ghost" size="icon-sm" :title="t('bulkBar.clearSelection')" @click="gitStore.clearSelection()">
        <X class="h-3.5 w-3.5" />
      </Button>
    </div>

    <!-- Per-repo results -->
    <div v-if="results.length > 0" class="px-3 pb-2 flex flex-wrap gap-2 items-center">
      <Badge
        v-for="r in results"
        :key="r.path"
        :variant="r.ok ? 'success' : 'destructive'"
        class="gap-1"
        :title="r.error ?? ''"
      >
        <Check v-if="r.ok" class="h-3 w-3" :stroke-width="3" />
        <X v-else class="h-3 w-3" :stroke-width="3" />
        {{ r.label }}
      </Badge>
      <Button variant="ghost" size="icon-xs" :title="t('common.close')" @click="results = []">
        <X class="h-3 w-3" />
      </Button>
    </div>

    <!-- Selected repos details -->
    <div v-if="showDetails" class="px-3 pb-2 flex flex-wrap gap-1">
      <Badge
        v-for="path in [...gitStore.selectedRepos]"
        :key="path"
        variant="secondary"
        class="gap-1 text-[11px]"
      >
        {{ labelFor(path) }}
        <button class="ml-1 hover:text-destructive transition-colors" @click="gitStore.selectedRepos.delete(path)">
          <X class="h-2.5 w-2.5" :stroke-width="3" />
        </button>
      </Badge>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import { useProjectStore } from '@/stores/project'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, Check, ArrowUp, ArrowDown, Loader2, X } from 'lucide-vue-next'

const { t } = useI18n()
const gitStore = useGitStore()
const projectStore = useProjectStore()

const bulkMessage = ref('')
const stageBeforeCommit = ref(false)
const working = ref(false)
const currentOp = ref('')
const showDetails = ref(false)

interface Result { path: string; label: string; ok: boolean; error?: string }
const results = ref<Result[]>([])

function labelFor(repoPath: string): string {
  for (const g of projectStore.current?.groups ?? []) {
    const r = g.repos.find((r) => r.path === repoPath)
    if (r) return r.label
  }
  return repoPath.split('/').pop() ?? repoPath
}

async function runBulk(op: string, fn: (path: string) => Promise<void>) {
  const paths = [...gitStore.selectedRepos]
  working.value = true
  currentOp.value = op
  results.value = []

  const settled = await Promise.allSettled(paths.map((p) => fn(p)))

  results.value = paths.map((path, i) => ({
    path,
    label: labelFor(path),
    ok: settled[i].status === 'fulfilled',
    error: settled[i].status === 'rejected' ? (settled[i] as PromiseRejectedResult).reason?.message : undefined,
  }))

  working.value = false
  currentOp.value = ''
  setTimeout(() => { results.value = [] }, 8000)
}

async function doBulkCommit() {
  if (!bulkMessage.value.trim()) return
  const msg = bulkMessage.value.trim()
  await runBulk('commit', async (path) => {
    if (stageBeforeCommit.value) await window.electron.git.stageAll(path)
    await window.electron.git.commit(path, msg)
    await gitStore.refresh(path)
  })
  bulkMessage.value = ''
}

async function doBulkPush() {
  await runBulk('push', async (path) => {
    await window.electron.git.push(path)
    await gitStore.refresh(path)
  })
}

async function doBulkPull() {
  await runBulk('pull', async (path) => {
    await window.electron.git.pull(path)
    await gitStore.refresh(path)
  })
}
</script>
