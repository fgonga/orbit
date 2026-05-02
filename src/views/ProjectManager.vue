<template>
  <Modal v-model="showNewForm" :title="t('projectManager.newProject')" width="400px" @update:model-value="v => { if (!v) creating = false }">
    <template #icon>
      <FolderKanban class="h-4 w-4 text-primary" />
    </template>

    <div class="flex flex-col gap-3">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          {{ t('projectManager.newProjectName') }}
        </label>
        <Input
          ref="nameInputRef"
          v-model="newName"
          :placeholder="t('projectManager.newProjectNamePlaceholder')"
          class="h-9"
          @keydown.enter="createProject"
        />
      </div>
      <p class="text-xs text-muted-foreground m-0">
        {{ t('projectManager.newProjectHint') }}
      </p>
    </div>

    <template #footer>
      <Button variant="outline" size="sm" @click="showNewForm = false">{{ t('common.cancel') }}</Button>
      <Button size="sm" :disabled="!newName.trim() || creating" @click="createProject">
        <Loader2 v-if="creating" class="h-3.5 w-3.5 animate-spin" />
        {{ t('projectManager.createProject') }}
      </Button>
    </template>
  </Modal>

  <Dialog :open="!!deletingProject" @update:open="v => !v && (deletingProject = null)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ t('projectManager.deleteTitle') }}</DialogTitle>
        <DialogDescription>
          <i18n-t keypath="projectManager.deleteConfirm">
            <template #name>
              <span class="font-semibold text-foreground">{{ deletingProject?.name }}</span>
            </template>
          </i18n-t>
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" size="sm" @click="deletingProject = null">{{ t('common.cancel') }}</Button>
        <Button variant="destructive" size="sm" @click="doDelete">{{ t('common.delete') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <div class="h-screen flex flex-col bg-background text-foreground text-sm">
    <div
      class="flex items-center justify-between px-5 h-[52px] flex-shrink-0 bg-card border-b"
      style="-webkit-app-region: drag"
    >
      <div class="flex items-center gap-2">
        <LayoutGrid class="h-5 w-5 text-primary" />
        <span class="font-bold text-[15px]">Orbit</span>
      </div>

      <div class="flex gap-2 items-center" style="-webkit-app-region: no-drag">
        <ThemePicker />
        <Button variant="outline" size="sm" @click="importProject">
          <Upload class="h-3.5 w-3.5" />
          {{ t('common.import') }}
        </Button>
        <Button size="sm" @click="openNewForm">
          <Plus class="h-3.5 w-3.5" />
          {{ t('projectManager.newProject') }}
        </Button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <aside class="w-[220px] flex-shrink-0 p-4 bg-card/50 border-r">
        <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 pb-2">
          {{ t('projectManager.workspace') }}
        </div>
        <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-primary/15 text-primary font-semibold text-sm">
          <FolderKanban class="h-3.5 w-3.5" />
          {{ t('projectManager.allProjects') }}
          <span class="ml-auto text-[11px] px-1.5 py-px rounded-full bg-muted text-muted-foreground font-normal">
            {{ projects.length }}
          </span>
        </div>
      </aside>

      <div class="flex-1 overflow-y-auto flex flex-col">
        <div class="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0">
          <div class="relative flex-1 max-w-[340px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input v-model="search" :placeholder="t('projectManager.searchPlaceholder')" class="pl-8 h-8" />
          </div>
          <span class="text-xs text-muted-foreground">{{ t('projectManager.countProjects', { n: filteredProjects.length }) }}</span>
        </div>

        <div v-if="loading" class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>

        <div v-else-if="filteredProjects.length === 0 && !showNewForm" class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <FolderKanban class="h-10 w-10 opacity-30 mb-3" />
          <p class="mb-3">{{ search ? t('projectManager.noProjectsFound') : t('projectManager.noProjectsYet') }}</p>
          <Button v-if="!search" size="sm" @click="openNewForm">{{ t('projectManager.createFirstProject') }}</Button>
        </div>

        <div v-else class="flex-1">
          <div
            v-for="p in filteredProjects"
            :key="p.id"
            class="group flex items-center gap-3.5 px-5 py-3.5 border-b cursor-pointer hover:bg-accent/50 transition-colors"
            @click="openProject(p.id)"
          >
            <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/15 text-primary flex-shrink-0">
              <LayoutGrid class="h-4 w-4" />
            </div>

            <div class="flex-1 overflow-hidden">
              <div class="font-semibold text-sm">{{ p.name }}</div>
              <div class="flex gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>{{ p.groupCount }} {{ p.groupCount !== 1 ? t('projectManager.groups') : t('projectManager.group') }}</span>
                <span class="opacity-50">·</span>
                <span>{{ p.repoCount }} {{ p.repoCount !== 1 ? t('projectManager.repos') : t('projectManager.repo') }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-shrink-0">
              <span class="text-xs text-muted-foreground">{{ formatDate(p.updatedAt) }}</span>
              <button
                class="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/15 rounded p-1 transition-all"
                :title="t('projectManager.deleteTitle')"
                @click.stop="confirmDelete(p)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="fixed bottom-[18px] right-[18px] bg-destructive text-destructive-foreground px-4 py-2.5 rounded-lg text-sm z-[999] shadow-lg"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import Modal from '@/components/Modal.vue'
import ThemePicker from '@/components/ThemePicker.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FolderKanban, LayoutGrid, Upload, Plus, Search, Loader2, Trash2 } from 'lucide-vue-next'
import type { WorkspaceProject } from '@/env'

const { t, locale } = useI18n()
const router = useRouter()
const projectStore = useProjectStore()

const projects = ref<WorkspaceProject[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const showNewForm = ref(false)
const newName = ref('')
const nameInputRef = ref<any>(null)
const creating = ref(false)
const deletingProject = ref<WorkspaceProject | null>(null)

const filteredProjects = computed(() => {
  if (!search.value.trim()) return projects.value
  const q = search.value.toLowerCase()
  return projects.value.filter((p) => p.name.toLowerCase().includes(q))
})

onMounted(loadProjects)

async function loadProjects() {
  loading.value = true
  try { projects.value = await window.electron.project.listWorkspace() }
  catch (e: any) { error.value = e?.message ?? t('common.error') }
  finally { loading.value = false }
}

watch(showNewForm, async (v) => {
  if (v) {
    newName.value = ''
    creating.value = false
    await nextTick()
    const el = (nameInputRef.value as any)?.$el ?? nameInputRef.value
    el?.querySelector?.('input')?.focus() ?? el?.focus?.()
  }
})

function openNewForm() { showNewForm.value = true }

async function createProject() {
  if (!newName.value.trim() || creating.value) return
  creating.value = true
  try {
    await projectStore.createProject(newName.value.trim())
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.message ?? t('common.error')
    creating.value = false
  }
}

async function openProject(id: string) {
  try {
    await projectStore.openById(id)
    router.push('/dashboard')
  } catch (e: any) { error.value = e?.message ?? t('common.error') }
}

async function importProject() {
  try {
    const p = await projectStore.importProject()
    if (p) router.push('/dashboard')
    else await loadProjects()
  } catch (e: any) { error.value = e?.message ?? t('common.error') }
}

function confirmDelete(p: WorkspaceProject) { deletingProject.value = p }

async function doDelete() {
  if (!deletingProject.value) return
  await window.electron.project.delete(deletingProject.value.id)
  deletingProject.value = null
  await loadProjects()
}

function formatDate(ms: number) {
  const d = new Date(ms)
  const diff = Date.now() - ms
  if (diff < 60000) return t('common.now')
  if (diff < 3600000) return t('common.ago', { n: `${Math.floor(diff / 60000)}m` })
  if (diff < 86400000) return t('common.ago', { n: `${Math.floor(diff / 3600000)}h` })
  return d.toLocaleDateString(locale.value, { day: '2-digit', month: 'short' })
}
</script>
