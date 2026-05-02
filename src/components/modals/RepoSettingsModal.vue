<template>
  <Modal v-model="open" :title="t('modals.repoSettings.title')" width="440px">
    <template #icon>
      <Settings class="h-4 w-4 text-warning" />
    </template>

    <div class="flex flex-col gap-3">
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{{ t('modals.repoSettings.displayName') }}</label>
        <Input v-model="label" :placeholder="t('modals.repoSettings.displayNamePlaceholder')" />
      </div>
      <div>
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{{ t('modals.repoSettings.path') }}</label>
        <div class="flex gap-2">
          <Input v-model="path" class="flex-1" :placeholder="t('modals.repoSettings.pathPlaceholder')" />
          <Button variant="outline" size="icon" @click="browsePath">…</Button>
        </div>
      </div>

      <Separator />

      <div class="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
        <div class="text-[11px] font-bold uppercase tracking-wider text-destructive mb-2">{{ t('modals.repoSettings.dangerZone') }}</div>
        <Button variant="outline" size="sm" class="text-destructive border-destructive/40 hover:bg-destructive/15" @click="confirmRemove">
          <Trash2 class="h-3.5 w-3.5" />
          {{ t('modals.repoSettings.removeFromProject') }}
        </Button>
        <p class="text-[11px] text-muted-foreground mt-2 mb-0">{{ t('modals.repoSettings.removeHint') }}</p>
      </div>
    </div>

    <template #footer>
      <Button variant="outline" size="sm" @click="open = false">{{ t('common.cancel') }}</Button>
      <Button size="sm" @click="save">{{ t('common.save') }}</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useProjectStore } from '@/stores/project'
import { Settings, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  groupId: string
  repoId: string
  repoLabel: string
  repoPath: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  removed: []
}>()

const { t } = useI18n()
const projectStore = useProjectStore()
const open = ref(props.modelValue)
const label = ref(props.repoLabel)
const path = ref(props.repoPath)

watch(() => props.modelValue, (v) => {
  open.value = v
  if (v) { label.value = props.repoLabel; path.value = props.repoPath }
})
watch(open, (v) => emit('update:modelValue', v))

async function browsePath() {
  const p = await window.electron.dialog.openDirectory()
  if (p) path.value = p
}

function save() {
  if (label.value.trim() && label.value !== props.repoLabel)
    projectStore.renameRepo(props.groupId, props.repoId, label.value.trim())
  open.value = false
}

function confirmRemove() {
  if (confirm(t('modals.repoSettings.confirmRemove', { name: props.repoLabel }))) {
    projectStore.removeRepo(props.groupId, props.repoId)
    emit('removed')
    open.value = false
  }
}
</script>
