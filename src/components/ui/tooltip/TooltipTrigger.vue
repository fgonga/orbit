<script setup lang="ts">
import { TooltipTrigger, type TooltipTriggerProps, useForwardProps } from 'radix-vue'
const props = defineProps<TooltipTriggerProps>()
const forwarded = useForwardProps(props)
</script>
<template>
  <TooltipTrigger v-bind="forwarded">
    <slot />
  </TooltipTrigger>
</template>
