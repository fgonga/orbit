<template>
  <Card class="shadow-sm">
    <!-- Group Header -->
    <div class="group/header flex items-center gap-2 py-2 px-3 border-b">
      <span class="group-drag-handle text-muted-foreground mr-1 cursor-grab" :title="t('groupPanel.dragGroup')">
        <GripVertical class="h-3.5 w-3.5" />
      </span>

      <Button variant="ghost" size="icon-xs" @click="projectStore.toggleGroup(group.id)">
        <ChevronDown class="h-4 w-4 transition-transform" :class="{ '-rotate-90': group.collapsed }" />
      </Button>

      <span
        v-if="!editingLabel"
        class="font-semibold flex-1 select-none cursor-pointer"
        @dblclick="startEditLabel"
      >{{ group.label }}</span>
      <Input
        v-else
        ref="labelInputRef"
        v-model="labelDraft"
        class="flex-1 h-7 text-sm max-w-[200px]"
        @blur="confirmEditLabel"
        @keydown.enter="confirmEditLabel"
        @keydown.esc="editingLabel = false"
      />

      <!-- Column control -->
      <div v-if="!group.collapsed" class="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
        <button
          v-for="n in [1, 2, 3] as const"
          :key="n"
          class="px-2 py-0.5 rounded text-[11px] leading-none transition-colors"
          :class="(group.columns ?? 2) === n ? 'bg-primary/20 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'"
          @click="projectStore.setGroupColumns(group.id, n)"
        >{{ n }}</button>
      </div>

      <!-- Select all -->
      <Button
        variant="ghost"
        size="icon-xs"
        :title="allSelected ? t('common.deselectAll') : t('common.selectAll')"
        @click="toggleSelectAll"
      >
        <CheckSquare class="h-3.5 w-3.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon-xs" class="!text-primary" :title="t('groupPanel.addRepoTitle')">
            <Plus class="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="openManualAdd">
            <FolderPlus class="h-3.5 w-3.5" />
            {{ t('groupPanel.addFolder') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="openScanFolder">
            <Search class="h-3.5 w-3.5" />
            {{ t('groupPanel.scanFolder') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        class="group/gdel relative flex items-center justify-center min-w-[24px] h-[20px] text-[11px] rounded-full px-1.5 ml-1 bg-muted text-muted-foreground font-normal hover:bg-destructive/10 hover:text-destructive/60 transition-all cursor-pointer"
        :title="t('groupPanel.removeGroup')"
        @click="projectStore.removeGroup(group.id)"
      >
        <span class="group-hover/gdel:opacity-0 transition-opacity leading-none select-none">{{ group.repos.length }}</span>
        <Trash2 class="absolute h-3 w-3 opacity-0 group-hover/gdel:opacity-100 transition-opacity" :stroke-width="2" />
      </button>
    </div>

    <div v-if="showManualAdd" class="px-3 py-2 border-b flex flex-wrap items-center gap-2">
      <Input v-model="newRepoLabel" class="h-8 text-xs w-[150px]" :placeholder="t('groupPanel.namePlaceholder')" />
      <div class="flex gap-1 flex-1">
        <Input v-model="newRepoPath" class="h-8 text-xs flex-1" :placeholder="t('groupPanel.pathPlaceholder')" />
        <Button variant="outline" size="sm" @click="browseSinglePath">...</Button>
      </div>
      <Button size="sm" :disabled="!newRepoPath.trim()" @click="confirmManualAdd">{{ t('common.add') }}</Button>
      <Button variant="ghost" size="sm" @click="showManualAdd = false">{{ t('common.cancel') }}</Button>
    </div>

    <!-- Scan results -->
    <div v-if="scanning || scannedRepos.length > 0" class="border-b">
      <div v-if="scanning" class="px-3 py-2 flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        <i18n-t keypath="groupPanel.searchingIn">
          <template #path><code class="font-mono text-foreground">{{ scanRoot }}</code></template>
        </i18n-t>
      </div>

      <div v-else>
        <div class="px-3 py-2 flex items-center gap-2 border-b">
          <span class="font-semibold text-xs">{{ t('groupPanel.foundN', { n: scannedRepos.length }) }}</span>
          <Button variant="ghost" size="xs" class="ml-auto" @click="toggleSelectAllScanned">
            {{ allScannedSelected ? t('groupPanel.unmarkAll') : t('groupPanel.markAll') }}
          </Button>
          <Button size="xs" :disabled="selectedScanned.size === 0" @click="addScannedRepos">
            {{ t('groupPanel.addN', { n: selectedScanned.size }) }}
          </Button>
          <Button variant="ghost" size="xs" @click="clearScan">{{ t('common.close') }}</Button>
        </div>

        <div class="max-h-[240px] overflow-y-auto">
          <label
            v-for="r in scannedRepos"
            :key="r.path"
            class="flex items-center gap-2 px-3 py-1 cursor-pointer border-b border-border/20 hover:bg-accent/40 transition-colors"
            :class="{ 'opacity-50 cursor-default': isAlreadyAdded(r.path) }"
          >
            <input
              type="checkbox"
              class="accent-primary flex-shrink-0"
              :checked="selectedScanned.has(r.path)"
              :disabled="isAlreadyAdded(r.path)"
              @change="toggleScanned(r.path)"
            />
            <div class="overflow-hidden">
              <div class="font-semibold text-xs truncate">{{ r.name }}</div>
              <div class="text-muted-foreground text-[10px]">{{ r.path }}</div>
            </div>
            <Badge v-if="isAlreadyAdded(r.path)" variant="secondary" class="ml-auto flex-shrink-0 text-[10px]">{{ t('dashboard.alreadyAdded') }}</Badge>
          </label>

          <div v-if="scannedRepos.length === 0" class="px-3 py-2 text-muted-foreground text-xs">
            {{ t('groupPanel.noneFound') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Repos grid -->
    <div v-if="!group.collapsed" class="p-2">
      <div v-if="!group.repos.length" class="text-center text-muted-foreground py-3 text-xs">
        {{ t('groupPanel.noRepos') }}
      </div>

      <VueDraggable
        v-model="group.repos"
        :animation="200"
        :group="{ name: 'repos', pull: true, put: true }"
        handle=".repo-drag-handle"
        :class="gridClass"
        @end="onRepoDragEnd"
      >
        <div v-for="repo in group.repos" :key="repo.id">
          <RepoPanel :repo="repo" :group-id="group.id" />
        </div>
      </VueDraggable>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueDraggable } from 'vue-draggable-plus'
import { useProjectStore } from '@/stores/project'
import { useGitStore } from '@/stores/git'
import RepoPanel from '@/components/RepoPanel.vue'
import type { Group } from '@/types/project'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  GripVertical, ChevronDown, CheckSquare, Plus, FolderPlus, Search, Trash2, Loader2,
} from 'lucide-vue-next'

const props = defineProps<{ group: Group }>()

const { t } = useI18n()
const projectStore = useProjectStore()
const gitStore = useGitStore()

const showManualAdd = ref(false)
const newRepoLabel = ref('')
const newRepoPath = ref('')

const scanning = ref(false)
const scanRoot = ref('')
const scannedRepos = ref<{ path: string; name: string }[]>([])
const selectedScanned = ref(new Set<string>())

const editingLabel = ref(false)
const labelDraft = ref('')
const labelInputRef = ref<any>(null)

const cols = computed(() => props.group.columns ?? 2)
const gridClass = computed(() => {
  if (cols.value === 1) return 'grid grid-cols-1 gap-2'
  if (cols.value === 3) return 'grid grid-cols-1 lg:grid-cols-3 gap-2'
  return 'grid grid-cols-1 lg:grid-cols-2 gap-2'
})

const allSelected = computed(() =>
  props.group.repos.length > 0 &&
  props.group.repos.every((r) => gitStore.selectedRepos.has(r.path))
)

const allScannedSelected = computed(() =>
  scannedRepos.value.length > 0 &&
  scannedRepos.value
    .filter((r) => !isAlreadyAdded(r.path))
    .every((r) => selectedScanned.value.has(r.path))
)

function isAlreadyAdded(path: string) {
  return props.group.repos.some((r) => r.path === path)
}

function toggleSelectAll() {
  if (allSelected.value) {
    props.group.repos.forEach((r) => gitStore.selectedRepos.delete(r.path))
  } else {
    props.group.repos.forEach((r) => gitStore.selectedRepos.add(r.path))
  }
}

function startEditLabel() {
  labelDraft.value = props.group.label
  editingLabel.value = true
  nextTick(() => {
    const el = (labelInputRef.value as any)?.$el ?? labelInputRef.value
    el?.querySelector?.('input')?.select?.()
  })
}

function confirmEditLabel() {
  if (labelDraft.value.trim()) projectStore.renameGroup(props.group.id, labelDraft.value.trim())
  editingLabel.value = false
}

function onRepoDragEnd() { projectStore.saveProject() }

function openManualAdd() {
  showManualAdd.value = true
  newRepoLabel.value = ''
  newRepoPath.value = ''
}

async function browseSinglePath() {
  const path = await window.electron.dialog.openDirectory()
  if (path) {
    newRepoPath.value = path
    if (!newRepoLabel.value) newRepoLabel.value = path.split('/').pop() ?? path
  }
}

function confirmManualAdd() {
  if (!newRepoPath.value.trim()) return
  const label = newRepoLabel.value.trim() || newRepoPath.value.split('/').pop() || newRepoPath.value
  projectStore.addRepo(props.group.id, label, newRepoPath.value.trim())
  gitStore.refresh(newRepoPath.value.trim())
  showManualAdd.value = false
}

async function openScanFolder() {
  const root = await window.electron.dialog.openDirectory()
  if (!root) return
  scanRoot.value = root
  scanning.value = true
  scannedRepos.value = []
  selectedScanned.value = new Set()
  try {
    const found = await window.electron.git.scanRepos(root)
    scannedRepos.value = found
    found.forEach((r) => { if (!isAlreadyAdded(r.path)) selectedScanned.value.add(r.path) })
  } finally {
    scanning.value = false
  }
}

function toggleScanned(path: string) {
  selectedScanned.value.has(path) ? selectedScanned.value.delete(path) : selectedScanned.value.add(path)
}

function toggleSelectAllScanned() {
  const eligible = scannedRepos.value.filter((r) => !isAlreadyAdded(r.path))
  if (allScannedSelected.value) {
    eligible.forEach((r) => selectedScanned.value.delete(r.path))
  } else {
    eligible.forEach((r) => selectedScanned.value.add(r.path))
  }
}

function addScannedRepos() {
  for (const r of scannedRepos.value) {
    if (selectedScanned.value.has(r.path)) {
      projectStore.addRepo(props.group.id, r.name, r.path)
      gitStore.refresh(r.path)
    }
  }
  clearScan()
}

function clearScan() {
  scannedRepos.value = []
  selectedScanned.value = new Set()
  scanRoot.value = ''
}
</script>
