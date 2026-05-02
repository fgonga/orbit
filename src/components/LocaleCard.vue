<template>
  <div
    class="group relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/60"
    :class="active ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]' : 'border-border'"
    @click="$emit('select')"
  >
    <div class="text-2xl flex-shrink-0">{{ locale.flag }}</div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <span class="text-sm font-semibold truncate">{{ locale.nativeName }}</span>
        <Check v-if="active" class="h-3 w-3 text-primary flex-shrink-0" :stroke-width="3" />
      </div>
      <div class="text-[11px] text-muted-foreground truncate">{{ locale.name }} · {{ locale.locale }}</div>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      <button
        class="w-6 h-6 rounded-md bg-background/80 backdrop-blur border text-muted-foreground hover:text-foreground hover:bg-background flex items-center justify-center"
        :title="$t('modals.settings.exportJsonTitle')"
        @click.stop="$emit('export')"
      >
        <Download class="h-3 w-3" />
      </button>
      <button
        v-if="deletable"
        class="w-6 h-6 rounded-md bg-background/80 backdrop-blur border text-destructive hover:bg-destructive/15 flex items-center justify-center"
        :title="$t('common.delete')"
        @click.stop="$emit('delete')"
      >
        <Trash2 class="h-3 w-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Locale } from '@/lib/locales'
import { Check, Download, Trash2 } from 'lucide-vue-next'

defineProps<{
  locale: Locale
  active?: boolean
  deletable?: boolean
}>()

defineEmits<{ select: []; delete: []; export: [] }>()
</script>
