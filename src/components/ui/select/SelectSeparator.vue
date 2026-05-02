<script setup lang="ts">
import { SelectSeparator, type SelectSeparatorProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'
const props = defineProps<SelectSeparatorProps & { class?: string }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined }))
</script>
<template>
  <SelectSeparator v-bind="forwarded" :class="cn('-mx-1 my-1 h-px bg-muted', $props.class)" />
</template>
