<template>
  <Modal v-model="open" :title="t('modals.branch.title')" width="420px">
    <template #icon>
      <GitBranch class="h-4 w-4 text-info" />
    </template>

    <div class="flex items-center gap-1.5 bg-background border rounded-md px-2.5 py-1.5 mb-3">
      <Search class="h-3 w-3 text-muted-foreground" />
      <input v-model="search" class="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground" :placeholder="t('modals.branch.filterPlaceholder')" />
    </div>

    <div v-if="showCreate" class="bg-background border rounded-lg p-3 mb-3">
      <Input
        ref="newBranchRef"
        v-model="newBranch"
        class="border-primary"
        :placeholder="t('modals.branch.createPlaceholder')"
        @keydown.enter="createBranch"
        @keydown.esc="showCreate = false"
      />
      <div class="flex gap-2 mt-2">
        <Button size="sm" :disabled="!newBranch.trim() || creating" @click="createBranch">
          <Loader2 v-if="creating" class="h-3.5 w-3.5 animate-spin" />
          {{ t('modals.branch.createAndSwitch') }}
        </Button>
        <Button variant="outline" size="sm" @click="showCreate = false">{{ t('common.cancel') }}</Button>
      </div>
    </div>

    <div class="flex flex-col gap-0.5">
      <button
        v-for="b in filtered"
        :key="b"
        class="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-left text-muted-foreground text-sm hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
        :class="{ 'bg-primary/15 !text-primary font-semibold': b === current }"
        :disabled="switching === b"
        @click="checkout(b)"
      >
        <GitBranch class="h-3 w-3 flex-shrink-0" />
        <span class="flex-1">{{ b }}</span>
        <span v-if="b === current" class="text-[10px] px-1.5 py-px rounded-full bg-primary/25 text-primary font-bold">{{ t('modals.branch.current') }}</span>
        <Loader2 v-if="switching === b" class="h-3.5 w-3.5 animate-spin" />
      </button>
      <div v-if="filtered.length === 0" class="text-muted-foreground text-center py-3 text-sm">{{ t('modals.branch.noneFound') }}</div>
    </div>

    <template #footer>
      <Button variant="outline" size="sm" @click="showCreate = !showCreate">
        <Plus class="h-3.5 w-3.5" />
        {{ t('modals.branch.newBranch') }}
      </Button>
      <Button variant="outline" size="sm" @click="open = false">{{ t('common.close') }}</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGitStore } from '@/stores/git'
import { GitBranch, Search, Plus, Loader2 } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean; repoPath: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; switched: [] }>()

const { t } = useI18n()
const gitStore = useGitStore()
const open = ref(props.modelValue)
const search = ref('')
const showCreate = ref(false)
const newBranch = ref('')
const newBranchRef = ref<any>(null)
const switching = ref<string | null>(null)
const creating = ref(false)

watch(() => props.modelValue, (v) => { open.value = v })
watch(open, (v) => emit('update:modelValue', v))
watch(showCreate, async (v) => {
  if (v) {
    newBranch.value = ''
    await nextTick()
    const el = (newBranchRef.value as any)?.$el ?? newBranchRef.value
    el?.querySelector?.('input')?.focus()
  }
})

const state = computed(() => gitStore.repos[props.repoPath])
const current = computed(() => state.value?.branches?.current ?? '')
const all = computed(() => state.value?.branches?.all ?? [])
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return all.value.filter((b) => !q || b.toLowerCase().includes(q))
})

async function checkout(branch: string) {
  if (branch === current.value) return
  switching.value = branch
  try {
    await gitStore.checkout(props.repoPath, branch)
    emit('switched')
  } finally {
    switching.value = null
  }
}

async function createBranch() {
  if (!newBranch.value.trim()) return
  creating.value = true
  try {
    await window.electron.git.checkout(props.repoPath, `-b ${newBranch.value.trim()}` as any)
    await gitStore.refresh(props.repoPath)
    showCreate.value = false
    emit('switched')
  } catch {
    await gitStore.refresh(props.repoPath)
  } finally {
    creating.value = false
  }
}
</script>
