<template>
  <Modal
    :model-value="modelValue"
    :title="t('localIssues.newIssue')"
    width="520px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #icon><CircleDot class="h-4 w-4 text-muted-foreground" /></template>

    <div class="flex flex-col gap-4">
      <!-- Title -->
      <div>
        <label class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {{ t('localIssues.titlePlaceholder') }} *
        </label>
        <input
          ref="titleRef"
          v-model="form.title"
          class="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
          :placeholder="t('localIssues.titlePlaceholder')"
          @keydown.enter="submit"
          @keydown.esc="$emit('update:modelValue', false)"
        />
      </div>

      <!-- Priority -->
      <div>
        <label class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {{ t('localIssues.priority') }}
        </label>
        <div class="flex gap-1.5">
          <button
            v-for="p in priorities" :key="p.value"
            class="px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors"
            :class="form.priority === p.value ? p.activeClass : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/40'"
            @click="form.priority = p.value"
          >{{ p.label }}</button>
        </div>
      </div>

      <!-- Body -->
      <div>
        <label class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {{ t('localIssues.description') }}
        </label>
        <textarea
          v-model="form.body"
          class="w-full bg-muted/30 rounded-md px-3 py-2 text-sm border border-transparent focus:border-primary/50 outline-none resize-none min-h-[100px] font-mono leading-relaxed"
          :placeholder="t('localIssues.bodyPlaceholder')"
        />
      </div>
    </div>

    <template #footer>
      <Button variant="outline" @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</Button>
      <Button :disabled="!form.title.trim() || saving" @click="submit">
        <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
        {{ t('common.create') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocalIssuesStore } from '@/stores/localIssues'
import Modal from '@/components/Modal.vue'
import { Button } from '@/components/ui/button'
import { CircleDot, Loader2 } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean] }>()

const { t } = useI18n()
const localStore = useLocalIssuesStore()
const titleRef   = ref<HTMLInputElement | null>(null)
const saving     = ref(false)

const form = reactive({
  title: '',
  body: '',
  priority: 'none' as 'none' | 'low' | 'medium' | 'high',
})

const priorities = computed(() => [
  { value: 'none',   label: t('localIssues.priorityNone'),   activeClass: 'bg-muted text-muted-foreground border-border' },
  { value: 'low',    label: t('localIssues.priorityLow'),    activeClass: 'bg-info/20 text-info border-info/40' },
  { value: 'medium', label: t('localIssues.priorityMedium'), activeClass: 'bg-warning/20 text-warning border-warning/40' },
  { value: 'high',   label: t('localIssues.priorityHigh'),   activeClass: 'bg-destructive/20 text-destructive border-destructive/40' },
])

watch(() => props.modelValue, (v) => {
  if (v) {
    form.title = ''; form.body = ''; form.priority = 'none'
    nextTick(() => titleRef.value?.focus())
  }
})

async function submit() {
  if (!form.title.trim()) return
  saving.value = true
  try {
    await localStore.createIssue({ title: form.title.trim(), body: form.body, priority: form.priority })
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>
