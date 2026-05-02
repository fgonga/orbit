<template>
  <div class="flex flex-col h-screen bg-background text-foreground text-[13px]">
    <!-- ── Top bar ───────────────────────────────────────── -->
    <header
      class="flex items-center gap-2 px-3 h-11 flex-shrink-0 bg-card border-b"
      style="-webkit-app-region: drag"
    >
      <div class="flex items-center gap-2">
        <LayoutGrid class="h-4 w-4 text-primary" />
        <span class="font-semibold text-[13px]">{{ projectStore.current?.name }}</span>
      </div>

      <!-- Active repo quick actions -->
      <div v-if="activeState" class="flex items-center gap-2 ms-4">
        <Badge variant="secondary" class="gap-1 font-normal rounded-full">
          <GitBranch class="h-3 w-3" />
          {{ activeState.branches?.current ?? '...' }}
        </Badge>
        <span v-if="activeState.status?.ahead" class="text-xs font-semibold text-success">+{{ activeState.status.ahead }}</span>
        <span v-if="activeState.status?.behind" class="text-xs font-semibold text-destructive">-{{ activeState.status.behind }}</span>
      </div>

      <div class="ms-auto flex items-center gap-1" style="-webkit-app-region: no-drag">
        <!-- Pull / Push -->
        <template v-if="gitStore.activeRepo || gitStore.selectedRepos.size > 0">
          <Button
            variant="outline"
            size="sm"
            :title="gitStore.selectedRepos.size > 0 ? t('dashboard.pullN', { n: gitStore.selectedRepos.size }) : t('dashboard.pull')"
            @click="openTopbarModal('pull')"
          >
            <ArrowDown class="h-3.5 w-3.5" />
            {{ t('dashboard.pull') }}
            <span v-if="gitStore.selectedRepos.size > 0" class="ml-1 bg-black/25 rounded px-1.5 text-[10px] font-bold">
              {{ gitStore.selectedRepos.size }}
            </span>
          </Button>
          <Button
            size="sm"
            :title="gitStore.selectedRepos.size > 0 ? t('dashboard.pushN', { n: gitStore.selectedRepos.size }) : t('dashboard.push')"
            @click="openTopbarModal('push')"
          >
            <ArrowUp class="h-3.5 w-3.5" />
            {{ t('dashboard.push') }}
            <span v-if="gitStore.selectedRepos.size > 0" class="ml-1 bg-black/25 rounded px-1.5 text-[10px] font-bold">
              {{ gitStore.selectedRepos.size }}
            </span>
          </Button>
        </template>

        <!-- Tab switcher -->
        <div v-if="panelMode === 'repos'" class="flex items-center gap-0.5 bg-muted rounded-md p-0.5 ml-1">
          <button
            class="px-3 py-1 rounded text-xs transition-colors"
            :class="repoTab === 'changes' ? 'bg-background text-foreground font-semibold shadow' : 'text-muted-foreground hover:text-foreground'"
            @click="repoTab = 'changes'"
          >
            {{ t('dashboard.changes') }}
          </button>
          <button
            class="px-3 py-1 rounded text-xs transition-colors"
            :class="repoTab === 'history' ? 'bg-background text-foreground font-semibold shadow' : 'text-muted-foreground hover:text-foreground'"
            @click="repoTab = 'history'"
          >
            {{ t('dashboard.history') }}
          </button>
        </div>

        <Separator orientation="vertical" class="mx-1 h-5" />

        <span v-if="projectStore.saving" class="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 class="h-3 w-3 animate-spin" /> {{ t('common.saving') }}
        </span>
        <span v-else-if="projectStore.saveError" class="text-[11px] text-warning" :title="projectStore.saveError">
          ⚠ {{ t('common.error') }}
        </span>

        <Button variant="ghost" size="icon-sm" :title="t('common.refreshAll')" @click="refreshAll">
          <RefreshCw class="h-3.5 w-3.5" />
        </Button>
        <ThemePicker />
        <Button variant="ghost" size="icon-sm" :title="t('common.home')" @click="goHome">
          <Home class="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>

    <!-- ── Body ─────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Activity Bar -->
      <ActivityBar v-model="panelMode" @settings="openSettings('appearance')" />

      <!-- Notes mode -->
      <template v-if="panelMode === 'notes'">
        <NotesPanel :width="notesSidebarW" />
        <ResizeHandle @resize="resizeNotesSidebar" />
      </template>

      <!-- Issues mode -->
      <template v-if="panelMode === 'issues'">
        <IssuesList
          :style="{ width: issueListW + 'px' }"
          @setup-token="openSettings('github')"
          @view-change="issuesSidebarView = $event"
          @mode-change="issuesMode = $event"
        />
        <ResizeHandle @resize="resizeIssueList" />
        <!-- Local mode: LocalIssuesList + LocalIssueDetail -->
        <template v-if="issuesMode === 'local'">
          <LocalIssuesList :style="{ width: issuePanelW + 'px' }" />
          <ResizeHandle @resize="resizeIssuePanel" />
        </template>
        <!-- Remote mode: IssuesPanel (conditional) -->
        <template v-else-if="ghStore.selectedRepoPath || issuesSidebarView !== 'repo'">
          <IssuesPanel :style="{ width: issuePanelW + 'px' }" :view="issuesSidebarView" />
          <ResizeHandle @resize="resizeIssuePanel" />
        </template>
      </template>

      <!-- Settings modal (groups theme, GitHub token, about) -->
      <SettingsModal v-model="showSettingsModal" :initial-tab="settingsTab" />

      <!-- Push/Pull modals -->
      <PushPullModal
        v-if="topbarPushPullOp && gitStore.activeRepo"
        v-model="showTopbarPushPull"
        :repo-path="gitStore.activeRepo"
        :op="topbarPushPullOp"
      />

      <BulkPushPullModal
        v-if="bulkPushPullOp && bulkRepoPaths.length"
        v-model="showBulkPushPull"
        :op="bulkPushPullOp"
        :repo-paths="bulkRepoPaths"
      />

      <!-- Repos Sidebar -->
      <aside
        v-if="panelMode === 'repos'"
        class="flex-shrink-0 bg-card border-r flex flex-col overflow-hidden"
        :style="{ width: repoSidebarW + 'px' }"
      >
        <!-- Search -->
        <div class="flex items-center gap-1.5 px-2.5 py-2 border-b bg-muted/40">
          <Search class="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <input
            v-model="search"
            :placeholder="t('dashboard.filterReposPlaceholder')"
            class="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <!-- Groups + repos -->
        <div class="flex-1 overflow-y-auto pb-1">
          <VueDraggable
            v-if="projectStore.current"
            v-model="projectStore.current.groups"
            handle=".sidebar-group-handle"
            :animation="160"
            @end="projectStore.saveProject()"
          >
          <template v-for="group in projectStore.current?.groups" :key="group.id">
            <!-- Group header -->
            <div
              class="group/header flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none border-t hover:bg-accent/40 transition-colors first:border-t-0"
              @click="sidebarEditingGroupId !== group.id && projectStore.toggleGroup(group.id)"
            >
              <GripVertical class="sidebar-group-handle h-3 w-3 flex-shrink-0 opacity-40 cursor-grab hover:opacity-100 transition-opacity" />
              <ChevronDown
                class="h-3 w-3 transition-transform flex-shrink-0 cursor-pointer"
                :class="{ '-rotate-90': group.collapsed }"
              />
              <input
                v-if="sidebarEditingGroupId === group.id"
                :ref="el => { if (el) sidebarGroupRenameRef = el as HTMLInputElement }"
                v-model="sidebarGroupRenameVal"
                class="flex-1 bg-background border border-primary rounded text-foreground text-[11px] px-1.5 py-px outline-none min-w-0 lowercase"
                @click.stop
                @keydown.enter.stop="confirmRenameSidebarGroup(group.id)"
                @keydown.esc.stop="sidebarEditingGroupId = null"
                @blur="confirmRenameSidebarGroup(group.id)"
              />
              <span
                v-else
                class="flex-1 truncate cursor-pointer"
                :title="t('dashboard.dblClickRename')"
                @dblclick.stop="startRenameSidebarGroup(group)"
              >{{ group.label }}</span>
              <button
                class="bg-transparent border-none cursor-pointer p-0.5 text-muted-foreground opacity-0 group-hover/header:opacity-100 hover:!text-success transition-colors rounded flex items-center"
                :title="t('dashboard.selectGroupForCommit')"
                @click.stop="toggleSelectGroup(group)"
              >
                <CheckSquare class="h-2.5 w-2.5" :stroke-width="2.5" />
              </button>
              <button
                class="bg-transparent border-none cursor-pointer text-muted-foreground text-[14px] leading-none px-0.5 opacity-0 group-hover/header:opacity-100 hover:!text-primary transition-colors"
                :title="t('dashboard.addRepo')"
                @click.stop="openAddRepo(group.id)"
              >+</button>
              <button
                class="group/gdel relative flex items-center justify-center min-w-[20px] h-[17px] text-[10px] rounded-full px-1.5 bg-muted text-muted-foreground font-normal hover:bg-destructive/10 hover:text-destructive/60 transition-all cursor-pointer"
                :title="t('groupPanel.removeGroup')"
                @click.stop="projectStore.removeGroup(group.id)"
              >
                <span class="group-hover/gdel:opacity-0 transition-opacity leading-none select-none">{{ group.repos.length }}</span>
                <Trash2 class="absolute h-2.5 w-2.5 opacity-0 group-hover/gdel:opacity-100 transition-opacity" :stroke-width="2" />
              </button>
            </div>

            <!-- Repo items (draggable within/between groups) -->
            <VueDraggable
              v-if="!group.collapsed"
              v-model="group.repos"
              :animation="180"
              :group="{ name: 'sidebar-repos', pull: true, put: true }"
              @end="projectStore.saveProject()"
            >
              <div
                v-for="repo in group.repos"
                :key="repo.id"
                v-show="matchesSearch(repo)"
                class="group/repo flex items-center gap-2 w-full pl-[22px] pr-2.5 py-1.5 cursor-grab text-muted-foreground text-xs transition-colors hover:bg-accent/50 hover:text-foreground"
                :class="{
                  'bg-primary/15 !text-primary font-semibold': gitStore.activeRepo === repo.path && !gitStore.selectedRepos.has(repo.path),
                  'bg-success/10 !text-success': gitStore.selectedRepos.has(repo.path),
                  'bg-primary/10': editingRepo?.id === repo.id,
                }"
                @click="editingRepo?.id !== repo.id && selectRepo(repo.path)"
              >
                <input
                  type="checkbox"
                  class="flex-shrink-0 cursor-pointer w-[13px] h-[13px] accent-primary"
                  :checked="gitStore.selectedRepos.has(repo.path)"
                  @click.stop="gitStore.toggleSelect(repo.path)"
                />
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :class="statusDotClass(repo.path)"
                  :title="statusDotTitle(repo.path)"
                />

                <template v-if="editingRepo?.id === repo.id">
                  <input
                    :ref="el => { if (el) repoRenameInputRef = el as HTMLInputElement }"
                    v-model="repoRenameValue"
                    class="flex-1 bg-background border border-primary rounded text-foreground text-xs px-1.5 py-px outline-none min-w-0"
                    @click.stop
                    @keydown.enter.stop="confirmRenameRepo(group.id)"
                    @keydown.esc.stop="editingRepo = null"
                    @blur="confirmRenameRepo(group.id)"
                  />
                </template>
                <div v-else class="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden" @dblclick.stop="startRenameRepo(repo)">
                  <span
                    class="text-left overflow-hidden text-ellipsis whitespace-nowrap leading-tight flex-shrink min-w-0"
                    :title="t('dashboard.dblClickRename')"
                  >{{ repo.label }}</span>
                  <span
                    v-if="gitStore.repos[repo.path]?.branches?.current"
                    class="text-[9px] text-primary/80 font-normal flex-shrink-0 flex items-center gap-0.5 bg-primary/10 rounded px-1 py-px whitespace-nowrap"
                  >
                    <GitBranch class="h-2 w-2 flex-shrink-0" />
                    {{ gitStore.repos[repo.path]?.branches?.current }}
                  </span>
                </div>

                <button
                  v-if="editingRepo?.id !== repo.id"
                  class="group/rdel relative flex items-center justify-center min-w-[20px] h-[17px] text-[10px] rounded-full flex-shrink-0 transition-all hover:bg-destructive/10 hover:text-destructive/60 cursor-pointer"
                  :class="changeCount(repo.path) > 0 ? 'px-1.5 bg-warning/20 text-warning font-bold' : 'opacity-0 group-hover/repo:opacity-100'"
                  :title="t('common.remove')"
                  @click.stop="projectStore.removeRepo(group.id, repo.id)"
                >
                  <span v-if="changeCount(repo.path) > 0" class="group-hover/rdel:opacity-0 transition-opacity leading-none select-none">{{ changeCount(repo.path) }}</span>
                  <Trash2 class="absolute h-2.5 w-2.5 opacity-0 group-hover/rdel:opacity-100 transition-opacity" :stroke-width="2" />
                </button>
              </div>
              <div v-if="group.repos.length === 0" class="px-2.5 pl-[22px] py-1.5 text-muted-foreground text-[11px]">{{ t('dashboard.noRepos') }}</div>
            </VueDraggable>
          </template>
          </VueDraggable>

          <div v-if="!projectStore.current?.groups.length" class="p-3 text-center text-xs text-muted-foreground">
            {{ t('dashboard.noRepos') }}
          </div>
        </div>

        <div class="p-2 border-t flex-shrink-0">
          <div v-if="addingGroup" class="mb-1.5">
            <input
              ref="groupInputRef"
              v-model="newGroupLabel"
              class="w-full bg-background border border-primary rounded px-2 py-1 text-[11px] outline-none"
              :placeholder="t('dashboard.newGroupPlaceholder')"
              @keydown.enter="confirmAddGroup"
              @keydown.esc="addingGroup = false"
              @blur="addingGroup = false"
            />
          </div>
          <button
            class="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md border border-dashed border-muted-foreground/40 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            @click="startAddGroup"
          >
            <Plus class="h-3.5 w-3.5" />
            {{ t('dashboard.newGroup') }}
          </button>
        </div>
      </aside>
      <ResizeHandle v-if="panelMode === 'repos'" @resize="resizeRepoSidebar" />

      <!-- Main panel -->
      <main class="flex-1 overflow-hidden flex flex-row bg-background">
        <template v-if="panelMode === 'notes'">
          <NoteEditor />
        </template>
        <template v-else-if="panelMode === 'issues'">
          <!-- Local issues detail -->
          <template v-if="issuesMode === 'local'">
            <LocalIssueDetail class="flex-1" />
          </template>
          <!-- Remote (GitHub) issues detail -->
          <template v-else>
            <IssueDetail v-if="ghStore.selectedIssue || ghStore.issueLoading" />
            <div v-else class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <CircleDot class="h-12 w-12 opacity-25 mb-3" :stroke-width="1" />
              <p>{{ t('dashboard.emptyIssue') }}</p>
            </div>
          </template>
        </template>
        <template v-else>
          <HistoryView v-if="repoTab === 'history' && gitStore.activeRepo" :repo-path="gitStore.activeRepo" />

          <template v-else-if="repoTab === 'changes'">
            <MultiRepoDetail v-if="gitStore.selectedRepos.size > 1" />
            <RepoDetail
              v-else-if="gitStore.activeRepo"
              :repo-path="gitStore.activeRepo"
              :repo-label="activeLabel"
              :group-id="activeGroupId"
              :repo-id="activeRepoId"
            />
            <div v-else class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <LayoutGrid class="h-14 w-14 opacity-30 mb-3" :stroke-width="1" />
              <p>{{ t('dashboard.emptyRepo') }}</p>
            </div>
          </template>

          <div v-else-if="!gitStore.activeRepo" class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <LayoutGrid class="h-14 w-14 opacity-30 mb-3" :stroke-width="1" />
            <p>Seleciona um repositório na barra lateral</p>
          </div>
        </template>
      </main>
    </div>

    <Dialog :open="!!addRepoModal.groupId" @update:open="v => !v && (addRepoModal.groupId = '')">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('dashboard.addRepoTitle') }}</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-2">
          <Input v-model="addRepoModal.label" :placeholder="t('dashboard.repoNamePlaceholder')" />
          <div class="flex gap-2">
            <Input v-model="addRepoModal.path" :placeholder="t('dashboard.repoPathPlaceholder')" class="flex-1" />
            <Button variant="outline" size="icon" @click="browseRepoPath">…</Button>
          </div>
          <Button variant="outline" size="sm" @click="scanForRepos">
            <Search class="h-3.5 w-3.5" />
            {{ t('dashboard.scanFolderRecursive') }}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" @click="addRepoModal.groupId = ''">{{ t('common.cancel') }}</Button>
          <Button size="sm" :disabled="!addRepoModal.path.trim()" @click="confirmAddRepo">{{ t('common.add') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="scanResults.length > 0 || scanning" @update:open="v => !v && (scanResults = [])">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle>{{ t('dashboard.reposFound') }}</DialogTitle>
        </DialogHeader>
        <div v-if="scanning" class="text-center py-3 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 class="h-4 w-4 animate-spin" />{{ t('dashboard.searching') }}
        </div>
        <div v-else class="max-h-[360px] overflow-y-auto">
          <label
            v-for="r in scanResults"
            :key="r.path"
            class="flex items-center gap-2.5 py-2 px-1 border-b cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <input
              type="checkbox"
              class="flex-shrink-0 accent-primary"
              :checked="scanSelected.has(r.path)"
              :disabled="repoAlreadyAdded(r.path)"
              @change="toggleScanSelected(r.path)"
            />
            <div class="overflow-hidden">
              <div class="font-semibold text-sm">{{ r.name }}</div>
              <div class="text-muted-foreground text-[11px]">{{ r.path }}</div>
            </div>
            <span
              v-if="repoAlreadyAdded(r.path)"
              class="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap"
            >{{ t('dashboard.alreadyAdded') }}</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" @click="scanResults = []">{{ t('common.cancel') }}</Button>
          <Button size="sm" :disabled="scanSelected.size === 0" @click="addScannedRepos">
            {{ t('dashboard.addN', { n: scanSelected.size }) }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useGitStore } from '@/stores/git'
import { VueDraggable } from 'vue-draggable-plus'
import RepoDetail from '@/components/RepoDetail.vue'
import MultiRepoDetail from '@/components/MultiRepoDetail.vue'
import HistoryView from '@/components/HistoryView.vue'
import ActivityBar from '@/components/ActivityBar.vue'
import NotesPanel from '@/components/NotesPanel.vue'
import NoteEditor from '@/components/NoteEditor.vue'
import IssuesList from '@/components/IssuesList.vue'
import IssuesPanel from '@/components/IssuesPanel.vue'
import IssueDetail from '@/components/IssueDetail.vue'
import LocalIssuesList from '@/components/LocalIssuesList.vue'
import LocalIssueDetail from '@/components/LocalIssueDetail.vue'
import ResizeHandle from '@/components/ResizeHandle.vue'
import ThemePicker from '@/components/ThemePicker.vue'
import SettingsModal from '@/components/modals/SettingsModal.vue'
import PushPullModal from '@/components/modals/PushPullModal.vue'
import BulkPushPullModal from '@/components/modals/BulkPushPullModal.vue'
import { useGithubStore } from '@/stores/github'
import { useNotesStore } from '@/stores/notes'
import { useLocalIssuesStore } from '@/stores/localIssues'
import { useResizable } from '@/composables/useResizable'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import {
  LayoutGrid, GitBranch, ArrowDown, ArrowUp, RefreshCw, Home, Search,
  ChevronDown, CheckSquare, X, Plus, Loader2, CircleDot, Trash2, GripVertical,
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const projectStore    = useProjectStore()
const gitStore        = useGitStore()
const ghStore         = useGithubStore()
const notesStore      = useNotesStore()
const localIssuesStore = useLocalIssuesStore()

const panelMode         = ref<'repos' | 'issues' | 'notes'>('repos')
const repoTab           = ref<'changes' | 'history'>('changes')
const issuesMode        = ref<'local' | 'remote'>('local')
const issuesSidebarView = ref<'repo' | 'saved' | 'drafts' | 'unread' | 'participating'>('repo')
const showSettingsModal = ref(false)
const settingsTab = ref<'appearance' | 'github' | 'notes' | 'about'>('appearance')

function openSettings(tab: 'appearance' | 'github' | 'notes' | 'about' = 'appearance') {
  settingsTab.value = tab
  showSettingsModal.value = true
}

const { width: notesSidebarW, onResize: resizeNotesSidebar } = useResizable('notes-sidebar', 220, 160, 380)
const { width: repoSidebarW, onResize: resizeRepoSidebar } = useResizable('repo-sidebar', 200, 140, 360)
const { width: issueListW,   onResize: resizeIssueList }    = useResizable('issue-list',    200, 140, 360)
const { width: issuePanelW,  onResize: resizeIssuePanel }   = useResizable('issue-panel',   300, 200, 500)

const selectedGroupId = ref<string | null>(null)

watch(panelMode, async (mode) => {
  if (mode === 'issues') {
    await localIssuesStore.load()
    await ghStore.init()
    if (ghStore.hasToken) {
      const repos = projectStore.current?.groups.flatMap((g) => g.repos) ?? []
      if (repos.length) ghStore.loadAllRepos(repos)
    }
  } else if (mode === 'notes') {
    await notesStore.load()
  }
})

const showTopbarPushPull = ref(false)
const topbarPushPullOp   = ref<'push' | 'pull' | null>(null)
const showBulkPushPull   = ref(false)
const bulkPushPullOp     = ref<'push' | 'pull' | null>(null)
const bulkRepoPaths      = ref<string[]>([])

function openTopbarModal(op: 'push' | 'pull') {
  topbarPushPullOp.value = op
  if (gitStore.selectedRepos.size > 0) {
    bulkPushPullOp.value  = op
    bulkRepoPaths.value   = [...gitStore.selectedRepos]
    showBulkPushPull.value = true
  } else {
    showTopbarPushPull.value = true
  }
}

const search = ref('')

// ── Add group inline ───────────────────────────────────────
const addingGroup   = ref(false)
const newGroupLabel = ref('')
const groupInputRef = ref<HTMLInputElement | null>(null)

function startAddGroup() {
  addingGroup.value   = true
  newGroupLabel.value = ''
  nextTick(() => groupInputRef.value?.focus())
}

function confirmAddGroup() {
  if (!newGroupLabel.value.trim()) { addingGroup.value = false; return }
  projectStore.addGroup(newGroupLabel.value.trim())
  addingGroup.value = false
}

// ── Add repo modal ─────────────────────────────────────────
const addRepoModal = ref({ groupId: '', label: '', path: '' })

function openAddRepo(groupId: string) {
  addRepoModal.value = { groupId, label: '', path: '' }
}

async function browseRepoPath() {
  const path = await window.electron.dialog.openDirectory()
  if (path) {
    addRepoModal.value.path = path
    if (!addRepoModal.value.label) addRepoModal.value.label = path.split('/').pop() ?? path
  }
}

function confirmAddRepo() {
  const { groupId, label, path } = addRepoModal.value
  if (!path.trim()) return
  const finalLabel = label.trim() || path.split('/').pop() || path
  projectStore.addRepo(groupId, finalLabel, path.trim())
  gitStore.refresh(path.trim())
  addRepoModal.value.groupId = ''
}

// ── Scan ──────────────────────────────────────────────────
const scanning = ref(false)
const scanResults = ref<{ path: string; name: string }[]>([])
const scanSelected = ref(new Set<string>())
const scanTargetGroup = ref('')

async function scanForRepos() {
  const root = await window.electron.dialog.openDirectory()
  if (!root) return
  scanTargetGroup.value = addRepoModal.value.groupId
  addRepoModal.value.groupId = ''
  scanning.value = true
  scanResults.value = []
  scanSelected.value = new Set()
  try {
    const found = await window.electron.git.scanRepos(root)
    scanResults.value = found
    found.forEach((r) => { if (!repoAlreadyAdded(r.path)) scanSelected.value.add(r.path) })
  } finally {
    scanning.value = false
  }
}

function repoAlreadyAdded(path: string) {
  return projectStore.current?.groups.some((g) => g.repos.some((r) => r.path === path)) ?? false
}

function toggleScanSelected(path: string) {
  scanSelected.value.has(path) ? scanSelected.value.delete(path) : scanSelected.value.add(path)
}

function addScannedRepos() {
  for (const r of scanResults.value) {
    if (scanSelected.value.has(r.path)) {
      projectStore.addRepo(scanTargetGroup.value, r.name, r.path)
      gitStore.refresh(r.path)
    }
  }
  scanResults.value = []
}

// ── Repo selection ─────────────────────────────────────────
function selectRepo(path: string) {
  gitStore.activeRepo = path
  if (!gitStore.repos[path]?.status) gitStore.refresh(path)
}

const activeState = computed(() => gitStore.activeRepo ? gitStore.repos[gitStore.activeRepo] : null)
const activeGroupId = computed(() => {
  if (!gitStore.activeRepo) return ''
  for (const g of projectStore.current?.groups ?? []) {
    if (g.repos.some((r) => r.path === gitStore.activeRepo)) return g.id
  }
  return ''
})

const activeRepoId = computed(() => {
  if (!gitStore.activeRepo) return ''
  for (const g of projectStore.current?.groups ?? []) {
    const r = g.repos.find((r) => r.path === gitStore.activeRepo)
    if (r) return r.id
  }
  return ''
})

const activeLabel = computed(() => {
  if (!gitStore.activeRepo) return ''
  for (const g of projectStore.current?.groups ?? []) {
    const r = g.repos.find((r) => r.path === gitStore.activeRepo)
    if (r) return r.label
  }
  return gitStore.activeRepo.split('/').pop() ?? ''
})

// ── Rename repo inline ─────────────────────────────────────
// ── Sidebar group rename ─────────────────────────────────────
const sidebarEditingGroupId  = ref<string | null>(null)
const sidebarGroupRenameVal  = ref('')
const sidebarGroupRenameRef  = ref<HTMLInputElement | null>(null)

function startRenameSidebarGroup(group: { id: string; label: string }) {
  sidebarEditingGroupId.value = group.id
  sidebarGroupRenameVal.value = group.label
  nextTick(() => sidebarGroupRenameRef.value?.select())
}

function confirmRenameSidebarGroup(groupId: string) {
  const label = sidebarGroupRenameVal.value.trim()
  if (label) projectStore.renameGroup(groupId, label)
  sidebarEditingGroupId.value = null
}

const editingRepo        = ref<{ id: string; groupId: string } | null>(null)
const repoRenameValue    = ref('')
const repoRenameInputRef = ref<HTMLInputElement | null>(null)

function startRenameRepo(repo: any) {
  editingRepo.value = { id: repo.id, groupId: '' }
  repoRenameValue.value = repo.label
  for (const g of projectStore.current?.groups ?? []) {
    if (g.repos.some((r) => r.id === repo.id)) {
      editingRepo.value = { id: repo.id, groupId: g.id }
      break
    }
  }
  nextTick(() => { repoRenameInputRef.value?.select() })
}

function confirmRenameRepo(groupId: string) {
  if (!editingRepo.value) return
  const name = repoRenameValue.value.trim()
  if (name) projectStore.renameRepo(groupId || editingRepo.value.groupId, editingRepo.value.id, name)
  editingRepo.value = null
}

function toggleSelectGroup(group: any) {
  const allSelected = group.repos.every((r: any) => gitStore.selectedRepos.has(r.path))
  if (allSelected) {
    group.repos.forEach((r: any) => gitStore.selectedRepos.delete(r.path))
  } else {
    group.repos.forEach((r: any) => gitStore.selectedRepos.add(r.path))
  }
}

function matchesSearch(repo: any) {
  if (!search.value.trim()) return true
  const q = search.value.toLowerCase()
  return repo.label.toLowerCase().includes(q) || repo.path.toLowerCase().includes(q)
}

function changeCount(path: string) {
  const s = gitStore.repos[path]?.status
  if (!s) return 0
  return s.modified.length + s.not_added.length + s.deleted.length + s.created.length + s.staged.length
}

function statusDotTitle(path: string) {
  const state = gitStore.repos[path]
  if (!state || state.loading) return t('dashboard.statusLoading')
  if (state.error) return t('dashboard.statusErrorPrefix', { message: state.error })
  const s = state.status
  if (!s) return ''
  const parts: string[] = []
  if (s.conflicted?.length) parts.push(t('dashboard.statusConflicts', { n: s.conflicted.length }))
  const changed = s.modified.length + s.not_added.length + s.deleted.length + s.created.length
  if (changed) parts.push(t('dashboard.statusFilesChanged', { n: changed }))
  if (s.staged.length) parts.push(t('dashboard.statusStaged', { n: s.staged.length }))
  if (s.ahead > 0) parts.push(t('dashboard.statusAhead', { n: s.ahead }))
  if (s.behind > 0) parts.push(t('dashboard.statusBehind', { n: s.behind }))
  return parts.length ? parts.join(' · ') : t('dashboard.statusClean')
}

function statusDotClass(path: string) {
  const state = gitStore.repos[path]
  if (!state || state.loading) return 'bg-muted-foreground animate-pulse'
  if (state.error) return 'bg-destructive opacity-70'
  const s = state.status
  if (!s) return 'bg-muted-foreground animate-pulse'
  if (s.conflicted?.length) return 'bg-destructive'
  if (changeCount(path) > 0) return 'bg-warning'
  if (s.ahead > 0 && s.behind > 0) return 'bg-info'
  if (s.ahead > 0) return 'bg-info'
  if (s.behind > 0) return 'bg-warning'
  return 'bg-muted-foreground/50'
}

function refreshAll() {
  for (const g of projectStore.current?.groups ?? [])
    for (const r of g.repos) gitStore.refresh(r.path)
}

function goHome() { router.push('/') }

onMounted(async () => {
  if (!projectStore.current) { router.push('/'); return }
  refreshAll()
  await ghStore.init()
  const firstGroup = projectStore.current.groups[0]
  if (firstGroup) {
    selectedGroupId.value = firstGroup.id
    const firstRepo = firstGroup.repos[0]
    if (firstRepo) selectRepo(firstRepo.path)
  }
})
</script>
