<script setup lang="ts">
import { ScrollAreaCorner, ScrollAreaRoot, type ScrollAreaRootProps, ScrollAreaViewport } from 'radix-vue'
import ScrollBar from './ScrollBar.vue'
import { cn } from '@/lib/utils'

const props = defineProps<ScrollAreaRootProps & { class?: string }>()
</script>

<template>
  <ScrollAreaRoot v-bind="props" :class="cn('relative overflow-hidden', $props.class)">
    <ScrollAreaViewport class="h-full w-full rounded-[inherit]">
      <slot />
    </ScrollAreaViewport>
    <ScrollBar />
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>
