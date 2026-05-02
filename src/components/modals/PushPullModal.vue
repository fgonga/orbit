<template>
  <Modal v-model="open" :title="op === 'push' ? t('modals.pushPull.titlePush') : t('modals.pushPull.titlePull')" width="520px">
    <template #icon>
      <ArrowUp v-if="op === 'push'" class="h-4 w-4 text-primary" />
      <ArrowDown v-else class="h-4 w-4 text-info" />
    </template>

    <!-- Running -->
    <div v-if="status === 'running'" class="flex flex-col items-center py-6">
      <Loader2 class="h-6 w-6 animate-spin text-primary mb-3" />
      <div class="text-muted-foreground">{{ t('modals.pushPull.running', { op }) }}</div>
    </div>

    <!-- Result -->
    <div v-else-if="status !== 'idle'" class="flex flex-col gap-3">
      <div
        class="flex items-center gap-3.5 p-4 rounded-lg text-sm"
        :class="status === 'ok' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'"
      >
        <Check v-if="status === 'ok'" class="h-5 w-5" :stroke-width="2.5" />
        <AlertCircle v-else class="h-5 w-5" />
        <div>
          <div class="font-bold">{{ status === 'ok' ? (op === 'push' ? t('modals.pushPull.pushDone') : t('modals.pushPull.pullDone')) : errorTitle }}</div>
          <div v-if="status === 'ok'" class="text-xs opacity-70">
            {{ op === 'push' ? t('modals.pushPull.pushDoneDetail', { repo: repoLabel }) : t('modals.pushPull.pullDoneDetail', { repo: repoLabel }) }}
          </div>
          <div v-else class="text-xs opacity-85 mt-1">{{ errorExplanation }}</div>
        </div>
      </div>

      <div v-if="hasConflicts" class="flex gap-2.5 items-start p-3 rounded-lg bg-warning/10 border border-warning/25 text-foreground">
        <AlertCircle class="h-3.5 w-3.5 flex-shrink-0 text-warning mt-0.5" />
        <div>
          <div class="font-semibold text-xs">{{ t('modals.pushPull.conflictsHowTo') }}</div>
          <ol class="text-[11px] opacity-85 mt-1.5 pl-4 space-y-0.5 list-decimal">
            <li>
              <i18n-t keypath="modals.pushPull.conflictsStep1">
                <template #panel><strong>{{ t('dashboard.changes') }}</strong></template>
              </i18n-t>
            </li>
            <li>
              <i18n-t keypath="modals.pushPull.conflictsStep2">
                <template #marker><code class="text-[10px] bg-muted px-1 rounded">&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code></template>
              </i18n-t>
            </li>
            <li>{{ t('modals.pushPull.conflictsStep3') }}</li>
            <li>{{ t('modals.pushPull.conflictsStep4') }}</li>
            <li>{{ t('modals.pushPull.conflictsStep5') }}</li>
          </ol>
        </div>
      </div>

      <div v-if="needsPullFirst" class="flex gap-2.5 items-start p-3 rounded-lg bg-info/10 border border-info/20">
        <AlertCircle class="h-3.5 w-3.5 flex-shrink-0 text-info mt-0.5" />
        <div>
          <div class="font-semibold text-xs">{{ t('modals.pushPull.pullFirst') }}</div>
          <div class="text-[11px] opacity-70 mt-0.5">{{ t('modals.pushPull.pullFirstHint') }}</div>
        </div>
      </div>

      <details v-if="output" class="flex flex-col gap-1.5">
        <summary class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground">{{ t('modals.pushPull.showFullOutput') }}</summary>
        <pre class="bg-background border rounded-lg p-2.5 text-[11px] font-mono text-muted-foreground max-h-[180px] overflow-y-auto whitespace-pre-wrap m-0">{{ output }}</pre>
      </details>

      <div v-if="status === 'ok' && afterState" class="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-muted/40 border">
        <GitBranch class="h-3 w-3 text-muted-foreground" />
        <span>{{ afterState.branches?.current }}</span>
        <span v-if="afterState.status?.ahead" class="text-[11px] px-2 py-px rounded-full font-semibold bg-info/15 text-info">+{{ afterState.status.ahead }} {{ t('modals.pushPull.syncBadgeSubir') }}</span>
        <span v-if="afterState.status?.behind" class="text-[11px] px-2 py-px rounded-full font-semibold bg-warning/15 text-warning">-{{ afterState.status.behind }} {{ t('modals.pushPull.syncBadgePuxar') }}</span>
        <span v-if="!afterState.status?.ahead && !afterState.status?.behind" class="text-[11px] px-2 py-px rounded-full font-semibold bg-success/15 text-success">{{ t('modals.pushPull.syncBadgeSync') }}</span>
      </div>
    </div>

    <!-- Confirmar -->
    <div v-else class="flex flex-col gap-4">
      <p class="text-muted-foreground m-0 text-sm">
        {{ op === 'push' ? t('modals.pushPull.submitPush') : t('modals.pushPull.submitPull') }}
      </p>

      <div class="flex flex-col gap-2.5 p-3.5 rounded-lg bg-muted/40 border">
        <div class="flex items-center gap-2 text-[13px]">
          <GitBranch class="h-3 w-3 text-muted-foreground" />
          <span class="font-semibold">{{ repoLabel }}</span>
          <span class="text-[11px] text-muted-foreground">{{ state?.branches?.current }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <div v-if="syncInfo.ahead" class="flex items-center gap-2 text-[13px] font-semibold py-1 text-primary">
            <ArrowUp class="h-3 w-3" :stroke-width="2.5" />
            {{ t('modals.pushPull.commitsToSubmit', { n: syncInfo.ahead }) }}
          </div>
          <div v-if="syncInfo.behind" class="flex items-center gap-2 text-[13px] font-semibold py-1 text-info">
            <ArrowDown class="h-3 w-3" :stroke-width="2.5" />
            {{ t('modals.pushPull.commitsToReceive', { n: syncInfo.behind }) }}
          </div>
          <div v-if="!syncInfo.ahead && !syncInfo.behind" class="flex items-center gap-2 text-xs py-1 text-success">
            {{ t('modals.pushPull.alreadySynced') }}
          </div>
        </div>
      </div>

      <!-- Seletor de estratégia -->
      <div v-if="op === 'pull' && isDiverged" class="flex flex-col gap-2.5 p-3.5 rounded-lg bg-warning/5 border border-warning/25">
        <div class="flex items-center gap-1.5 text-[13px] font-semibold">
          <GitBranch class="h-3 w-3 text-primary" />
          {{ t('modals.pushPull.strategyLabel') }}
        </div>

        <div class="flex flex-col gap-1.5">
          <label
            v-for="opt in strategyOptions"
            :key="opt.value"
            class="flex items-start gap-2.5 p-2.5 rounded-md cursor-pointer border bg-background transition-colors hover:border-primary"
            :class="{ '!border-primary bg-primary/10': pullStrategy === opt.value }"
          >
            <input type="radio" v-model="pullStrategy" :value="opt.value" class="mt-0.5 flex-shrink-0 accent-primary" />
            <div>
              <div class="text-[13px] font-semibold">{{ opt.name }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5 leading-snug">{{ opt.desc }}</div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" size="sm" @click="open = false">{{ status !== 'idle' ? t('common.close') : t('common.cancel') }}</Button>
      <Button v-if="needsPullFirst" variant="success" size="sm" :disabled="pullingFirst" @click="pullFirst">
        <Loader2 v-if="pullingFirst" class="h-3.5 w-3.5 animate-spin" />
        {{ t('modals.pushPull.pullAndRetry') }}
      </Button>
      <Button
        v-else-if="status === 'idle'"
        :variant="op === 'push' ? 'default' : 'success'"
        size="sm"
        :disabled="(op === 'push' ? syncInfo.ahead === 0 : syncInfo.behind === 0) || status === 'running'"
        @click="run"
      >
        {{ op === 'push' ? t('modals.pushPull.titlePush') : t('modals.pushPull.titlePull') }}
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
import { ArrowUp, ArrowDown, Check, AlertCircle, Loader2, GitBranch } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean; repoPath: string; op: 'push' | 'pull' }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean]; done: [] }>()

const { t } = useI18n()
const gitStore     = useGitStore()
const projectStore = useProjectStore()

const strategyOptions = computed(() => [
  { value: 'merge',    name: t('modals.pushPull.merge'),    desc: t('modals.pushPull.mergeDesc') },
  { value: 'rebase',   name: t('modals.pushPull.rebase'),   desc: t('modals.pushPull.rebaseDesc') },
  { value: 'ff-only',  name: t('modals.pushPull.ffOnly'),   desc: t('modals.pushPull.ffOnlyDesc') },
] as const)

const open       = ref(props.modelValue)
const status     = ref<'idle' | 'running' | 'ok' | 'error'>('idle')
const output     = ref('')
const afterState = ref<any>(null)
const pullingFirst = ref(false)

const needsPullFirst = computed(() =>
  status.value === 'error' &&
  props.op === 'push' &&
  (output.value.includes('fetch first') ||
   output.value.includes('rejected') ||
   output.value.includes('Updates were rejected'))
)

const hasConflicts = computed(() =>
  status.value === 'error' && (
    output.value.includes('unmerged files') ||
    output.value.includes('unresolved conflict') ||
    output.value.includes('Merge conflict')
  )
)

const errorTitle = computed(() => {
  if (hasConflicts.value)   return t('modals.pushPull.conflictsTitle')
  if (needsPullFirst.value) return t('modals.pushPull.rejectedTitle')
  return t('modals.pushPull.errorTitle')
})

const errorExplanation = computed(() => {
  if (hasConflicts.value)   return t('modals.pushPull.errConflicts')
  if (needsPullFirst.value) return t('modals.pushPull.errNonFastForward')
  if (output.value.includes('Authentication') || output.value.includes('403')) return t('modals.pushPull.errAuth')
  if (output.value.includes('not found') || output.value.includes('404')) return t('modals.pushPull.errNotFound')
  return t('modals.pushPull.errGeneric')
})

watch(() => props.modelValue, (v) => {
  open.value = v
  if (v) { status.value = 'idle'; output.value = ''; afterState.value = null }
})
watch(open, (v) => emit('update:modelValue', v))

const state = computed(() => gitStore.repos[props.repoPath])
const syncInfo = computed(() => ({ ahead: state.value?.status?.ahead ?? 0, behind: state.value?.status?.behind ?? 0 }))
const isDiverged = computed(() => props.op === 'pull')
const pullStrategy = ref<'merge' | 'rebase' | 'ff-only'>('merge')

const repoLabel = computed(() => {
  for (const g of projectStore.current?.groups ?? []) {
    const r = g.repos.find((r) => r.path === props.repoPath)
    if (r) return r.label
  }
  return props.repoPath.split('/').pop() ?? props.repoPath
})

async function pullFirst() {
  pullingFirst.value = true
  try {
    await window.electron.git.pull(props.repoPath, 'merge')
    await gitStore.refresh(props.repoPath)
    status.value = 'idle'
    output.value = ''
    await run()
  } catch (e: any) {
    const msg: string = e?.message ?? t('modals.pushPull.errorFallback')
    output.value = msg.includes('stderr:') ? msg.split('stderr:').pop()?.trim() ?? msg : msg
    status.value = 'error'
  } finally {
    pullingFirst.value = false
  }
}

async function run() {
  status.value = 'running'
  output.value = ''
  try {
    if (props.op === 'push') await window.electron.git.push(props.repoPath)
    else await window.electron.git.pull(props.repoPath, pullStrategy.value)

    await gitStore.refresh(props.repoPath)
    afterState.value = gitStore.repos[props.repoPath]

    status.value = 'ok'
    gitStore.selectedRepos.delete(props.repoPath)
    emit('done')
  } catch (e: any) {
    const msg: string = e?.message ?? t('modals.pushPull.errorFallback')
    output.value = msg.includes('stderr:') ? msg.split('stderr:').pop()?.trim() ?? msg : msg
    status.value = 'error'
    await gitStore.refresh(props.repoPath)
  }
}
</script>
