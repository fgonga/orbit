<template>
  <div class="flex-shrink-0 flex flex-col h-full overflow-hidden bg-background text-foreground relative min-w-[260px] outline-none" tabindex="0" @keydown="onKeydown">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 border-b bg-card flex-shrink-0">
      <span class="font-bold text-[13px] flex-1 truncate">{{ headerTitle }}</span>
      <Button
        v-if="localStore.localView !== 'saved' && localStore.localView !== 'draft' && localStore.selectedListaId"
        variant="ghost" size="icon-xs" :title="t('localIssues.newIssue')"
        @click="showCreateModal = true"
      >
        <Plus class="h-3.5 w-3.5" />
      </Button>
    </div>

    <!-- Search bar -->
    <div class="flex items-center h-10 flex-shrink-0 bg-card border-b px-1.5 gap-1.5 transition-colors" :class="{ '!border-b-primary': searchFocused }">
      <Search class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-1" />
      <input
        ref="searchRef"
        v-model="search"
        class="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
        :placeholder="t('localIssues.searchPlaceholder')"
        @focus="searchFocused = true"
        @blur="searchFocused = false"
      />
      <button v-if="search" class="p-1 flex items-center text-muted-foreground hover:text-foreground transition-colors" @click="search = ''">
        <X class="h-3 w-3" :stroke-width="2.5" />
      </button>
    </div>

    <!-- State filter tabs (only in lista view) -->
    <div v-if="localStore.localView === 'lista'" class="flex items-center border-b flex-shrink-0 bg-card">
      <button
        v-for="tab in tabs" :key="tab.value"
        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold transition-colors border-b-2"
        :class="localStore.stateFilter === tab.value
          ? 'border-b-primary text-primary'
          : 'border-b-transparent text-muted-foreground hover:text-foreground'"
        @click="localStore.stateFilter = tab.value"
      >
        <component :is="tab.icon" class="h-3 w-3" :stroke-width="2.5" />
        {{ tab.label }}
        <span v-if="tab.count > 0" class="px-1.5 py-px rounded-full text-[10px] bg-muted text-muted-foreground">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="localStore.loading" class="flex-1 flex items-center justify-center">
      <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
    </div>

    <!-- No lista selected -->
    <div v-else-if="localStore.localView === 'lista' && !localStore.selectedListaId" class="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground text-xs">
      <ListChecks class="h-8 w-8 opacity-30" :stroke-width="1" />
      <span>{{ t('localIssues.emptyLista') }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="!displayIssues.length" class="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground text-xs">
      <CircleDot class="h-8 w-8 opacity-30" :stroke-width="1" />
      <span>{{ t('localIssues.empty') }}</span>
      <Button v-if="localStore.localView === 'lista' && localStore.selectedListaId" size="xs" variant="outline" @click="showCreateModal = true">
        <Plus class="h-3 w-3" />
        {{ t('localIssues.newIssue') }}
      </Button>
    </div>

    <!-- Issue list -->
    <div v-else ref="listRef" class="flex-1 overflow-y-auto relative">
      <button
        v-for="(issue, idx) in displayIssues"
        :key="issue.id"
        class="group flex flex-col gap-1 py-2.5 px-3 w-full text-left border-l-2 border-transparent border-b border-border/20 transition-colors hover:bg-accent/40"
        :class="[
          localStore.selectedIssueId === issue.id && 'bg-primary/10 border-l-primary',
          focusedIndex === idx && localStore.selectedIssueId !== issue.id && 'outline outline-1 outline-primary/30',
          issue.state === 'closed' && 'opacity-60',
        ]"
        @click="selectIssue(issue.id, idx)"
      >
        <!-- Row 1: bookmark + number + recent dot + comment count + time -->
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <button
            class="p-px flex items-center opacity-0 group-hover:opacity-100 transition-all hover:!text-primary"
            :class="{ '!opacity-100 !text-primary': issue.starred }"
            @click.stop="toggleSaved(issue)"
          >
            <Bookmark class="h-3 w-3" :fill="issue.starred ? 'currentColor' : 'none'" />
          </button>
          <span class="font-semibold flex items-center gap-1" :class="{ 'text-primary': localStore.selectedIssueId === issue.id }">
            <span v-if="isRecent(issue)" class="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
            #{{ issue.number }}
          </span>
          <span v-if="issue.comments.length" class="flex items-center gap-0.5 text-[10px] ml-auto mr-1">
            <MessageSquare class="h-2.5 w-2.5" />
            {{ issue.comments.length }}
          </span>
          <span class="text-[10px] whitespace-nowrap" :class="{ 'ml-auto': !issue.comments.length }">{{ timeAgo(issue.updatedAt) }}</span>
        </div>
        <!-- Row 2: state icon + title -->
        <div class="flex items-start gap-1.5 text-sm font-medium leading-snug">
          <CircleDot v-if="issue.state === 'open'" class="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-success" />
          <CheckCircle v-else class="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
          <span
            class="overflow-hidden line-clamp-2"
            :class="[
              localStore.selectedIssueId === issue.id && 'text-primary font-semibold',
              issue.state === 'closed' && 'text-muted-foreground',
              issue.starred && localStore.selectedIssueId !== issue.id && 'text-primary/80',
            ]"
          >{{ issue.title }}</span>
        </div>
        <!-- Row 3: priority + labels -->
        <div v-if="issue.priority !== 'none' || issue.labels.length" class="flex items-center gap-1 flex-wrap pl-[19px]">
          <span
            v-if="issue.priority !== 'none'"
            class="text-[10px] px-1.5 py-px rounded-full font-semibold border"
            :class="priorityClass(issue.priority)"
          >{{ t(`localIssues.priority${capitalize(issue.priority)}`) }}</span>
          <span
            v-for="l in issue.labels.slice(0, 3)" :key="l"
            class="text-[10px] px-1.5 py-px rounded-full font-semibold bg-muted text-muted-foreground border border-border/50"
          >{{ l }}</span>
        </div>
      </button>
    </div>
  </div>

  <!-- Create modal -->
  <CreateLocalIssueModal v-model="showCreateModal" />
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalIssuesStore } from '@/stores/localIssues'
import type { LocalIssue } from '@/stores/localIssues'
import { Button } from '@/components/ui/button'
import CreateLocalIssueModal from '@/components/modals/CreateLocalIssueModal.vue'
import { Plus, Search, X, Loader2, CircleDot, CheckCircle, MessageSquare, Bookmark, ListChecks } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localStore = useLocalIssuesStore()

const search          = ref('')
const searchFocused   = ref(false)
const showCreateModal = ref(false)
const searchRef       = ref<HTMLInputElement | null>(null)
const listRef         = ref<HTMLElement | null>(null)
const focusedIndex    = ref(-1)

const headerTitle = computed(() => {
  if (localStore.localView === 'saved')  return t('localIssues.savedIssues')
  if (localStore.localView === 'draft')  return t('localIssues.drafts')
  return localStore.selectedLista?.label ?? t('localIssues.localMode')
})

const tabs = computed(() => [
  { value: 'open'   as const, label: t('localIssues.openTab'),   icon: CircleDot,   count: localStore.openCount },
  { value: 'closed' as const, label: t('localIssues.closedTab'), icon: CheckCircle, count: localStore.closedCount },
  { value: 'all'    as const, label: t('localIssues.allTab'),    icon: CircleDot,   count: (localStore.selectedLista?.issues ?? []).length },
])

const displayIssues = computed(() => {
  const q = search.value.toLowerCase().trim()
  return localStore.currentIssues.filter(i =>
    !q || i.title.toLowerCase().includes(q) || String(i.number).includes(q)
  )
})

function selectIssue(id: string, idx: number) {
  focusedIndex.value = idx
  localStore.selectIssue(id)
}

function toggleSaved(issue: LocalIssue) {
  localStore.updateIssue(issue.id, { starred: !issue.starred })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === '/') { e.preventDefault(); searchRef.value?.focus(); return }
  if (e.key === 'Escape') { search.value = ''; return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex.value = Math.min(focusedIndex.value + 1, displayIssues.value.length - 1)
    scrollToFocused()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
    scrollToFocused()
  } else if (e.key === 'Enter' && focusedIndex.value >= 0) {
    const issue = displayIssues.value[focusedIndex.value]
    if (issue) localStore.selectIssue(issue.id)
  }
}

function scrollToFocused() {
  nextTick(() => {
    const el = listRef.value?.querySelectorAll('button')[focusedIndex.value] as HTMLElement
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

function isRecent(issue: LocalIssue) {
  return (Date.now() - issue.updatedAt) < 24 * 60 * 60 * 1000
}

function priorityClass(p: string) {
  if (p === 'high')   return 'bg-destructive/15 text-destructive border-destructive/30'
  if (p === 'medium') return 'bg-warning/15 text-warning border-warning/30'
  if (p === 'low')    return 'bg-info/15 text-info border-info/30'
  return 'bg-muted text-muted-foreground border-border'
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

function timeAgo(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('common.now')
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  if (m < 10080) return `${Math.floor(m / 1440)}d`
  return new Date(ts).toLocaleDateString(locale.value, { day: '2-digit', month: 'short' })
}
</script>
