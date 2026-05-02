<script setup lang="ts">
import { SelectLabel, type SelectLabelProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'
const props = defineProps<SelectLabelProps & { class?: string }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined }))
</script>
<template>
  <SelectLabel v-bind="forwarded" :class="cn('px-2 py-1.5 text-sm font-semibold', $props.class)">
    <slot />
  </SelectLabel>
</template>
