<script setup lang="ts">
import { Separator, type SeparatorProps } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<SeparatorProps & { class?: string }>(), {
  orientation: 'horizontal',
  decorative: true,
})
</script>

<template>
  <Separator
    :orientation="props.orientation"
    :decorative="props.decorative"
    :class="cn('shrink-0 bg-border', props.orientation === 'vertical' ? 'h-full w-[1px]' : 'h-[1px] w-full', $props.class)"
  />
</template>
