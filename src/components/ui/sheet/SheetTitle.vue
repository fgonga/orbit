<script setup lang="ts">
import { DialogTitle, type DialogTitleProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'
const props = defineProps<DialogTitleProps & { class?: string }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined }))
</script>
<template>
  <DialogTitle v-bind="forwarded" :class="cn('text-foreground font-semibold', $props.class)">
    <slot />
  </DialogTitle>
</template>
