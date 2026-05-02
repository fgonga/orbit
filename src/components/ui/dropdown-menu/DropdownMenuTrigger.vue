<script setup lang="ts">
import { DropdownMenuTrigger, type DropdownMenuTriggerProps, useForwardProps } from 'radix-vue'
const props = defineProps<DropdownMenuTriggerProps & { class?: string }>()
</script>
<template>
  <DropdownMenuTrigger v-bind="useForwardProps(() => ({ ...props, class: undefined }))" :class="$props.class">
    <slot />
  </DropdownMenuTrigger>
</template>
