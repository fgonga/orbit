<template>
  <div class="flex-shrink-0 flex flex-col h-full overflow-hidden bg-background border-r">
    <!-- Header -->
    <div class="flex items-center gap-2 h-10 flex-shrink-0 px-3 border-b bg-card">
      <span class="font-bold text-[13px] flex-1 truncate">{{ group?.label ?? t('reposList.all') }}</span>
      <Badge variant="secondary" class="text-[10px]">{{ group?.repos.length ?? 0 }}</Badge>
      <Button variant="ghost" size="icon-xs" :title="t('reposList.addRepo')" @click="$emit('add-repo', group?.id)">
        <Plus class="h-3.5 w-3.5" :stroke-width="2.5" />
      </Button>
    </div>

    <div v-if="!group?.repos.length" class="flex-1 flex flex-col items-center justify-center gap-2.5 text-muted-foreground text-xs">
      <LayoutGrid class="h-8 w-8 opacity-25" :stroke-width="1" />
      <p>{{ t('reposList.noReposInGroup') }}</p>
      <Button size="sm" @click="$emit('add-repo', group?.id)">{{ t('reposList.addRepo') }}</Button>
    </div>

    <!-- Repo list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="repo in group.repos"
        :key="repo.id"
        class="group flex flex-col gap-0.5 py-2.5 px-3 w-full text-left border-l-2 border-transparent border-b border-border/20 transition-colors hover:bg-accent/40 cursor-pointer"
        :class="{ 'bg-primary/10 border-l-primary': gitStore.activeRepo === repo.path }"
        role="button"
        tabindex="0"
        @click="selectRepo(repo)"
        @dblclick="startRename(repo)"
        @keydown.enter="selectRepo(repo)"
      >
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full flex-shrink-0" :class="dotClass(repo.path)" />
          <span
            v-if="editingId !== repo.id"
            class="flex-1 text-[13px] font-medium overflow-hidden text-ellipsis whitespace-nowrap"
            :class="gitStore.activeRepo === repo.path ? 'text-primary font-semibold' : ''"
          >{{ repo.label }}</span>
          <input
            v-else
            :ref="el => { if (el) renameRef = el as HTMLInputElement }"
            v-model="renameValue"
            class="flex-1 bg-background border border-primary rounded text-foreground text-xs px-1.5 py-px outline-none"
            @click.stop
            @keydown.enter.stop="confirmRename(repo)"
            @keydown.esc.stop="editingId = null"
            @blur="confirmRename(repo)"
          />
          <div class="flex items-center gap-1 ml-auto flex-shrink-0">
            <span v-if="ahead(repo.path)" class="text-[10px] px-1.5 py-px rounded-full font-bold bg-info/15 text-info">+{{ ahead(repo.path) }}</span>
            <span v-if="behind(repo.path)" class="text-[10px] px-1.5 py-px rounded-full font-bold bg-warning/15 text-warning">-{{ behind(repo.path) }}</span>
            <button
              class="group/rdel relative flex items-center justify-center min-w-[20px] h-[17px] text-[10px] rounded-full flex-shrink-0 transition-all hover:bg-destructive/10 hover:text-destructive/60 cursor-pointer"
              :class="changeCount(repo.path) ? 'px-1.5 bg-warning/20 text-warning font-bold' : 'opacity-0 group-hover:opacity-100'"
              :title="t('reposList.remove')"
              @click.stop="projectStore.removeRepo(group.id, repo.id)"
            >
              <span v-if="changeCount(repo.path)" class="group-hover/rdel:opacity-0 transition-opacity leading-none select-none">{{ changeCount(repo.path) }}</span>
              <Trash2 class="absolute h-2.5 w-2.5 opacity-0 group-hover/rdel:opacity-100 transition-opacity" :stroke-width="2" />
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 pl-4">
          <span v-if="branch(repo.path)" class="flex items-center gap-1 text-[11px] text-primary flex-shrink-0">
            <GitBranch class="h-2.5 w-2.5" />
            {{ branch(repo.path) }}
          </span>
          <span class="text-[10px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap font-mono">
            {{ shortPath(repo.path) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGitStore } from '@/stores/git'
import { useProjectStore } from '@/stores/project'
import type { Group, Repo } from '@/types/project'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, LayoutGrid, X, GitBranch, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ group: Group | null }>()
const emit  = defineEmits<{ 'select-repo': [path: string]; 'add-repo': [groupId: string | undefined] }>()

const { t } = useI18n()
const gitStore     = useGitStore()
const projectStore = useProjectStore()

const editingId  = ref<string | null>(null)
const renameValue = ref('')
const renameRef  = ref<HTMLInputElement | null>(null)

function selectRepo(repo: Repo) {
  if (editingId.value === repo.id) return
  gitStore.activeRepo = repo.path
  if (!gitStore.repos[repo.path]?.status) gitStore.refresh(repo.path)
  emit('select-repo', repo.path)
}

function startRename(repo: Repo) {
  editingId.value   = repo.id
  renameValue.value = repo.label
  nextTick(() => renameRef.value?.select())
}

function confirmRename(repo: Repo) {
  if (renameValue.value.trim() && props.group)
    projectStore.renameRepo(props.group.id, repo.id, renameValue.value.trim())
  editingId.value = null
}

const repoState = (path: string) => gitStore.repos[path]

function dotClass(path: string) {
  const s = repoState(path)
  if (!s || s.loading) return 'bg-muted-foreground animate-pulse'
  if (s.error) return 'bg-destructive opacity-60'
  const st = s.status
  if (!st) return 'bg-muted-foreground animate-pulse'
  if (st.conflicted?.length) return 'bg-destructive'
  const changed = st.modified.length + st.not_added.length + st.deleted.length + st.staged.length
  if (changed) return 'bg-warning'
  if (st.ahead) return 'bg-info'
  if (st.behind) return 'bg-warning'
  return 'bg-muted-foreground/40'
}

function changeCount(path: string) {
  const st = repoState(path)?.status
  if (!st) return 0
  return st.modified.length + st.not_added.length + st.deleted.length + st.created.length + st.staged.length
}
function ahead(path: string)  { return repoState(path)?.status?.ahead  ?? 0 }
function behind(path: string) { return repoState(path)?.status?.behind ?? 0 }
function branch(path: string) { return repoState(path)?.branches?.current ?? '' }

function shortPath(path: string) {
  const home = path.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~')
  return home.length > 36 ? '...' + home.slice(-33) : home
}
</script>
