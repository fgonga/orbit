<template>
  <Modal v-model="open" :title="t('modals.commitLog.title', { repo: repoLabel })" width="640px">
    <template #icon>
      <GitCommit class="h-4 w-4 text-primary" />
    </template>

    <div v-if="loading" class="flex items-center justify-center gap-2 py-4 text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" /> {{ t('common.loading') }}
    </div>
    <div v-else-if="!commits.length" class="text-center py-4 text-muted-foreground">{{ t('modals.commitLog.empty') }}</div>
    <div v-else class="flex flex-col">
      <div v-for="c in commits" :key="c.hash" class="flex gap-3 items-start py-2.5 border-b last:border-b-0">
        <code class="text-[11px] px-1.5 py-0.5 rounded font-mono bg-primary/15 text-primary flex-shrink-0 mt-px">{{ c.hash }}</code>
        <div class="flex-1 overflow-hidden">
          <div class="text-[13px] leading-snug">{{ c.message }}</div>
          <div class="text-[11px] text-muted-foreground mt-0.5">{{ c.author }} · {{ formatDate(c.date) }}</div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { GitCommit, Loader2 } from 'lucide-vue-next'
import type { GitCommit as Commit } from '@/env'

const props = defineProps<{ modelValue: boolean; repoPath: string; repoLabel: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const { t, locale } = useI18n()
const open = ref(props.modelValue)
const loading = ref(false)
const commits = ref<Commit[]>([])

watch(() => props.modelValue, (v) => { open.value = v; if (v) load() })
watch(open, (v) => emit('update:modelValue', v))

async function load() {
  loading.value = true
  commits.value = await window.electron.git.log(props.repoPath, 60)
  loading.value = false
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(locale.value, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>
