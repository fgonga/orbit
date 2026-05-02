<script setup lang="ts">
import { DropdownMenuItem, type DropdownMenuItemProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<DropdownMenuItemProps & { class?: string; inset?: boolean }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined, inset: undefined }))
</script>

<template>
  <DropdownMenuItem v-bind="forwarded" :class="cn('relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0', inset && 'pl-8', $props.class)">
    <slot />
  </DropdownMenuItem>
</template>
