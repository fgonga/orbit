<template>
  <div
    class="group relative flex flex-col gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/60"
    :class="active ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]' : 'border-border'"
    @click="$emit('select')"
  >
    <!-- Mini preview -->
    <div
      class="h-20 rounded-md border overflow-hidden flex flex-col"
      :style="{ background: theme.swatch[0] }"
    >
      <div
        class="h-4 flex items-center gap-0.5 px-1.5 flex-shrink-0 border-b"
        :style="{ background: theme.swatch[2], borderColor: theme.swatch[2] }"
      >
        <div class="w-1 h-1 rounded-full" :style="{ background: theme.swatch[1] }" />
        <div class="w-6 h-1 rounded-sm opacity-50" :style="brighten(theme.swatch[2])" />
      </div>
      <div class="flex flex-1 overflow-hidden">
        <div class="w-6 flex flex-col gap-0.5 p-0.5" :style="{ background: theme.swatch[2] }">
          <div class="h-1 rounded-sm opacity-80" :style="{ background: theme.swatch[1] }" />
          <div class="h-1 rounded-sm opacity-40" :style="brighten(theme.swatch[2])" />
          <div class="h-1 rounded-sm opacity-40" :style="brighten(theme.swatch[2])" />
        </div>
        <div class="flex-1 p-1 flex flex-col gap-0.5">
          <div class="h-1.5 rounded-sm opacity-30" :style="brighten(theme.swatch[2])" />
          <div class="h-1.5 rounded-sm opacity-30 w-2/3" :style="brighten(theme.swatch[2])" />
          <div class="mt-auto flex gap-0.5">
            <div class="w-3 h-1.5 rounded-sm" :style="{ background: theme.swatch[1] }" />
            <div class="w-2 h-1.5 rounded-sm opacity-40" :style="brighten(theme.swatch[2])" />
          </div>
        </div>
      </div>
    </div>

    <!-- Label row -->
    <div class="flex items-center gap-1.5">
      <span class="text-xs font-semibold truncate">{{ theme.name }}</span>
      <span class="text-[10px] text-muted-foreground uppercase tracking-wider">{{ theme.mode }}</span>
      <Check v-if="active" class="h-3 w-3 text-primary ml-auto flex-shrink-0" :stroke-width="3" />
    </div>

    <!-- Action buttons (export / delete) — visible on hover -->
    <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        class="w-6 h-6 rounded-md bg-background/80 backdrop-blur border text-muted-foreground hover:text-foreground hover:bg-background flex items-center justify-center"
        :title="$t('theme.exportTitle')"
        @click.stop="$emit('export')"
      >
        <Download class="h-3 w-3" />
      </button>
      <button
        v-if="deletable"
        class="w-6 h-6 rounded-md bg-background/80 backdrop-blur border text-destructive hover:bg-destructive/15 flex items-center justify-center"
        :title="$t('theme.removeTitle')"
        @click.stop="$emit('delete')"
      >
        <Trash2 class="h-3 w-3" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Theme } from '@/lib/themes'
import { Check, Download, Trash2 } from 'lucide-vue-next'

defineProps<{
  theme: Theme
  active?: boolean
  deletable?: boolean
}>()

defineEmits<{ select: []; delete: []; export: [] }>()

function brighten(color: string) {
  return { background: color, filter: 'brightness(1.8)' }
}
</script>
