<script setup lang="ts">
import { AvatarFallback, type AvatarFallbackProps, useForwardProps } from 'radix-vue'
import { cn } from '@/lib/utils'
const props = defineProps<AvatarFallbackProps & { class?: string }>()
const forwarded = useForwardProps(() => ({ ...props, class: undefined }))
</script>
<template>
  <AvatarFallback v-bind="forwarded" :class="cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-xs', $props.class)">
    <slot />
  </AvatarFallback>
</template>
