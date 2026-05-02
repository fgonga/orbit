<template>
  <div class="w-[200px] flex-shrink-0 flex flex-col h-full overflow-hidden bg-card border-r text-[13px] text-foreground">

    <!-- Mode toggle -->
    <div class="flex p-1.5 gap-1 border-b bg-muted/40 flex-shrink-0">
      <button
        class="flex-1 py-1 rounded text-[11px] font-semibold transition-colors"
        :class="mode === 'local' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        @click="setMode('local')"
      >{{ t('localIssues.localMode') }}</button>
      <button
        class="flex-1 py-1 rounded text-[11px] font-semibold transition-colors"
        :class="mode === 'remote' ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
        @click="setMode('remote')"
      >{{ t('localIssues.remoteMode') }}</button>
    </div>

    <!-- ── LOCAL MODE ─────────────────────────────────────── -->
    <template v-if="mode === 'local'">
      <!-- Saved + Drafts (top) -->
      <div class="p-2 flex flex-col gap-px flex-shrink-0">
        <button
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          :class="{ '!text-primary font-semibold bg-primary/10': localStore.localView === 'saved' }"
          @click="localStore.localView = 'saved'; localStore.selectedIssueId = null"
        >
          <Bookmark class="h-3.5 w-3.5" />
          {{ t('localIssues.savedIssues') }}
          <span v-if="localStore.savedCount > 0" class="ml-auto text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">{{ localStore.savedCount }}</span>
        </button>
        <button
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          :class="{ '!text-primary font-semibold bg-primary/10': localStore.localView === 'draft' }"
          @click="localStore.localView = 'draft'; localStore.selectedIssueId = null"
        >
          <FileEdit class="h-3.5 w-3.5" />
          {{ t('localIssues.drafts') }}
          <span v-if="localStore.draftCount > 0" class="ml-auto text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">{{ localStore.draftCount }}</span>
        </button>
      </div>

      <!-- Groups label -->
      <div class="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-shrink-0">
        {{ t('localIssues.groups') }}
      </div>

      <!-- Groups + Listas tree -->
      <div class="flex-1 overflow-y-auto pb-1">
        <VueDraggable
          v-model="localStore.groups"
          handle=".group-drag-handle"
          :animation="160"
          @end="localStore.reorderGroups()"
        >
        <template v-for="group in localStore.groups" :key="group.id">
          <!-- Group header -->
          <div
            class="group/ghdr flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none text-xs font-bold hover:bg-accent/30 transition-colors border-t first:border-t-0"
            @click="localStore.toggleGroup(group.id)"
          >
            <GripVertical class="group-drag-handle h-3 w-3 flex-shrink-0 opacity-30 cursor-grab hover:opacity-80 transition-opacity" />
            <ChevronDown class="h-3 w-3 transition-transform flex-shrink-0" :class="{ '-rotate-90': group.collapsed }" />
            <span v-if="renamingGroupId !== group.id" class="flex-1 truncate" @dblclick.stop="startRenameGroup(group.id, group.label)">{{ group.label }}</span>
            <input
              v-else
              :ref="el => { if (el) renameGroupRef = el as HTMLInputElement }"
              v-model="renameGroupVal"
              class="flex-1 bg-background border border-primary rounded px-1 py-px text-xs outline-none"
              @click.stop
              @keydown.enter.stop="confirmRenameGroup(group.id)"
              @keydown.esc.stop="renamingGroupId = null"
              @blur="confirmRenameGroup(group.id)"
            />
            <button
              class="opacity-0 group-hover/ghdr:opacity-100 transition-all p-0.5 rounded text-muted-foreground hover:text-primary flex items-center"
              :title="t('localIssues.addLista')"
              @click.stop="startAddLista(group.id)"
            ><Plus class="h-2.5 w-2.5" /></button>
            <button
              class="opacity-0 group-hover/ghdr:opacity-100 transition-all p-0.5 rounded text-muted-foreground hover:text-destructive flex items-center"
              :title="t('localIssues.deleteGroup')"
              @click.stop="deleteGroup(group.id, group.label)"
            ><X class="h-2.5 w-2.5" /></button>
          </div>

          <!-- Listas -->
          <template v-if="!group.collapsed">
            <!-- Inline add-lista input -->
            <div v-if="addingListaGroupId === group.id" class="px-2 py-1">
              <input
                ref="addListaRef"
                v-model="addListaVal"
                class="w-full bg-background border border-primary rounded px-2 py-1 text-[11px] outline-none"
                :placeholder="t('localIssues.listaPlaceholder')"
                @keydown.enter="confirmAddLista(group.id)"
                @keydown.esc="addingListaGroupId = null"
                @blur="addingListaGroupId = null"
              />
            </div>

            <button
              v-for="lista in group.listas" :key="lista.id"
              class="group/lista flex items-center gap-1.5 w-full pl-7 pr-2 py-1.5 text-left text-muted-foreground text-[12px] border-l-2 border-transparent hover:bg-accent/40 hover:text-foreground transition-colors"
              :class="{ 'bg-primary/10 !text-primary border-l-primary font-semibold': localStore.selectedListaId === lista.id && localStore.localView === 'lista' }"
              @click="localStore.selectLista(group.id, lista.id)"
            >
              <ListChecks class="h-3 w-3 flex-shrink-0 opacity-60" />
              <span v-if="renamingListaId !== lista.id" class="flex-1 truncate" @dblclick.stop="startRenameLista(group.id, lista.id, lista.label)">{{ lista.label }}</span>
              <input
                v-else
                :ref="el => { if (el) renameListaRef = el as HTMLInputElement }"
                v-model="renameListaVal"
                class="flex-1 bg-background border border-primary rounded px-1 py-px text-[11px] outline-none"
                @click.stop
                @keydown.enter.stop="confirmRenameLista(group.id, lista.id)"
                @keydown.esc.stop="renamingListaId = null"
                @blur="confirmRenameLista(group.id, lista.id)"
              />
              <button
                v-if="renamingListaId !== lista.id"
                class="group/ldel relative ml-auto flex items-center justify-center min-w-[20px] h-[17px] text-[10px] rounded-full flex-shrink-0 transition-all hover:bg-destructive/10 hover:text-destructive/60 cursor-pointer"
                :class="openCountLista(lista) > 0 ? 'px-1.5 bg-muted text-muted-foreground font-bold' : ''"
                :title="t('localIssues.deleteLista')"
                @click.stop="deleteLista(group.id, lista.id, lista.label)"
              >
                <span v-if="openCountLista(lista) > 0" class="group-hover/ldel:opacity-0 transition-opacity leading-none select-none">{{ openCountLista(lista) }}</span>
                <Trash2 class="absolute h-2.5 w-2.5 opacity-0 group-hover/ldel:opacity-100 transition-opacity" :stroke-width="2" />
              </button>
            </button>

            <div v-if="!group.listas.length && addingListaGroupId !== group.id" class="pl-7 py-1 text-[11px] text-muted-foreground/60 italic">
              {{ t('localIssues.noListasYet') }}
            </div>
          </template>
        </template>

        <div v-if="!localStore.groups.length" class="p-3 text-center text-xs text-muted-foreground">
          {{ t('localIssues.noGroupsYet') }}
        </div>
        </VueDraggable>
      </div>

      <!-- Add group -->
      <div class="p-2 border-t flex-shrink-0">
        <div v-if="addingGroup" class="mb-1.5">
          <input
            ref="addGroupRef"
            v-model="addGroupVal"
            class="w-full bg-background border border-primary rounded px-2 py-1 text-[11px] outline-none"
            :placeholder="t('localIssues.groupPlaceholder')"
            @keydown.enter="confirmAddGroup"
            @keydown.esc="addingGroup = false"
            @blur="addingGroup = false"
          />
        </div>
        <button
          class="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md border border-dashed border-muted-foreground/40 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
          @click="startAddGroup"
        >
          <Plus class="h-3 w-3" />
          {{ t('localIssues.addGroup') }}
        </button>
      </div>

    </template>

    <!-- ── REMOTE / GITHUB MODE ───────────────────────────── -->
    <template v-else>
      <!-- Top sections -->
      <div class="p-2 flex flex-col gap-px flex-shrink-0">
        <button
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          :class="{ '!text-primary font-semibold bg-primary/10': view === 'saved' }"
          @click="setView('saved')"
        >
          <Bookmark class="h-3.5 w-3.5" />
          {{ t('issues.savedIssues') }}
          <span class="ml-auto text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">{{ totalSaved }}</span>
        </button>
        <button
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          :class="{ '!text-primary font-semibold bg-primary/10': view === 'drafts' }"
          @click="setView('drafts')"
        >
          <FileEdit class="h-3.5 w-3.5" />
          {{ t('issues.drafts') }}
          <span v-if="draftCount" class="ml-auto text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">{{ draftCount }}</span>
        </button>
      </div>

      <!-- Notifications -->
      <template v-if="ghStore.hasToken">
        <div class="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issues.notifications') }}</div>
        <button
          class="flex items-center gap-2 w-full px-4 py-1.5 text-left text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
          :class="{ '!text-primary font-semibold bg-primary/10': view === 'unread' }"
          @click="setView('unread')"
        >
          <Bell class="h-3.5 w-3.5" />
          {{ t('issues.unread') }}
          <span v-if="ghStore.notifications.filter(n => n.unread).length" class="ml-auto text-[10px] px-1.5 py-px rounded-full bg-destructive/20 text-destructive font-bold">
            {{ ghStore.notifications.filter(n => n.unread).length }}
          </span>
        </button>
        <button
          class="flex items-center gap-2 w-full px-4 py-1.5 text-left text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
          :class="{ '!text-primary font-semibold bg-primary/10': view === 'participating' }"
          @click="setView('participating')"
        >
          <Users class="h-3.5 w-3.5" />
          {{ t('issues.participating') }}
          <span v-if="ghStore.participatingNotifs.length" class="ml-auto text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">
            {{ ghStore.participatingNotifs.length }}
          </span>
        </button>
      </template>

      <div v-if="!ghStore.hasToken" class="p-4 flex flex-col items-center gap-1.5 text-xs text-muted-foreground text-center">
        <KeyRound class="h-5 w-5 opacity-40" :stroke-width="1.5" />
        <p>{{ t('issues.tokenNeeded') }}</p>
        <Button size="xs" @click="$emit('setup-token')">{{ t('issues.setupToken') }}</Button>
      </div>

      <!-- Repos grouped by org -->
      <template v-if="ghStore.hasToken">
        <div class="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{{ t('issues.repositories') }}</div>
        <div class="flex-1 overflow-y-auto">
          <template v-for="org in orgGroups" :key="org.name">
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none text-xs font-bold hover:bg-accent/30 transition-colors" @click="toggleOrg(org.name)">
              <img v-if="org.avatarUrl" :src="org.avatarUrl" class="w-4 h-4 rounded-full object-cover flex-shrink-0" />
              <div v-else class="w-4 h-4 rounded-full bg-primary/25 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">{{ org.name[0].toUpperCase() }}</div>
              <span class="flex-1 truncate">{{ org.name }}</span>
              <ChevronDown class="h-2.5 w-2.5 ml-auto transition-transform" :class="{ '-rotate-90': collapsedOrgs.has(org.name) }" />
            </div>
            <template v-if="!collapsedOrgs.has(org.name)">
              <button
                v-for="repo in org.repos" :key="repo.id"
                class="flex items-center gap-1.5 w-full pl-8 pr-2.5 py-1.5 text-left text-muted-foreground text-xs border-l-2 border-transparent hover:bg-accent/40 hover:text-foreground transition-colors"
                :class="{ 'bg-primary/10 !text-primary border-l-primary font-semibold': ghStore.selectedRepoPath === repo.path && (view === 'repo' || !view) }"
                @click="selectRepo(repo.path)"
              >
                <span class="w-[7px] h-[7px] rounded-full flex-shrink-0" :class="dotClass(repo.path)" />
                <span class="flex-1 truncate">{{ repo.label }}</span>
                <Loader2 v-if="ghStore.loadingRepos[repo.path]" class="h-2.5 w-2.5 animate-spin" />
                <span v-else-if="issueCount(repo.path)" class="text-[10px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-bold">{{ issueCount(repo.path) }}</span>
              </button>
            </template>
          </template>

          <div v-if="!orgGroups.length" class="p-3 text-center text-xs text-muted-foreground">{{ t('issues.noGroupsInProject') }}</div>

          <!-- All GitHub repos section -->
          <div class="mt-2 border-t">
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none text-[10px] font-bold uppercase tracking-wider hover:bg-accent/30 transition-colors text-muted-foreground" @click="toggleGhRepos">
              <Github class="h-3 w-3" />
              <span class="flex-1 truncate">{{ t('localIssues.allGhRepos') }}</span>
              <Loader2 v-if="ghStore.ghReposLoading" class="h-2.5 w-2.5 animate-spin" />
              <ChevronDown v-else class="h-2.5 w-2.5 transition-transform" :class="{ '-rotate-90': ghReposCollapsed }" />
            </div>
            <template v-if="!ghReposCollapsed">
              <div class="px-2 pb-1">
                <input v-model="ghRepoSearch" class="w-full bg-muted/40 border border-border rounded px-2 py-1 text-[11px] outline-none focus:border-primary" :placeholder="t('localIssues.filterGhRepos')" />
              </div>
              <div v-if="ghStore.allGhRepos.length === 0 && !ghStore.ghReposLoading" class="px-4 py-2 text-[11px] text-muted-foreground">{{ t('localIssues.noGhRepos') }}</div>
              <template v-for="org in filteredGhOrgs" :key="org.name">
                <div class="flex items-center gap-1.5 px-2.5 py-1 cursor-pointer text-xs font-semibold hover:bg-accent/20 text-muted-foreground" @click="toggleGhOrg(org.name)">
                  <img :src="org.avatarUrl" class="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                  <span class="flex-1 truncate">{{ org.name }}</span>
                  <ChevronDown class="h-2 w-2 transition-transform" :class="{ '-rotate-90': collapsedGhOrgs.has(org.name) }" />
                </div>
                <template v-if="!collapsedGhOrgs.has(org.name)">
                  <button
                    v-for="repo in org.repos" :key="repo.id"
                    class="flex items-center gap-1.5 w-full pl-8 pr-2.5 py-1 text-left text-muted-foreground text-[11px] border-l-2 border-transparent hover:bg-accent/40 hover:text-foreground transition-colors"
                    :class="{ 'bg-primary/10 !text-primary border-l-primary font-semibold': ghStore.selectedRepoPath === ('gh:' + repo.fullName) }"
                    @click="selectGhRepo(repo.fullName)"
                  >
                    <Lock v-if="repo.private" class="h-2.5 w-2.5 flex-shrink-0 opacity-40" />
                    <span v-else class="w-[7px] h-[7px] rounded-full bg-muted-foreground/30 flex-shrink-0" />
                    <span class="flex-1 truncate">{{ repo.name }}</span>
                  </button>
                </template>
              </template>
            </template>
          </div>
        </div>
      </template>

      <!-- Filter bar -->
      <div class="flex items-center gap-1 px-2 py-1.5 border-t bg-muted/40 flex-shrink-0">
        <button class="w-[26px] h-[26px] rounded-md border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" :class="{ 'bg-primary text-primary-foreground !border-primary': ghStore.issueFilter === 'open' }" @click="setFilter('open')">
          <CircleDot class="h-3 w-3" :stroke-width="2.5" />
        </button>
        <button class="w-[26px] h-[26px] rounded-md border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" :class="{ 'bg-primary text-primary-foreground !border-primary': ghStore.issueFilter === 'closed' }" @click="setFilter('closed')">
          <CheckCircle class="h-3 w-3" :stroke-width="2.5" />
        </button>
        <button class="w-[26px] h-[26px] rounded-md border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ml-auto" :title="t('issues.refreshAll')" @click="refreshAll">
          <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': ghStore.syncing }" />
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueDraggable } from 'vue-draggable-plus'
import { useGithubStore } from '@/stores/github'
import { useProjectStore } from '@/stores/project'
import { useLocalIssuesStore } from '@/stores/localIssues'
import type { LocalLista } from '@/stores/localIssues'
import { Button } from '@/components/ui/button'
import {
  Bookmark, FileEdit, Bell, Users, KeyRound, ChevronDown, Loader2,
  CircleDot, CheckCircle, RefreshCw, Plus, X, Lock, Github,
  ListChecks, Trash2, GripVertical,
} from 'lucide-vue-next'

const emit = defineEmits<{
  'setup-token': []
  'view-change': [view: string]
  'mode-change': [mode: 'local' | 'remote']
}>()

const { t } = useI18n()
const ghStore      = useGithubStore()
const projectStore = useProjectStore()
const localStore   = useLocalIssuesStore()

const collapsedOrgs   = ref(new Set<string>())
const collapsedGhOrgs = ref(new Set<string>())
const view            = ref<'repo' | 'saved' | 'drafts' | 'unread' | 'participating'>('repo')
const mode            = ref<'local' | 'remote'>('local')
const ghReposCollapsed = ref(false)
const ghRepoSearch    = ref('')

// ── Group/Lista CRUD state ────────────────────────────────────
const addingGroup         = ref(false)
const addGroupVal         = ref('')
const addGroupRef         = ref<HTMLInputElement | null>(null)

const addingListaGroupId  = ref<string | null>(null)
const addListaVal         = ref('')
const addListaRef         = ref<HTMLInputElement | null>(null)

const renamingGroupId     = ref<string | null>(null)
const renameGroupVal      = ref('')
const renameGroupRef      = ref<HTMLInputElement | null>(null)

const renamingListaId     = ref<string | null>(null)
const renamingListaGroupId = ref<string | null>(null)
const renameListaVal      = ref('')
const renameListaRef      = ref<HTMLInputElement | null>(null)

// Group ops
function startAddGroup() {
  addingGroup.value = true; addGroupVal.value = ''
  nextTick(() => addGroupRef.value?.focus())
}
async function confirmAddGroup() {
  if (!addGroupVal.value.trim()) { addingGroup.value = false; return }
  await localStore.addGroup(addGroupVal.value.trim())
  addingGroup.value = false
}
function startRenameGroup(id: string, label: string) {
  renamingGroupId.value = id; renameGroupVal.value = label
  nextTick(() => renameGroupRef.value?.focus())
}
async function confirmRenameGroup(id: string) {
  if (renameGroupVal.value.trim()) await localStore.renameGroup(id, renameGroupVal.value.trim())
  renamingGroupId.value = null
}
function deleteGroup(id: string, label: string) {
  if (confirm(t('localIssues.deleteGroupConfirm', { label }))) localStore.deleteGroup(id)
}

// Lista ops
function startAddLista(groupId: string) {
  addingListaGroupId.value = groupId; addListaVal.value = ''
  const g = localStore.groups.find(g => g.id === groupId)
  if (g) g.collapsed = false
  nextTick(() => (addListaRef.value as any)?.focus?.())
}
async function confirmAddLista(groupId: string) {
  if (!addListaVal.value.trim()) { addingListaGroupId.value = null; return }
  await localStore.addLista(groupId, addListaVal.value.trim())
  addingListaGroupId.value = null
}
function startRenameLista(groupId: string, listaId: string, label: string) {
  renamingListaGroupId.value = groupId; renamingListaId.value = listaId; renameListaVal.value = label
  nextTick(() => renameListaRef.value?.focus())
}
async function confirmRenameLista(groupId: string, listaId: string) {
  if (renameListaVal.value.trim()) await localStore.renameLista(groupId, listaId, renameListaVal.value.trim())
  renamingListaId.value = null
}
function deleteLista(groupId: string, listaId: string, label: string) {
  if (confirm(t('localIssues.deleteListaConfirm', { label }))) localStore.deleteLista(groupId, listaId)
}

function openCountLista(lista: LocalLista) { return lista.issues.filter(i => i.state === 'open').length }

// ── Mode toggle ────────────────────────────────────────────────
function setMode(m: 'local' | 'remote') {
  mode.value = m; emit('mode-change', m)
  if (m === 'remote' && ghStore.hasToken && !ghStore.allGhRepos.length) ghStore.loadAllGhRepos()
}

onMounted(() => {
  ghStore.loadDrafts()
  if (ghStore.hasToken) {
    ghStore.loadNotifications()
    if (!ghStore.allGhRepos.length) ghStore.loadAllGhRepos()
  }
  for (const g of projectStore.current?.groups ?? [])
    for (const r of g.repos) ghStore.detectRepoOwner(r.path)
})

// ── GitHub / org groups ────────────────────────────────────────
const orgGroups = computed(() => {
  const map = new Map<string, { name: string; avatarUrl: string; repos: any[] }>()
  for (const g of projectStore.current?.groups ?? []) {
    for (const r of g.repos) {
      const ownerRepo = ghStore.repoOwners[r.path] ?? ''
      const orgName   = ownerRepo ? ownerRepo.split('/')[0] : g.label
      if (!map.has(orgName)) {
        map.set(orgName, { name: orgName, avatarUrl: ownerRepo ? `https://github.com/${orgName}.png?size=20` : '', repos: [] })
      }
      map.get(orgName)!.repos.push(r)
    }
  }
  return [...map.values()]
})

const projectGhFullNames = computed(() => {
  const names = new Set<string>()
  for (const path of projectStore.current?.groups.flatMap(g => g.repos.map(r => r.path)) ?? []) {
    const owner = ghStore.repoOwners[path]
    if (owner) names.add(owner)
  }
  return names
})

const filteredGhOrgs = computed(() => {
  const q = ghRepoSearch.value.toLowerCase().trim()
  const map = new Map<string, { name: string; avatarUrl: string; repos: any[] }>()
  for (const r of ghStore.allGhRepos) {
    if (projectGhFullNames.value.has(r.fullName)) continue
    if (q && !r.fullName.toLowerCase().includes(q)) continue
    if (!map.has(r.owner.login)) map.set(r.owner.login, { name: r.owner.login, avatarUrl: r.owner.avatar_url, repos: [] })
    map.get(r.owner.login)!.repos.push(r)
  }
  return [...map.values()]
})

function toggleOrg(name: string) { collapsedOrgs.value.has(name) ? collapsedOrgs.value.delete(name) : collapsedOrgs.value.add(name) }
function toggleGhOrg(name: string) { collapsedGhOrgs.value.has(name) ? collapsedGhOrgs.value.delete(name) : collapsedGhOrgs.value.add(name) }
function toggleGhRepos() {
  ghReposCollapsed.value = !ghReposCollapsed.value
  if (!ghReposCollapsed.value && ghStore.hasToken && !ghStore.allGhRepos.length) ghStore.loadAllGhRepos()
}

const totalSaved  = computed(() => {
  let n = 0
  for (const r of projectStore.current?.groups.flatMap(g => g.repos) ?? []) {
    try { n += JSON.parse(localStorage.getItem(`gd:stars:${r.path}`) ?? '[]').length } catch {}
  }
  return n || 0
})
const draftCount  = computed(() => Object.keys(ghStore.drafts).length)
function setView(v: typeof view.value) {
  view.value = v; emit('view-change', v)
  if (v === 'unread' || v === 'participating') ghStore.loadNotifications()
}
function issueCount(path: string) { return ghStore.issuesByRepo[path]?.length ?? 0 }
function dotClass(path: string) {
  if (ghStore.loadingRepos[path]) return 'bg-muted-foreground animate-pulse'
  if (ghStore.errorRepos[path])   return 'bg-destructive'
  return issueCount(path) > 0 ? 'bg-warning' : 'bg-muted-foreground/40'
}
async function selectRepo(path: string) {
  view.value = 'repo'; ghStore.selectedRepoPath = path; ghStore.selectedIssue = null
  emit('view-change', 'repo')
  if (!ghStore.issuesByRepo[path]) await ghStore.loadIssues(path)
}
async function selectGhRepo(fullName: string) {
  const ghPath = 'gh:' + fullName
  view.value = 'repo'; ghStore.selectedRepoPath = ghPath; ghStore.selectedIssue = null
  emit('view-change', 'repo')
  if (!ghStore.issuesByRepo[ghPath]) await ghStore.loadIssues(ghPath)
}
function allRepos() { return projectStore.current?.groups.flatMap(g => g.repos) ?? [] }
async function refreshAll() { await ghStore.loadAllRepos(allRepos(), true) }
async function setFilter(f: 'open' | 'closed') { await ghStore.setFilter(f, allRepos()) }
</script>
