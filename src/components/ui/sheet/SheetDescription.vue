<script setup lang="ts">
import { DialogDescription, type DialogDescriptionProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'
const props = defineProps<DialogDescriptionProps & { class?: string }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined }))
</script>
<template>
  <DialogDescription v-bind="forwarded" :class="cn('text-muted-foreground text-sm', $props.class)">
    <slot />
  </DialogDescription>
</template>
