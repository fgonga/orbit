<script setup lang="ts">
import { DropdownMenuLabel, type DropdownMenuLabelProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuLabelProps & { class?: string; inset?: boolean }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined, inset: undefined }))
</script>

<template>
  <DropdownMenuLabel v-bind="forwarded" :class="cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', $props.class)">
    <slot />
  </DropdownMenuLabel>
</template>
