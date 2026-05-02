<template>
  <Modal v-model="open" :title="t('conflicts.confirmRemoveTitle')" width="92vw" :persistent="true">
    <template #icon>
      <AlertCircle class="h-4 w-4 text-destructive" />
    </template>

    <div class="h-[68vh] overflow-hidden">
      <ConflictResolver :repo-path="repoPath" @done="onDone" />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import ConflictResolver from '@/components/ConflictResolver.vue'
import { AlertCircle } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean; repoPath: string }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean]; done: [] }>()

const { t } = useI18n()
const open = ref(props.modelValue)
watch(() => props.modelValue, (v) => { open.value = v })
watch(open, (v) => emit('update:modelValue', v))

function onDone() {
  open.value = false
  emit('done')
}
</script>
