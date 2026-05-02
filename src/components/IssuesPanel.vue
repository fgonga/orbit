<template>
  <div class="flex-shrink-0 flex flex-col h-full overflow-hidden bg-background text-foreground relative min-w-[260px] outline-none" tabindex="0" @keydown="onKeydown">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2 border-b bg-card flex-shrink-0">
      <span class="font-bold text-[13px] flex-1 truncate">
        {{ props.view === 'saved' ? t('issues.savedIssues')
         : props.view === 'drafts' ? t('issues.drafts')
         : props.view === 'unread' ? t('issues.unread')
         : props.view === 'participating' ? t('issues.participating')
         : repoLabel }}
      </span>
      <span v-if="props.view === 'repo' && cacheAge" class="text-[10px] text-muted-foreground bg-muted px-1.5 py-px rounded-full whitespace-nowrap">
        {{ cacheAge }}
      </span>
      <Button v-if="props.view === 'repo'" variant="ghost" size="icon-xs" :title="t('issues.reload')" @click="reload">
        <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': ghStore.loadingRepos[repoPath] }" />
      </Button>
    </div>

    <!-- Notifications -->
    <template v-if="props.view === 'unread' || props.view === 'participating'">
      <div v-if="ghStore.notifLoading" class="flex-1 flex items-center justify-center py-6">
        <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
      <div v-else-if="notifList.length === 0" class="flex-1 flex items-center justify-center py-6 text-muted-foreground text-sm">{{ t('issues.noNotifications') }}</div>
      <div v-else class="flex-1 overflow-y-auto">
        <button v-for="n in notifList" :key="n.id" class="flex items-start gap-2.5 py-2.5 px-3.5 w-full text-left border-b border-border/20 hover:bg-accent/40 transition-colors" @click="openNotif(n)">
          <div class="w-2 h-2 rounded-full flex-shrink-0 mt-1" :class="n.unread ? 'bg-primary' : 'bg-muted-foreground/40'" />
          <div class="flex-1 overflow-hidden">
            <div class="text-[13px] font-medium truncate">{{ n.subject.title }}</div>
            <div class="text-[11px] text-muted-foreground mt-0.5">{{ n.repository.full_name }} · {{ timeAgo(n.updated_at) }}</div>
          </div>
        </button>
      </div>
    </template>

    <!-- Drafts -->
    <template v-else-if="props.view === 'drafts'">
      <div v-if="!draftEntries.length" class="flex-1 flex items-center justify-center py-6 text-muted-foreground text-sm">{{ t('issues.noDrafts') }}</div>
      <div v-else class="flex-1 overflow-y-auto">
        <button v-for="d in draftEntries" :key="d.key" class="flex items-start gap-2.5 py-2.5 px-3.5 w-full text-left border-b border-border/20 hover:bg-accent/40 transition-colors" @click="openDraft(d)">
          <div class="flex-1 overflow-hidden">
            <div class="text-[13px] font-medium truncate">{{ d.text.slice(0, 80) }}</div>
            <div class="text-[11px] text-muted-foreground mt-0.5">{{ d.repoLabel }} · Issue #{{ d.issueNumber }}</div>
          </div>
        </button>
      </div>
    </template>

    <!-- Search bar -->
    <div class="flex items-center h-10 flex-shrink-0 bg-card border-b px-1.5 gap-1.5 transition-colors" :class="{ '!border-b-primary': searchFocused }">
      <Search class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-1" />
      <input
        ref="searchRef"
        v-model="search"
        class="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
        :placeholder="t('issues.searchPlaceholder')"
        @focus="searchFocused = true"
        @blur="searchFocused = false"
      />
      <button v-if="search" class="p-1 flex items-center text-muted-foreground hover:text-foreground transition-colors" :title="t('common.clear')" @click="search = ''">
        <X class="h-3 w-3" :stroke-width="2.5" />
      </button>
      <button
        class="p-1.5 flex items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        :class="{ 'bg-primary/15 !text-primary': hasActiveFilters }"
        :title="t('issues.filters')"
        @click="showFilters = !showFilters"
      >
        <Filter class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Active filter pills -->
    <div v-if="hasActiveFilters" class="flex items-center gap-1.5 flex-wrap px-2.5 py-1.5 border-b bg-card flex-shrink-0">
      <button v-if="filterLabel" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors" @click="filterLabel = null">
        <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: '#' + filterLabel.color }"></span>
        {{ filterLabel.name }}
        <X class="h-2.5 w-2.5" :stroke-width="2.5" />
      </button>
      <button v-if="filterAssignee" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors" @click="filterAssignee = null">
        <img :src="filterAssignee.avatar_url" class="w-3.5 h-3.5 rounded-full" />
        {{ filterAssignee.login }}
        <X class="h-2.5 w-2.5" :stroke-width="2.5" />
      </button>
      <button v-if="filterMilestone" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors" @click="filterMilestone = ''">
        <Milestone class="h-2.5 w-2.5" />
        {{ filterMilestone }}
        <X class="h-2.5 w-2.5" :stroke-width="2.5" />
      </button>
      <button class="ml-auto text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5" @click="clearFilters">{{ t('issues.clearAllFilters') }}</button>
    </div>

    <!-- Filter dropdown -->
    <div
      v-if="showFilters"
      v-click-outside="() => showFilters = false"
      class="absolute top-20 left-0 right-0 z-[200] bg-popover border shadow-xl max-h-[280px] overflow-y-auto"
    >
      <div v-if="allLabels.length" class="p-3 border-b">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{{ t('issues.label') }}</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="l in allLabels" :key="l.id"
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            :class="{ '!bg-primary/15 !border-primary !text-primary': filterLabel?.id === l.id }"
            @click="filterLabel = filterLabel?.id === l.id ? null : l; showFilters = false"
          >
            <span class="w-2 h-2 rounded-full" :style="{ background: '#' + l.color }"></span>
            {{ l.name }}
          </button>
        </div>
      </div>
      <div v-if="allAssignees.length" class="p-3 border-b">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{{ t('issues.assignee') }}</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="a in allAssignees" :key="a.login"
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            :class="{ '!bg-primary/15 !border-primary !text-primary': filterAssignee?.login === a.login }"
            @click="filterAssignee = filterAssignee?.login === a.login ? null : a; showFilters = false"
          >
            <img :src="a.avatar_url" class="w-4 h-4 rounded-full" />
            {{ a.login }}
          </button>
        </div>
      </div>
      <div v-if="allMilestones.length" class="p-3">
        <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{{ t('issues.milestone') }}</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="m in allMilestones" :key="m"
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            :class="{ '!bg-primary/15 !border-primary !text-primary': filterMilestone === m }"
            @click="filterMilestone = filterMilestone === m ? '' : m; showFilters = false"
          >{{ m }}</button>
        </div>
      </div>
    </div>

    <!-- States -->
    <div v-if="ghStore.loadingRepos[repoPath]" class="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground text-xs">
      <Loader2 class="h-4 w-4 animate-spin" />
      <span>{{ t('issues.loading') }}</span>
    </div>
    <div v-else-if="ghStore.errorRepos[repoPath]" class="flex-1 flex items-center justify-center py-6 text-destructive text-xs text-center px-4">
      {{ ghStore.errorRepos[repoPath] }}
    </div>
    <div v-else-if="!filtered.length" class="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground text-xs">
      <CircleDot class="h-8 w-8 opacity-30" :stroke-width="1" />
      <span>{{ t('issues.noIssues') }}</span>
    </div>

    <!-- Issue list grouped -->
    <div v-else ref="listRef" class="flex-1 overflow-y-auto relative">
      <template v-for="group in groupedIssues" :key="group.milestone">
        <div v-if="group.milestone" class="flex items-center gap-1.5 h-[26px] px-2.5 flex-shrink-0 bg-muted/60 border-b text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky top-0 z-10">
          <Milestone class="h-2.5 w-2.5" />
          <span>{{ group.milestone }}</span>
          <span class="ml-auto text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground">{{ group.issues.length }}</span>
        </div>

        <button
          v-for="issue in group.issues" :key="issue.number"
          class="group flex flex-col gap-1 py-2.5 px-3 w-full text-left border-l-2 border-transparent border-b border-border/20 transition-colors hover:bg-accent/40"
          :class="[
            ghStore.selectedIssue?.number === issue.number && 'bg-primary/10 border-l-primary',
            focusedIndex === flatIndex(issue) && ghStore.selectedIssue?.number !== issue.number && 'outline outline-1 outline-primary/30',
            issue.state === 'closed' && 'opacity-60',
          ]"
          @click="open(issue.number)"
        >
          <!-- Line 1 -->
          <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <button
              class="p-px flex items-center opacity-0 group-hover:opacity-100 transition-all hover:!text-primary"
              :class="{ '!opacity-100 !text-primary': starredIds.has(issue.number) }"
              @click.stop="toggleStar(issue.number)"
            >
              <Bookmark class="h-3 w-3" :fill="starredIds.has(issue.number) ? 'currentColor' : 'none'" />
            </button>
            <span class="flex items-center gap-1 font-semibold" :class="{ 'text-primary': ghStore.selectedIssue?.number === issue.number }">
              <span v-if="isRecent(issue)" class="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
              #{{ issue.number }}
            </span>
            <span v-if="issue.comments" class="flex items-center gap-0.5 text-[10px] ml-auto mr-1">
              <MessageSquare class="h-2.5 w-2.5" />
              {{ issue.comments }}
            </span>
            <span class="text-[10px] whitespace-nowrap" :class="{ 'ml-auto': !issue.comments }">{{ timeAgo(issue.updated_at) }}</span>
          </div>

          <!-- Line 2: title -->
          <div class="flex items-start gap-1.5 text-sm font-medium leading-snug">
            <CircleDot v-if="issue.state === 'open'" class="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-success" />
            <CheckCircle v-else class="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
            <span
              class="overflow-hidden line-clamp-2"
              :class="[
                ghStore.selectedIssue?.number === issue.number && 'text-primary font-semibold',
                issue.state === 'closed' && 'text-muted-foreground',
                starredIds.has(issue.number) && !( ghStore.selectedIssue?.number === issue.number) && 'text-primary/80',
              ]"
            >{{ issue.title }}</span>
          </div>

          <!-- Line 3: labels -->
          <div v-if="issue.labels.length" class="flex gap-1 flex-wrap pl-[19px]">
            <span
              v-for="l in issue.labels.slice(0, 4)" :key="l.id"
              class="text-[10px] px-1.5 py-px rounded-full font-semibold whitespace-nowrap border"
              :style="{ background: '#' + l.color + '28', color: '#' + l.color, borderColor: '#' + l.color + '55' }"
            >{{ l.name }}</span>
          </div>

          <!-- Line 4: footer -->
          <div class="flex items-center gap-1.5 pl-[19px] text-[11px] text-muted-foreground">
            <div v-if="issue.assignees.length" class="flex items-center gap-1">
              <img v-for="a in issue.assignees.slice(0,3)" :key="a.login" :src="a.avatar_url" :title="a.login" class="w-3.5 h-3.5 rounded-full object-cover -ml-[3px] border first:ml-0" />
              <span class="truncate max-w-[120px] ml-1">{{ issue.assignees.map(a => '@' + a.login).join(', ') }}</span>
            </div>
            <span v-else class="italic opacity-70">{{ t('issues.nobodyAssigned') }}</span>
            <span v-if="issue.milestone" class="flex items-center gap-1 text-[10px] whitespace-nowrap ml-auto">
              <Milestone class="h-2 w-2" />
              {{ issue.milestone.title }}
            </span>
          </div>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGithubStore } from '@/stores/github'
import { useProjectStore } from '@/stores/project'
import type { GhLabel, GhUser } from '@/stores/github'
import { Button } from '@/components/ui/button'
import {
  Search, Filter, X, RefreshCw, Loader2, CircleDot, CheckCircle,
  Bookmark, MessageSquare, Milestone,
} from 'lucide-vue-next'

const props = withDefaults(defineProps<{ view?: string }>(), { view: 'repo' })

const { t, locale } = useI18n()
const ghStore      = useGithubStore()
const projectStore = useProjectStore()

const repoPath = computed(() => ghStore.selectedRepoPath ?? '')
const issues = computed(() => {
  if (props.view === 'unread' || props.view === 'participating') return []
  if (props.view === 'saved') {
    const result: any[] = []
    for (const g of projectStore.current?.groups ?? []) {
      for (const r of g.repos) {
        const key = `gd:stars:${r.path}`
        try {
          const starred: number[] = JSON.parse(localStorage.getItem(key) ?? '[]')
          const repoIssues = ghStore.issuesByRepo[r.path] ?? []
          result.push(...repoIssues.filter(i => starred.includes(i.number)))
        } catch {}
      }
    }
    return result
  }
  if (props.view === 'drafts') return []
  return ghStore.issuesByRepo[repoPath.value] ?? []
})

const search          = ref('')
const showFilters     = ref(false)
const filterLabel     = ref<GhLabel | null>(null)
const filterAssignee  = ref<GhUser | null>(null)
const filterMilestone = ref('')
const searchRef       = ref<HTMLInputElement | null>(null)
const searchFocused   = ref(false)

const hasActiveFilters = computed(() => !!(filterLabel.value || filterAssignee.value || filterMilestone.value))

function clearFilters() {
  filterLabel.value = null
  filterAssignee.value = null
  filterMilestone.value = ''
}

const allLabels = computed(() => {
  const map = new Map<number, GhLabel>()
  for (const i of issues.value) for (const l of i.labels) map.set(l.id, l)
  return [...map.values()]
})
const allAssignees = computed(() => {
  const map = new Map<string, GhUser>()
  for (const i of issues.value) for (const a of i.assignees) map.set(a.login, a)
  return [...map.values()]
})
const allMilestones = computed(() =>
  [...new Set(issues.value.filter((i) => i.milestone).map((i) => i.milestone!.title))]
)

const filtered = computed(() => {
  let list = issues.value
  const q = search.value.toLowerCase().trim()
  if (q) list = list.filter((i) => i.title.toLowerCase().includes(q) || String(i.number).includes(q))
  if (filterLabel.value) list = list.filter((i) => i.labels.some((l) => l.id === filterLabel.value!.id))
  if (filterAssignee.value) list = list.filter((i) => i.assignees.some((a) => a.login === filterAssignee.value!.login))
  if (filterMilestone.value) list = list.filter((i) => i.milestone?.title === filterMilestone.value)
  return list
})

const groupedIssues = computed(() => {
  const starred = filtered.value.filter((i) => starredIds.value.has(i.number))
  const rest    = filtered.value.filter((i) => !starredIds.value.has(i.number))
  const groups: { milestone: string; issues: typeof rest }[] = []

  if (starred.length) groups.push({ milestone: t('issues.savedGroup'), issues: starred })

  const milestoneMap = new Map<string, typeof rest>()
  milestoneMap.set('', [])
  for (const i of rest) {
    const m = i.milestone?.title ?? ''
    if (!milestoneMap.has(m)) milestoneMap.set(m, [])
    milestoneMap.get(m)!.push(i)
  }
  for (const [m, items] of milestoneMap) if (items.length) groups.push({ milestone: m, issues: items })
  return groups
})

const flatIssues = computed(() => groupedIssues.value.flatMap((g) => g.issues))
function flatIndex(issue: any) { return flatIssues.value.findIndex((i) => i.number === issue.number) }

const starKey = computed(() => `gd:stars:${repoPath.value}`)
const starredIds = ref(new Set<number>())
watch(repoPath, loadStars, { immediate: true })

function loadStars() {
  try {
    const saved = localStorage.getItem(starKey.value)
    starredIds.value = new Set(saved ? JSON.parse(saved) : [])
  } catch { starredIds.value = new Set() }
}
function saveStars() { localStorage.setItem(starKey.value, JSON.stringify([...starredIds.value])) }
function toggleStar(number: number) {
  starredIds.value.has(number) ? starredIds.value.delete(number) : starredIds.value.add(number)
  saveStars()
}

const focusedIndex = ref(-1)
const listRef = ref<HTMLElement | null>(null)

function onKeydown(e: KeyboardEvent) {
  if (e.key === '/') { e.preventDefault(); searchRef.value?.focus(); return }
  if (e.key === 'Escape') { search.value = ''; clearFilters(); return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex.value = Math.min(focusedIndex.value + 1, flatIssues.value.length - 1)
    scrollToFocused()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
    scrollToFocused()
  } else if (e.key === 'Enter' && focusedIndex.value >= 0) {
    const issue = flatIssues.value[focusedIndex.value]
    if (issue) open(issue.number)
  }
}

function scrollToFocused() {
  nextTick(() => {
    const el = listRef.value?.querySelectorAll('button')[focusedIndex.value] as HTMLElement
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

async function open(number: number) {
  focusedIndex.value = flatIndex(flatIssues.value.find((i) => i.number === number)!)
  await ghStore.openIssue(repoPath.value, number)
}

async function reload() { await ghStore.loadIssues(repoPath.value, ghStore.issueFilter, true) }

const cacheAge = computed(() => ghStore.fetchedAt[repoPath.value] ? ghStore.cacheAge(repoPath.value) : '')

const repoLabel = computed(() => {
  for (const g of projectStore.current?.groups ?? []) {
    const r = g.repos.find((r) => r.path === repoPath.value)
    if (r) return r.label
  }
  return repoPath.value.split('/').pop() ?? repoPath.value
})

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('common.now')
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  if (m < 10080) return `${Math.floor(m / 1440)}d`
  return new Date(date).toLocaleDateString(locale.value, { day: '2-digit', month: 'short' })
}

function isRecent(issue: any) {
  return (Date.now() - new Date(issue.updated_at).getTime()) < 24 * 60 * 60 * 1000
}

const notifList = computed(() =>
  props.view === 'participating' ? ghStore.participatingNotifs : ghStore.notifications.filter(n => n.unread)
)

async function openNotif(n: any) {
  await window.electron.shell.openExternal(n.repository.html_url + '/issues')
  window.electron.github.markNotificationRead(n.id)
}

const draftEntries = computed(() => {
  ghStore.loadDrafts()
  return Object.entries(ghStore.drafts).map(([key, text]) => {
    const [repoPath, issueNum] = key.split(':')
    const issueNumber = Number(issueNum)
    let repoLabel = repoPath.split('/').pop() ?? repoPath
    for (const g of projectStore.current?.groups ?? []) {
      const r = g.repos.find(r => r.path === repoPath)
      if (r) { repoLabel = r.label; break }
    }
    return { key, text, repoPath, issueNumber, repoLabel }
  })
})

async function openDraft(d: any) {
  ghStore.selectedRepoPath = d.repoPath
  await ghStore.openIssue(d.repoPath, d.issueNumber)
}

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (e: MouseEvent) => { if (!el.contains(e.target as Node)) binding.value(e) }
    document.addEventListener('mousedown', el._clickOutside)
  },
  unmounted(el: any) { document.removeEventListener('mousedown', el._clickOutside) },
}
</script>
