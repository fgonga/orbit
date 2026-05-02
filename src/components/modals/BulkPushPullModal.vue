<template>
  <Modal v-model="open" :title="op === 'push' ? t('modals.bulkPushPull.titlePush') : t('modals.bulkPushPull.titlePull')" width="560px">
    <template #icon>
      <ArrowUp v-if="op === 'push'" class="h-4 w-4 text-primary" />
      <ArrowDown v-else class="h-4 w-4 text-info" />
    </template>

    <!-- Lista de repos -->
    <div class="flex flex-col gap-2">
      <div
        v-for="r in repoList" :key="r.path"
        class="flex items-center flex-wrap gap-2.5 p-3 rounded-lg border bg-card transition-colors"
        :class="resultClass(r.path)"
      >
        <div class="w-[18px] flex items-center justify-center flex-shrink-0">
          <Loader2 v-if="running && !results[r.path]" class="h-3.5 w-3.5 animate-spin text-primary" />
          <Check v-else-if="results[r.path]?.ok" class="h-3.5 w-3.5 text-success" :stroke-width="2.5" />
          <X v-else-if="results[r.path] && !results[r.path].ok" class="h-3.5 w-3.5 text-destructive" :stroke-width="2.5" />
          <span v-else class="w-2 h-2 rounded-full" :class="syncDotClass(r.path)" />
        </div>

        <div class="flex-1 flex items-center gap-2 overflow-hidden">
          <span class="font-semibold text-[13px] truncate">{{ r.label }}</span>
          <span class="text-[11px] text-muted-foreground whitespace-nowrap">{{ repoState(r.path)?.branches?.current }}</span>
        </div>

        <div class="flex gap-1 flex-shrink-0">
          <span v-if="ahead(r.path)" class="text-[11px] font-bold px-1.5 py-px rounded-full bg-primary/15 text-primary">+{{ ahead(r.path) }}</span>
          <span v-if="behind(r.path)" class="text-[11px] font-bold px-1.5 py-px rounded-full bg-info/15 text-info">-{{ behind(r.path) }}</span>
          <span v-if="!ahead(r.path) && !behind(r.path) && !results[r.path]" class="text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground">{{ t('modals.bulkPushPull.sync') }}</span>
        </div>

        <div v-if="results[r.path] && !results[r.path].ok" class="w-full text-[11px] text-destructive bg-destructive/10 px-2 py-1.5 rounded font-mono break-all">
          <span v-if="isConflict(results[r.path].error)">
            {{ t('modals.bulkPushPull.conflictsMessage') }}
          </span>
          <span v-else-if="isNonFastForward(results[r.path].error)">
            {{ t('modals.bulkPushPull.nonFastForwardMessage') }}
          </span>
          <span v-else>{{ results[r.path].error }}</span>
        </div>
      </div>
    </div>

    <!-- Hint global de Pull -->
    <div v-if="done && reposNeedingPull.length > 0" class="flex gap-2.5 items-start p-3 rounded-lg mt-2 bg-info/10 border border-info/20">
      <AlertCircle class="h-3.5 w-3.5 flex-shrink-0 text-info mt-0.5" />
      <div>
        <div class="text-xs font-semibold">{{ t('modals.bulkPushPull.rejectedN', { n: reposNeedingPull.length }) }}</div>
        <div class="text-[11px] opacity-70 mt-0.5">{{ t('modals.bulkPushPull.rejectedHint') }}</div>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" size="sm" @click="open = false">{{ done ? t('common.close') : t('common.cancel') }}</Button>
      <Button v-if="done && reposNeedingPull.length > 0" variant="success" size="sm" :disabled="retrying" @click="pullThenPush">
        <Loader2 v-if="retrying" class="h-3.5 w-3.5 animate-spin" />
        {{ t('modals.bulkPushPull.pullThenPush', { n: reposNeedingPull.length }) }}
      </Button>
      <Button
        v-if="!done"
        :variant="op === 'push' ? 'default' : 'success'"
        size="sm"
        :disabled="running || reposWithWork.length === 0"
        @click="runAll"
      >
        <Loader2 v-if="running" class="h-3.5 w-3.5 animate-spin" />
        {{ t('modals.bulkPushPull.runN', { op: op === 'push' ? t('modals.pushPull.titlePush') : t('modals.pushPull.titlePull'), n: reposWithWork.length }) }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { Button } from '@/components/ui/button'
import { useGitStore } from '@/stores/git'
import { useProjectStore } from '@/stores/project'
import { ArrowUp, ArrowDown, Check, X, Loader2, AlertCircle } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean; op: 'push' | 'pull'; repoPaths: string[] }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const { t } = useI18n()
const gitStore     = useGitStore()
const projectStore = useProjectStore()

const open    = ref(props.modelValue)
const running  = ref(false)
const done     = ref(false)
const retrying = ref(false)
const results  = ref<Record<string, { ok: boolean; error?: string }>>({})

watch(() => props.modelValue, (v) => {
  open.value = v
  if (v) { running.value = false; done.value = false; results.value = {} }
})
watch(open, (v) => emit('update:modelValue', v))

const repoList = computed(() =>
  props.repoPaths.map((path) => {
    for (const g of projectStore.current?.groups ?? []) {
      const r = g.repos.find((r) => r.path === path)
      if (r) return { path, label: r.label }
    }
    return { path, label: path.split('/').pop() ?? path }
  })
)

function repoState(path: string) { return gitStore.repos[path] }
function ahead(path: string)     { return repoState(path)?.status?.ahead  ?? 0 }
function behind(path: string)    { return repoState(path)?.status?.behind ?? 0 }

const reposWithWork = computed(() =>
  repoList.value.filter((r) => props.op === 'push' ? ahead(r.path) > 0 : behind(r.path) > 0)
)

function isConflict(error?: string) {
  if (!error) return false
  return error.includes('unmerged files') || error.includes('unresolved conflict') || error.includes('Merge conflict')
}

function isNonFastForward(error?: string) {
  if (!error) return false
  return error.includes('rejected') || error.includes('fetch first') || error.includes('non-fast-forward') || error.includes('Updates were rejected')
}

const reposNeedingPull = computed(() =>
  repoList.value.filter((r) => results.value[r.path] && !results.value[r.path].ok && isNonFastForward(results.value[r.path].error))
)

async function pullThenPush() {
  retrying.value = true
  for (const r of reposNeedingPull.value) {
    results.value[r.path] = { ok: false, error: 'A fazer pull...' }
    try {
      await window.electron.git.pull(r.path, 'merge')
      await gitStore.refresh(r.path)
      await window.electron.git.push(r.path)
      await gitStore.refresh(r.path)
      results.value[r.path] = { ok: true }
    } catch (e: any) {
      const msg: string = e?.message ?? 'Erro'
      results.value[r.path] = {
        ok: false,
        error: msg.includes('stderr:') ? msg.split('stderr:').pop()?.trim() : msg,
      }
    }
  }
  retrying.value = false
}

function syncDotClass(path: string) {
  const a = ahead(path), b = behind(path)
  if (a > 0 && b > 0) return 'bg-primary'
  if (a > 0) return 'bg-primary'
  if (b > 0) return 'bg-info'
  return 'bg-muted-foreground/50'
}

function resultClass(path: string) {
  if (!results.value[path]) return ''
  return results.value[path].ok
    ? '!border-success/40 !bg-success/5'
    : '!border-destructive/40 !bg-destructive/5'
}

async function runAll() {
  running.value = true
  results.value = {}

  await Promise.allSettled(
    repoList.value.map(async (r) => {
      try {
        if (props.op === 'push') await window.electron.git.push(r.path)
        else                     await window.electron.git.pull(r.path)
        await gitStore.refresh(r.path)
        results.value[r.path] = { ok: true }
      } catch (e: any) {
        const msg: string = e?.message ?? 'Erro'
        results.value[r.path] = {
          ok: false,
          error: msg.includes('stderr:') ? msg.split('stderr:').pop()?.trim() : msg,
        }
        await gitStore.refresh(r.path)
      }
    })
  )

  running.value = false
  done.value    = true

  gitStore.clearSelection()
}
</script>
