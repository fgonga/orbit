<template>
  <div class="w-[52px] flex-shrink-0 bg-card border-r flex flex-col justify-between py-2.5" style="-webkit-app-region: no-drag">
    <div class="flex flex-col items-center gap-1">
      <button
        v-for="item in items" :key="item.id"
        class="group relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        :class="{ 'bg-primary/20 !text-primary': modelValue === item.id }"
        :title="t(item.labelKey)"
        @click="$emit('update:modelValue', item.id)"
      >
        <component :is="item.icon" class="h-5 w-5" :stroke-width="1.6" />
        <span class="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-popover text-popover-foreground border text-[11px] font-semibold whitespace-nowrap py-1 px-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
          {{ t(item.labelKey) }}
        </span>
      </button>
    </div>

    <div class="flex flex-col items-center gap-1">
      <button
        class="group relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        :title="t('activityBar.settings')"
        @click="$emit('settings')"
      >
        <Settings class="h-5 w-5" :stroke-width="1.6" />
        <span class="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-popover text-popover-foreground border text-[11px] font-semibold whitespace-nowrap py-1 px-2 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
          {{ t('activityBar.settings') }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LayoutGrid, Inbox, StickyNote, Settings } from 'lucide-vue-next'

const { t } = useI18n()

defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [string]; settings: [] }>()

const items = [
  { id: 'repos',  labelKey: 'activityBar.repos',  icon: LayoutGrid },
  { id: 'issues', labelKey: 'activityBar.issues', icon: Inbox      },
  { id: 'notes',  labelKey: 'activityBar.notes',  icon: StickyNote },
]
</script>
