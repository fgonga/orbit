<script setup lang="ts">
import { TabsList, type TabsListProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<TabsListProps & { class?: string }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined }))
</script>

<template>
  <TabsList v-bind="forwarded" :class="cn('inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', $props.class)">
    <slot />
  </TabsList>
</template>
