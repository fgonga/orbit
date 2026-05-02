<template>
  <div
    class="fixed inset-0 bg-black/55 z-[1000] flex items-stretch justify-end"
    @click.self="gitStore.closeDiff()"
  >
    <div class="w-[min(760px,82vw)] h-full flex flex-col bg-background border-l shadow-[-6px_0_32px_rgba(0,0,0,.5)] animate-slide-in-right">
      <!-- Header -->
      <div class="flex items-center gap-2 px-3 py-2 border-b bg-card flex-shrink-0">
        <FileText class="h-4 w-4 flex-shrink-0" />
        <span class="font-semibold truncate flex-1" :title="pane.file">{{ pane.file }}</span>

        <!-- Staged / working tree toggle -->
        <div class="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <button
            class="px-2 py-1 rounded text-xs transition-colors"
            :class="!pane.staged ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'"
            @click="setStaged(false)"
          >{{ t('diffViewer.working') }}</button>
          <button
            class="px-2 py-1 rounded text-xs transition-colors"
            :class="pane.staged ? 'bg-success text-success-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'"
            @click="setStaged(true)"
          >{{ t('diffViewer.staged') }}</button>
        </div>

        <Button v-if="!pane.staged" variant="success" size="sm" :title="t('diffViewer.stageFileTitle')" @click="stageFile">
          + {{ t('diffViewer.staged') }}
        </Button>
        <Button v-else variant="secondary" size="sm" class="bg-warning/20 text-warning hover:bg-warning/30" :title="t('diffViewer.unstageFileTitle')" @click="unstageFile">
          − {{ t('diffViewer.staged') }}
        </Button>

        <Button variant="ghost" size="icon-sm" @click="gitStore.closeDiff()">
          <X class="h-4 w-4" />
        </Button>
      </div>

      <!-- Stats bar -->
      <div class="flex items-center gap-3 px-3 py-1 border-b bg-card/60 flex-shrink-0 text-xs">
        <span class="text-success font-semibold">+{{ stats.additions }}</span>
        <span class="text-destructive font-semibold">-{{ stats.deletions }}</span>
        <span class="text-muted-foreground ml-auto">{{ t('diffViewer.linesN', { n: parsedLines.length }) }}</span>
        <div class="flex gap-0 h-2 w-20 rounded overflow-hidden bg-muted">
          <div class="bg-success" :style="{ width: stats.addPct + '%' }"></div>
          <div class="bg-destructive" :style="{ width: stats.delPct + '%' }"></div>
        </div>
      </div>

      <!-- Diff content -->
      <div ref="contentRef" class="flex-1 overflow-auto bg-background font-mono text-xs">
        <div v-if="loading" class="text-muted-foreground p-3">{{ t('diffViewer.loading') }}</div>
        <div v-else-if="!pane.diff.trim()" class="text-muted-foreground p-3">{{ t('diffViewer.noDifferences') }}</div>
        <table v-else class="w-full border-collapse">
          <tbody>
            <tr v-for="(line, i) in parsedLines" :key="i" :class="rowBgClass(line.type)">
              <td class="select-none pr-3 text-right w-10 opacity-40 text-[10px] text-muted-foreground">
                {{ line.type !== 'hunk' ? i + 1 : '' }}
              </td>
              <td class="select-none pr-2 w-[14px] opacity-70" :class="signColorClass(line.type)">
                {{ lineSign(line.type) }}
              </td>
              <td class="pr-3 whitespace-pre leading-relaxed" :class="contentColorClass(line.type)">
                {{ line.content }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import { Button } from '@/components/ui/button'
import { FileText, X } from 'lucide-vue-next'

const { t } = useI18n()
const gitStore = useGitStore()
const contentRef = ref<HTMLElement | null>(null)
const loading = ref(false)

const pane = computed(() => gitStore.diffPane!)

type LineType = 'add' | 'remove' | 'hunk' | 'context'
interface DiffLine { content: string; type: LineType }

const parsedLines = computed<DiffLine[]>(() => {
  if (!pane.value?.diff) return []
  return pane.value.diff.split('\n').map((line) => ({
    content: line.startsWith('+') || line.startsWith('-') ? line.slice(1) : line,
    type: line.startsWith('+') ? 'add'
      : line.startsWith('-') ? 'remove'
      : line.startsWith('@@') ? 'hunk'
      : 'context',
  }))
})

const stats = computed(() => {
  const additions = parsedLines.value.filter((l) => l.type === 'add').length
  const deletions = parsedLines.value.filter((l) => l.type === 'remove').length
  const total = additions + deletions || 1
  return {
    additions, deletions,
    addPct: Math.round((additions / total) * 100),
    delPct: Math.round((deletions / total) * 100),
  }
})

function rowBgClass(type: LineType) {
  if (type === 'add') return 'bg-success/10'
  if (type === 'remove') return 'bg-destructive/10'
  if (type === 'hunk') return 'bg-info/10'
  return ''
}

function signColorClass(type: LineType) {
  if (type === 'add') return 'text-success'
  if (type === 'remove') return 'text-destructive'
  if (type === 'hunk') return 'text-info'
  return ''
}

function contentColorClass(type: LineType) {
  if (type === 'add') return 'text-success'
  if (type === 'remove') return 'text-destructive'
  if (type === 'hunk') return 'text-info italic'
  return 'text-foreground/80'
}

function lineSign(type: LineType) {
  if (type === 'add') return '+'
  if (type === 'remove') return '−'
  if (type === 'hunk') return '⋯'
  return ' '
}

async function setStaged(staged: boolean) {
  if (!pane.value || pane.value.staged === staged) return
  loading.value = true
  await gitStore.showDiff(pane.value.repoPath, pane.value.file, staged)
  loading.value = false
  contentRef.value?.scrollTo(0, 0)
}

async function stageFile() {
  if (!pane.value) return
  await window.electron.git.stage(pane.value.repoPath, [pane.value.file])
  await gitStore.refresh(pane.value.repoPath)
  await setStaged(true)
}

async function unstageFile() {
  if (!pane.value) return
  await window.electron.git.unstage(pane.value.repoPath, [pane.value.file])
  await gitStore.refresh(pane.value.repoPath)
  await setStaged(false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') gitStore.closeDiff()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

watch(() => pane.value?.file, () => contentRef.value?.scrollTo(0, 0))
</script>
